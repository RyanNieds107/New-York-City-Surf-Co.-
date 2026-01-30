import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";

// SHA-256 hash using Web Crypto API (works in Node.js 16+ and all modern runtimes)
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
import {
  getAllSpots,
  getSpotById,
  createSpot,
  getLatestForecastForSpot,
  getAllLatestForecasts,
  insertForecast,
  getRecentCrowdReports,
  getAverageCrowdLevel,
  insertCrowdReport,
  getForecastTimeline,
  getAllSwellAlertsForUser,
  getSwellAlertById,
  createSwellAlert,
  updateSwellAlert,
  deleteSwellAlert,
  checkIfAlertAlreadySent,
  logSwellAlertSent,
  updateSwellAlertLogEmailSent,
  getAllActiveSwellAlerts,
  getAllSwellAlertsWithUsers,
  getActiveAlertUserCount,
  getStormglassVerification,
  getLatestStormglassFetchTime,
} from "./db";
import { getCurrentTideInfo } from "./services/tides";
import { getCurrentConditionsFromOpenMeteo } from "./services/openMeteo";
import { generateForecast, generateForecastTimeline } from "./services/forecast";
import { makeRequest, type DistanceMatrixResult, type TravelMode } from "./_core/map";
import { getSpotProfile, getSpotKey, SPOT_PROFILES } from "./utils/spotProfiles";
import { getDominantSwell, calculateBreakingWaveHeight, formatWaveHeight, calculateSwellEnergy } from "./utils/waveHeight";
import { generateForecastOutput } from "./utils/forecastOutput";
import { forecastPoints, conditionsLog, users, verificationTokens, type User } from "../drizzle/schema";
import { eq, desc, and, gt } from "drizzle-orm";
import { randomBytes } from "crypto";
import { getDb } from "./db";
import { fetchBuoy44065Cached, clearBuoyCache } from "./services/buoy44065";
import { addConfidenceToTimeline, getConfidenceSummary, getConfidenceBadgeText, type ConfidenceLevel } from "./utils/forecastConfidence";
import { adminProcedure } from "./_core/trpc";
import { sendBatchEmails, sendEmail } from "./services/email";
import { sendSMS } from "./services/sms";
import { formatSwellAlertNotification } from "./services/notificationFormatter";

// In-memory cache for distance results (keyed by rounded origin + mode)
const distanceCache = new Map<string, {
  timestamp: number;
  data: Record<string, {
    distanceMiles: number;
    durationMinutes: number;
    durationText: string;
    distanceText: string;
  } | null>;
}>();

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    signUp: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(128),
          email: z.string().email(),
          phone: z.string().min(10).max(20).optional(),
          smsOptIn: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { upsertUser, getUserByOpenId } = await import("./db");
        const { signCustomSessionToken } = await import("./_core/jwt");
        const { COOKIE_NAME, ONE_YEAR_MS } = await import("@shared/const");
        const { getSessionCookieOptions } = await import("./_core/cookies");

        // Generate a custom openId for email-based sign-ups
        // Use a hash of email to create unique identifier
        const openIdHash = (await sha256(input.email.toLowerCase())).substring(0, 32);
        const customOpenId = `email:${openIdHash}`;

        // Check if user already exists
        const existingUser = await getUserByOpenId(customOpenId);
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this email already exists",
          });
        }

        // Convert smsOptIn boolean to int (1 or 0)
        const smsOptInInt = input.smsOptIn === true ? 1 : 0;

        // Create user
        await upsertUser({
          openId: customOpenId,
          name: input.name,
          email: input.email.toLowerCase(),
          phone: input.phone || null,
          smsOptIn: smsOptInInt,
          loginMethod: "email",
          lastSignedIn: new Date(),
        });

        // Create custom session token (independent of Manus SDK)
        const sessionToken = await signCustomSessionToken(
          customOpenId,
          input.name,
          ONE_YEAR_MS
        );

        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true };
    }),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          phone: z.string().min(10).max(20),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getUserByOpenId } = await import("./db");
        const { signCustomSessionToken } = await import("./_core/jwt");
        const { COOKIE_NAME, ONE_YEAR_MS } = await import("@shared/const");
        const { getSessionCookieOptions } = await import("./_core/cookies");

        // Generate openId hash from email (same logic as sign-up)
        const openIdHash = (await sha256(input.email.toLowerCase())).substring(0, 32);
        const customOpenId = `email:${openIdHash}`;

        // Check if user exists
        const user = await getUserByOpenId(customOpenId);
        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "No account found with this email",
          });
        }

        // Verify phone matches (remove non-digits for comparison)
        // Note: OAuth users might not have phone numbers, so if user has no phone, require phone match
        const inputPhoneDigits = input.phone.replace(/\D/g, "");
        const userPhoneDigits = user.phone?.replace(/\D/g, "") || "";
        
        // If user has a phone number, verify it matches
        if (user.phone) {
          if (inputPhoneDigits !== userPhoneDigits) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Phone number does not match this account",
            });
          }
        } else {
          // User doesn't have a phone (likely OAuth user)
          // For security, we can't let them login with email/phone if they don't have phone set
          // They should use OAuth login instead
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "This account was created with OAuth. Please sign in with OAuth instead.",
          });
        }

        // Create session token
        const sessionToken = await signCustomSessionToken(
          customOpenId,
          user.name || "",
          ONE_YEAR_MS
        );

        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true };
    }),

    // ==================== MAGIC LINK AUTHENTICATION ====================
    sendMagicLink: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }
        const { sendMagicLinkEmail } = await import("./services/email");

        const email = input.email.toLowerCase().trim();

        // Generate secure token (64 character hex string)
        const token = randomBytes(32).toString("hex");
        
        // Token expires in 24 hours
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Delete any existing tokens for this email
        await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email));

        // Store the new token
        await db.insert(verificationTokens).values({
          identifier: email,
          token,
          expires,
        });

        // Build the magic link URL
        const baseUrl = process.env.BASE_URL || process.env.PUBLIC_URL || "https://www.nycsurfco.com";
        const magicLinkUrl = `${baseUrl}/auth/verify?token=${token}`;

        // Send the email
        const emailSent = await sendMagicLinkEmail({
          to: email,
          magicLinkUrl,
        });

        if (!emailSent) {
          console.warn(`[Magic Link] Failed to send email to ${email}`);
          // Don't reveal if email failed - just say we sent it
        }

        console.log(`[Magic Link] Token generated for ${email}, expires at ${expires.toISOString()}`);

        return { success: true };
      }),

    verifyMagicLink: publicProcedure
      .input(
        z.object({
          token: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }
        const { upsertUser, getUserByEmail } = await import("./db");
        const { signCustomSessionToken } = await import("./_core/jwt");
        const { COOKIE_NAME, ONE_YEAR_MS } = await import("@shared/const");
        const { getSessionCookieOptions } = await import("./_core/cookies");

        // Find the token in the database
        const tokenRecords = await db
          .select()
          .from(verificationTokens)
          .where(
            and(
              eq(verificationTokens.token, input.token),
              gt(verificationTokens.expires, new Date())
            )
          )
          .limit(1);

        const tokenRecord = tokenRecords[0];

        if (!tokenRecord) {
          // Check if token exists but is expired vs doesn't exist at all
          const expiredToken = await db
            .select()
            .from(verificationTokens)
            .where(eq(verificationTokens.token, input.token))
            .limit(1);
          
          if (expiredToken.length > 0) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "This magic link has expired. Please request a new one.",
            });
          }
          
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid or expired magic link. This link may have already been used. Please request a new one.",
          });
        }

        const email = tokenRecord.identifier;

        // Generate openId hash from email (same logic as other auth flows)
        const openIdHash = (await sha256(email)).substring(0, 32);
        const customOpenId = `email:${openIdHash}`;

        // Check if user exists, if not create them
        let existingUser = await getUserByEmail(email);

        try {
          if (!existingUser) {
            // Create new user
            await upsertUser({
              openId: customOpenId,
              name: email.split("@")[0], // Use part before @ as default name
              email: email,
              phone: null,
              smsOptIn: 0,
              loginMethod: "magic_link",
              lastSignedIn: new Date(),
            });
            existingUser = await getUserByEmail(email);
          } else {
            // Update last signed in
            await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.email, email));
          }

          // Create session token (30-day sessions as requested)
          const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
          const sessionToken = await signCustomSessionToken(
            customOpenId,
            existingUser?.name || email.split("@")[0],
            THIRTY_DAYS_MS
          );

          // Set cookie
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: THIRTY_DAYS_MS });

          // Delete the used token (single-use) - ONLY after successful verification
          await db.delete(verificationTokens).where(eq(verificationTokens.token, input.token));

          console.log(`[Magic Link] Successfully verified and logged in user: ${email}`);

          return { success: true, email };
        } catch (error) {
          // If anything fails after finding the token, log it but don't delete the token yet
          // This way user can retry if there's a transient error
          console.error(`[Magic Link] Error during verification for ${email}:`, error);
          throw error;
        }
      }),
  }),

  // ==================== SPOTS ROUTER ====================
  spots: router({
    list: publicProcedure.query(async () => {
      return getAllSpots();
    }),

    get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return getSpotById(input.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(128),
          latitude: z.string(),
          longitude: z.string(),
          buoyId: z.string(),
          tideStationId: z.string(),
          bathymetryFactor: z.number().min(1).max(10).default(5),
          idealSwellDirMin: z.number().min(0).max(360).default(90),
          idealSwellDirMax: z.number().min(0).max(360).default(180),
        })
      )
      .mutation(async ({ input }) => {
        await createSpot(input);
        return { success: true };
      }),

    // Seed initial spots (one-time setup endpoint)
    seed: publicProcedure.mutation(async () => {
      const existingSpots = await getAllSpots();
      if (existingSpots.length > 0) {
        return { success: true, message: "Spots already exist", count: existingSpots.length };
      }

      const spots = [
        { name: "Lido Beach", latitude: "40.5892", longitude: "-73.6265", buoyId: "44065", tideStationId: "8518750" },
        { name: "Rockaway Beach", latitude: "40.5830", longitude: "-73.8160", buoyId: "44065", tideStationId: "8518750" },
        { name: "Long Beach", latitude: "40.5880", longitude: "-73.6580", buoyId: "44065", tideStationId: "8518750" },
      ];

      for (const spot of spots) {
        await createSpot(spot);
      }

      return { success: true, message: "Seeded 3 spots", count: 3 };
    }),
  }),

  // ==================== FORECASTS ROUTER ====================
  forecasts: router({
    // Get the latest forecast for a specific spot
    getForSpot: publicProcedure.input(z.object({ spotId: z.number() })).query(async ({ input }) => {
      const forecast = await getLatestForecastForSpot(input.spotId);
      const spot = await getSpotById(input.spotId);
      
      // Get current conditions from Open-Meteo for period and direction data
      let openMeteoPoint = null;
      if (spot) {
        openMeteoPoint = await getCurrentConditionsFromOpenMeteo(spot);
      }
      
      return { forecast, spot, openMeteoPoint };
    }),

    // Get all latest forecasts (one per spot)
    listAll: publicProcedure.query(async () => {
      const [forecasts, spots] = await Promise.all([getAllLatestForecasts(), getAllSpots()]);

      // Join forecasts with spots
      return forecasts.map((f) => ({
        ...f,
        spot: spots.find((s) => s.id === f.spotId),
      }));
    }),

    // Get current conditions for all spots using timeline data (fresh, calculated)
    // Uses NOAA buoy wind for current quality score, Open-Meteo for forecast
    getCurrentConditionsForAll: publicProcedure.query(async () => {
      const spots = await getAllSpots();
      const { getForecastTimeline, isForecastDataStale, getAverageCrowdLevel } = await import("./db");
      const { generateForecastTimeline } = await import("./services/forecast");
      const { fetchBuoy44065Cached } = await import("./services/buoy44065");
      const { calculateQualityScoreWithProfile } = await import("./utils/qualityRating");
      const { getSpotProfile, getSpotKey } = await import("./utils/spotProfiles");

      // Fetch buoy data once for all spots (they share the same buoy)
      const buoyData = await fetchBuoy44065Cached();
      
      // Helper function to select current timeline point (same logic as frontend)
      const selectCurrentTimelinePoint = <T extends { forecastTimestamp: Date | string }>(
        timeline: T[] | undefined | null,
        now: number = Date.now()
      ): T | undefined => {
        if (!timeline || timeline.length === 0) return undefined;
        const CURRENT_CONDITIONS_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
        const cutoffTime = now - CURRENT_CONDITIONS_MAX_AGE_MS;

        // Filter to only recent PAST points (within max age threshold, but not future forecasts)
        // CRITICAL: Current conditions should reflect what IS happening, not what WILL happen
        const validPoints = timeline.filter((point) => {
          const pointTime = new Date(point.forecastTimestamp).getTime();
          return pointTime >= cutoffTime && pointTime <= now; // Only past points, exclude future
        });

        if (validPoints.length === 0) return undefined;

        // Find the most recent point (closest to now, but not exceeding it)
        let nearestPoint = validPoints[0];
        let nearestPointTime = new Date(nearestPoint.forecastTimestamp).getTime();
        let nearestDiff = now - nearestPointTime; // Time difference (always positive since pointTime <= now)

        for (const point of validPoints) {
          const pointTime = new Date(point.forecastTimestamp).getTime();
          const diff = now - pointTime; // Time difference (always positive)
          if (diff < nearestDiff) {
            nearestDiff = diff;
            nearestPoint = point;
          }
        }

        return nearestPoint;
      };
      
      const results = await Promise.all(
        spots.map(async (spot) => {
          try {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routers.ts:311',message:'getCurrentConditionsForAll starting for spot',data:{spotId:spot.id,spotName:spot.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
            // Check if data is stale or missing
            const isStale = await isForecastDataStale(spot.id, 0.5); // 30 minutes stale threshold
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routers.ts:313',message:'Checking forecast data staleness',data:{spotId:spot.id,isStale},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
            let forecastPoints = await getForecastTimeline(spot.id, 3); // Only need 3 hours for current conditions
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routers.ts:314',message:'getForecastTimeline completed',data:{spotId:spot.id,pointCount:forecastPoints.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion

            // If data is stale or missing, fetch fresh data from Open-Meteo
            if (isStale || forecastPoints.length === 0) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routers.ts:317',message:'Data is stale or missing, fetching fresh',data:{spotId:spot.id,isStale,pointCount:forecastPoints.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
              
              const { fetchOpenMeteoForecastForSpot, convertToDbFormat } = await import("./services/openMeteo");
              const { insertForecastPoints } = await import("./db");

              try {
                // IMPORTANT: Fetch 168 hours (7 days) to match getTimeline behavior
                // Previously was fetching 3 hours, which would delete full forecast data
                const fetchedPoints = await fetchOpenMeteoForecastForSpot(spot, { maxHoursOut: 168 });
                
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routers.ts:324',message:'Fetched points from Open-Meteo',data:{spotId:spot.id,fetchedCount:fetchedPoints.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                
                const dbPoints = fetchedPoints.map((point) => convertToDbFormat(point, spot.id));

                // Store in database (auto-cleanup happens inside insertForecastPoints)
                await insertForecastPoints(dbPoints);
                
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routers.ts:328',message:'Inserted points into database',data:{spotId:spot.id,insertedCount:dbPoints.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion

                // Re-fetch from database after insert
                forecastPoints = await getForecastTimeline(spot.id, 3);
                
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routers.ts:331',message:'Re-fetched points after insert',data:{spotId:spot.id,refetchedCount:forecastPoints.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
              } catch (error) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routers.ts:332',message:'Failed to fetch fresh data',data:{spotId:spot.id,errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                
                // If fetch fails, continue with existing data or empty
                console.warn(`Failed to fetch fresh data for spot ${spot.id}:`, error);
              }
            }

            // Get average crowd level
            const avgCrowdLevel = await getAverageCrowdLevel(spot.id);

            // Generate timeline with quality scores
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routers.ts:341',message:'Generating forecast timeline',data:{spotId:spot.id,forecastPointCount:forecastPoints.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            
            const timeline = await generateForecastTimeline({
              forecastPoints,
              spot,
              tideStationId: spot.tideStationId,
              avgCrowdLevel,
            });
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routers.ts:347',message:'Timeline generated',data:{spotId:spot.id,timelineLength:timeline.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion

            // Get current conditions point (nearest to now)
            const currentPoint = selectCurrentTimelinePoint(timeline);
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routers.ts:349',message:'Selected current timeline point',data:{spotId:spot.id,hasCurrentPoint:!!currentPoint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion

            if (!currentPoint) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routers.ts:352',message:'No current point found, returning null',data:{spotId:spot.id,timelineLength:timeline.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
              // #endregion
              
              return {
                spotId: spot.id,
                spot,
                currentConditions: null,
              };
            }

            // Calculate quality score using NOAA buoy data if available
            let qualityScore = currentPoint.quality_score ?? currentPoint.probabilityScore;
            let windSpeedMph = currentPoint.windSpeedMph;
            let windDirectionDeg = currentPoint.windDirectionDeg;
            let breakingWaveHeightFt = currentPoint.breakingWaveHeightFt;

            // Override with buoy data if available and not stale
            if (buoyData && !buoyData.isStale) {
              // Use buoy wind data
              if (buoyData.windSpeedKts !== null && buoyData.windDirectionDeg !== null) {
                windSpeedMph = Math.round(buoyData.windSpeedKts * 1.15078);
                windDirectionDeg = buoyData.windDirectionDeg;
              }

              // Recalculate quality score with buoy wave and wind data
              const spotKey = getSpotKey(spot.name);
              const profile = spotKey ? getSpotProfile(spotKey) : null;

              if (profile && currentPoint.tideHeightFt !== null && buoyData.waveHeight !== null && buoyData.dominantPeriod !== null) {
                try {
                  // Use buoy wave data (more accurate for current conditions)
                  const buoyWaveHeightFt = buoyData.waveHeight;
                  const buoyPeriodS = buoyData.dominantPeriod;
                  const buoyWaveDirectionDeg = buoyData.waveDirection ?? currentPoint.dominantSwellDirectionDeg;

                  // Create a forecast point structure for quality calculation using buoy data
                  const forecastPointLike = {
                    waveHeightFt: Math.round(buoyWaveHeightFt * 10), // Convert to tenths
                    wavePeriodSec: buoyPeriodS,
                    waveDirectionDeg: buoyWaveDirectionDeg,
                    windSpeedKts: buoyData.windSpeedKts ?? null,
                    windDirectionDeg: buoyData.windDirectionDeg ?? null,
                    secondarySwellHeightFt: null,
                    secondarySwellPeriodS: null,
                    secondarySwellDirectionDeg: null,
                  } as any;

                  const tideFt = currentPoint.tideHeightFt / 10; // Convert from tenths
                  const qualityResult = calculateQualityScoreWithProfile(
                    forecastPointLike,
                    spot.name,
                    tideFt,
                    profile,
                    currentPoint.tidePhase ?? null
                  );
                  qualityScore = qualityResult.score;

                  // Also recalculate breaking height using buoy data
                  breakingWaveHeightFt = calculateBreakingWaveHeight(
                    buoyWaveHeightFt,
                    buoyPeriodS,
                    profile,
                    buoyWaveDirectionDeg,
                    tideFt,
                    currentPoint.tidePhase ?? null
                  );

                  console.log(`[getCurrentConditionsForAll] ${spot.name}: Recalculated with buoy data (wave: ${buoyWaveHeightFt.toFixed(1)}ft @ ${buoyPeriodS}s, wind: ${buoyData.windDirectionDeg}° @ ${buoyData.windSpeedKts?.toFixed(1)}kts) → breaking: ${breakingWaveHeightFt.toFixed(1)}ft, score: ${qualityScore}`);
                } catch (error) {
                  console.warn(`[getCurrentConditionsForAll] Failed to recalculate quality for ${spot.name}:`, error);
                }
              }
            }

            // Return in a format compatible with Dashboard expectations
            return {
              spotId: spot.id,
              spot,
              currentConditions: {
                // Map timeline fields to forecast-like structure for compatibility
                qualityScore,
                probabilityScore: currentPoint.probabilityScore,
                waveHeightTenthsFt: currentPoint.waveHeightFt !== null ? Math.round(currentPoint.waveHeightFt * 10) : 0,
                breakingWaveHeightFt: breakingWaveHeightFt,
                // Dominant swell (highest energy using H² × T formula)
                dominantSwellHeightFt: currentPoint.dominantSwellHeightFt,
                dominantSwellPeriodS: currentPoint.dominantSwellPeriodS,
                dominantSwellDirectionDeg: currentPoint.dominantSwellDirectionDeg,
                dominantSwellType: currentPoint.dominantSwellType,
                confidenceBand: currentPoint.confidenceBand,
                usabilityIntermediate: currentPoint.usabilityIntermediate,
                usabilityAdvanced: currentPoint.usabilityAdvanced,
                windSpeedMph,
                windDirectionDeg,
                windType: currentPoint.windType,
                tideHeightFt: currentPoint.tideHeightFt,
                tidePhase: currentPoint.tidePhase,
                wavePeriodSec: currentPoint.wavePeriodSec,
                createdAt: currentPoint.forecastTimestamp,
              },
            };
          } catch (error) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routers.ts:451',message:'Error in getCurrentConditionsForAll',data:{spotId:spot.id,errorMessage:error instanceof Error ? error.message : String(error),errorStack:error instanceof Error ? error.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
            // #endregion
            
            console.error(`Failed to get current conditions for spot ${spot.id}:`, error);
            return {
              spotId: spot.id,
              spot,
              currentConditions: null,
            };
          }
        })
      );

      return results;
    }),

    // Refresh forecast for a spot (fetches fresh data and generates new forecast)
    refresh: publicProcedure.input(z.object({ spotId: z.number() })).mutation(async ({ input }) => {
      const spot = await getSpotById(input.spotId);
      if (!spot) {
        throw new Error("Spot not found");
      }

      // Fetch current conditions from Open-Meteo
      const openMeteoPoint = await getCurrentConditionsFromOpenMeteo(spot);

      // Get tide info (NOAA Tides & Currents API)
      const tideInfo = await getCurrentTideInfo(spot.tideStationId);

      // Get average crowd level
      const avgCrowdLevel = await getAverageCrowdLevel(spot.id);

      // Generate forecast
      const forecastResult = generateForecast({
        spot,
        openMeteoPoint: openMeteoPoint || null,
        tideInfo,
        avgCrowdLevel,
      });

      // Save forecast
      await insertForecast({
        spotId: spot.id,
        forecastTime: new Date(),
        probabilityScore: forecastResult.probabilityScore,
        qualityScore: forecastResult.qualityScore,
        waveHeightTenthsFt: forecastResult.waveHeightTenthsFt,
        confidenceBand: forecastResult.confidenceBand,
        usabilityIntermediate: forecastResult.usabilityIntermediate,
        usabilityAdvanced: forecastResult.usabilityAdvanced,
        windSpeedMph: forecastResult.windSpeedMph,
        windDirectionDeg: forecastResult.windDirectionDeg,
        windType: forecastResult.windType,
        tideHeightFt: forecastResult.tideHeightFt,
        tidePhase: forecastResult.tidePhase,
      });

      return {
        success: true,
        forecast: forecastResult,
        openMeteoDataFresh: !!openMeteoPoint,
      };
    }),

    // Refresh all spots
    refreshAll: publicProcedure.mutation(async () => {
      const spots = await getAllSpots();
      const results = [];

      for (const spot of spots) {
        try {
          // Fetch current conditions from Open-Meteo
          const openMeteoPoint = await getCurrentConditionsFromOpenMeteo(spot);

          // Get tide info (NOAA Tides & Currents API)
          const tideInfo = await getCurrentTideInfo(spot.tideStationId);

          // Get average crowd level
          const avgCrowdLevel = await getAverageCrowdLevel(spot.id);

          // Generate forecast
          const forecastResult = generateForecast({
            spot,
            openMeteoPoint: openMeteoPoint || null,
            tideInfo,
            avgCrowdLevel,
          });

          // Save forecast
          await insertForecast({
            spotId: spot.id,
            forecastTime: new Date(),
            probabilityScore: forecastResult.probabilityScore,
            qualityScore: forecastResult.qualityScore,
            waveHeightTenthsFt: forecastResult.waveHeightTenthsFt,
            confidenceBand: forecastResult.confidenceBand,
            usabilityIntermediate: forecastResult.usabilityIntermediate,
            usabilityAdvanced: forecastResult.usabilityAdvanced,
            windSpeedMph: forecastResult.windSpeedMph,
            windDirectionDeg: forecastResult.windDirectionDeg,
            windType: forecastResult.windType,
            tideHeightFt: forecastResult.tideHeightFt,
            tidePhase: forecastResult.tidePhase,
          });

          results.push({ spotId: spot.id, success: true });
        } catch (error) {
          console.error(`Failed to refresh forecast for spot ${spot.id}:`, error);
          results.push({ spotId: spot.id, success: false });
        }
      }

      return { results };
    }),

    // Get forecast timeline (multi-day forecast with quality scores)
    getTimeline: publicProcedure
      .input(
        z.object({
          spotId: z.number(),
          hours: z.number().min(1).max(180).default(168),
        })
      )
      .query(async ({ input }) => {
        const spot = await getSpotById(input.spotId);
        if (!spot) {
          throw new Error("Spot not found");
        }

        // Check if data is stale or missing
        const { isForecastDataStale } = await import("./db");
        const isStale = await isForecastDataStale(input.spotId, 0.5); // 30 minutes stale threshold
        let forecastPoints = await getForecastTimeline(input.spotId, input.hours);

        console.log(`[Forecasts Router] Spot ${input.spotId} (${spot.name}): isStale=${isStale}, pointCount=${forecastPoints.length}, hoursRequested=${input.hours}`);

        // If data is stale or missing, fetch fresh data from Open-Meteo
        if (isStale || forecastPoints.length === 0) {
          console.log(`[Forecasts Router] ⚠️ Data for spot ${input.spotId} (${spot.name}) is stale or missing. Fetching fresh data...`);
          const { fetchOpenMeteoForecastForSpot, convertToDbFormat } = await import("./services/openMeteo");
          const { insertForecastPoints } = await import("./db");

          try {
            // Fetch fresh data from Open-Meteo
            console.log(`[Forecasts Router] 🌊 Fetching ${input.hours} hours from Open-Meteo for ${spot.name}...`);
            const fetchedPoints = await fetchOpenMeteoForecastForSpot(spot, { maxHoursOut: input.hours });
            console.log(`[Forecasts Router] ✅ Fetched ${fetchedPoints.length} points from Open-Meteo`);

            // Convert to database format
            const dbPoints = fetchedPoints.map((point) => convertToDbFormat(point, spot.id));
            if (dbPoints.length > 0) {
              console.log('[Forecasts Router] Sample point data:', {
                secondarySwellHeightFt: dbPoints[0].secondarySwellHeightFt,
                windWaveHeightFt: dbPoints[0].windWaveHeightFt,
              });
            }

            // Store in database (auto-cleanup happens inside insertForecastPoints)
            console.log(`[Forecasts Router] 💾 Inserting ${dbPoints.length} new points (auto-cleanup enabled)...`);
            await insertForecastPoints(dbPoints);

            // Re-fetch from database after insert
            forecastPoints = await getForecastTimeline(input.spotId, input.hours);
            console.log(`[Forecasts Router] ✅ Re-fetched ${forecastPoints.length} points from database`);
          } catch (error: any) {
            console.error(`[Forecasts Router] ❌ Error refreshing data for spot ${input.spotId}:`, error);
            const status = error.response?.status;
            const statusMessage = status ? ` (${status})` : '';
            throw new TRPCError({
              code: status === 400 ? "BAD_REQUEST" : status === 404 ? "NOT_FOUND" : status >= 500 ? "INTERNAL_SERVER_ERROR" : "INTERNAL_SERVER_ERROR",
              message: `Open-Meteo API request failed${statusMessage}`,
            });
          }
        } else {
          console.log(`[Forecasts Router] ✅ Using cached data for spot ${input.spotId} (${spot.name}): ${forecastPoints.length} points`);
        }

        // Get average crowd level
        const avgCrowdLevel = await getAverageCrowdLevel(spot.id);

        // Generate timeline with quality scores
        const timeline = await generateForecastTimeline({
          forecastPoints,
          spot,
          tideStationId: spot.tideStationId,
          avgCrowdLevel,
        });

        // 📡 STEP 5: API Sending to Frontend
        if (timeline.length > 0) {
          const firstTimeline = timeline[0];
          console.log('📡 STEP 5: API Sending to Frontend');
          console.log('Timeline length:', timeline.length);
          console.log('Timeline sample:', {
            secondarySwellHeightFt: firstTimeline.secondarySwellHeightFt,
            secondarySwellPeriodS: firstTimeline.secondarySwellPeriodS,
            secondarySwellDirectionDeg: firstTimeline.secondarySwellDirectionDeg,
            windWaveHeightFt: firstTimeline.windWaveHeightFt,
            windWavePeriodS: firstTimeline.windWavePeriodS,
            windWaveDirectionDeg: firstTimeline.windWaveDirectionDeg,
          });
        }

        // Add ECMWF confidence data to timeline (compares Open-Meteo vs Stormglass)
        const timelineWithConfidence = await addConfidenceToTimeline(spot.id, timeline);
        const confidenceSummary = await getConfidenceSummary(spot.id, timeline);

        return {
          timeline: timelineWithConfidence,
          spot,
          confidence: {
            overall: confidenceSummary.overallConfidence,
            badge: getConfidenceBadgeText(confidenceSummary.overallConfidence),
            stats: {
              high: confidenceSummary.highCount,
              med: confidenceSummary.medCount,
              low: confidenceSummary.lowCount,
              total: confidenceSummary.totalWithData,
            },
          },
        };
      }),

    // Force cleanup of old forecast data for a spot
    cleanupSpotData: publicProcedure
      .input(z.object({ spotId: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteAllForecastPointsForSpot, getForecastTimeline } = await import("./db");
        
        console.log(`[Force Cleanup] Starting cleanup for spot ${input.spotId}...`);
        
        // Get count before cleanup
        const beforeCount = (await getForecastTimeline(input.spotId, 1000)).length;
        console.log(`[Force Cleanup] Found ${beforeCount} points before cleanup`);
        
        // Delete ALL forecast points for this spot
        const deletedCount = await deleteAllForecastPointsForSpot(input.spotId);
        console.log(`[Force Cleanup] Deleted ${deletedCount} forecast points for spot ${input.spotId}`);
        
        // Verify cleanup
        const afterCount = (await getForecastTimeline(input.spotId, 1000)).length;
        console.log(`[Force Cleanup] Found ${afterCount} points after cleanup`);
        
        return {
          success: true,
          deletedCount,
          beforeCount,
          afterCount,
        };
      }),

    // Refresh forecast timeline (fetch from Open-Meteo and store)
    refreshTimeline: publicProcedure
      .input(z.object({ spotId: z.number() }))
      .mutation(async ({ input }) => {
        const spot = await getSpotById(input.spotId);
        if (!spot) {
          throw new Error("Spot not found");
        }

        // Import Open-Meteo functions
        const { fetchOpenMeteoForecastForSpot, convertToDbFormat } = await import("./services/openMeteo");
        const { insertForecastPoints, deleteAllForecastPointsForSpot } = await import("./db");

        console.log(`[Refresh Timeline] Starting refresh for ${spot.name} (ID: ${input.spotId})...`);

        // Explicitly delete old points BEFORE fetching new data to ensure clean state
        console.log(`[Refresh Timeline] Cleaning up old forecast points for spot ${input.spotId}...`);
        const deletedCount = await deleteAllForecastPointsForSpot(input.spotId);
        console.log(`[Refresh Timeline] Deleted ${deletedCount} old forecast points`);

        // Fetch forecast from Open-Meteo (168 hours = 7 days)
        const forecastPoints = await fetchOpenMeteoForecastForSpot(spot, { maxHoursOut: 168 });
        console.log(`[Refresh Timeline] Fetched ${forecastPoints.length} points from Open-Meteo (expected: 168)`);

        if (forecastPoints.length === 0) {
          console.error(`[Refresh Timeline] ERROR: Fetched 0 forecast points from Open-Meteo!`);
          throw new Error("Failed to fetch forecast points from Open-Meteo");
        }

        if (forecastPoints.length < 168) {
          console.warn(`[Refresh Timeline] WARNING: Expected 168 points but got ${forecastPoints.length}`);
        }

        // Convert to database format
        const dbPoints = forecastPoints.map((point) => convertToDbFormat(point, spot.id));
        if (dbPoints.length > 0) {
          console.log('[Refresh Timeline] Sample point:', {
            secondarySwellHeightFt: dbPoints[0].secondarySwellHeightFt,
            windWaveHeightFt: dbPoints[0].windWaveHeightFt,
          });
        }

        // Store in database (insertForecastPoints also does cleanup, but we already did it above)
        console.log(`[Refresh Timeline] Inserting ${dbPoints.length} points into database...`);
        await insertForecastPoints(dbPoints);
        console.log(`[Refresh Timeline] ✅ Successfully stored ${dbPoints.length} forecast points`);

        return {
          success: true,
          pointsStored: dbPoints.length,
        };
      }),
  }),

  // ==================== CROWD REPORTS ROUTER ====================
  crowd: router({
    // Get recent crowd reports for a spot
    getForSpot: publicProcedure.input(z.object({ spotId: z.number() })).query(async ({ input }) => {
      const reports = await getRecentCrowdReports(input.spotId);
      const avgLevel = await getAverageCrowdLevel(input.spotId);
      return { reports, averageLevel: avgLevel };
    }),

    // Submit a crowd report (requires authentication)
    submit: protectedProcedure
      .input(
        z.object({
          spotId: z.number(),
          crowdLevel: z.number().min(1).max(5),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await insertCrowdReport({
          spotId: input.spotId,
          userId: ctx.user.id,
          reportTime: new Date(),
          crowdLevel: input.crowdLevel,
        });
        return { success: true };
      }),
  }),

  // ==================== DISTANCE ROUTER ====================
  distance: router({
    getDistance: publicProcedure
      .input(
        z.object({
          origin: z.string(),
          destination: z.string(),
          mode: z.enum(["driving", "transit"]).default("driving"),
        })
      )
      .query(async ({ input }) => {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
          throw new Error("GOOGLE_MAPS_API_KEY not configured");
        }

        try {
          // Call Google Maps Distance Matrix API directly
          const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
          url.searchParams.set("origins", input.origin);
          url.searchParams.set("destinations", input.destination);
          url.searchParams.set("mode", input.mode);
          url.searchParams.set("units", "imperial");
          url.searchParams.set("key", apiKey);

          const response = await fetch(url.toString());
          if (!response.ok) {
            throw new Error(`Google Maps API error: ${response.status}`);
          }

          const result = await response.json() as DistanceMatrixResult;

          if (result.status !== "OK") {
            throw new Error(`Distance Matrix API error: ${result.status}`);
          }

          const element = result.rows[0]?.elements[0];
          if (!element || element.status !== "OK") {
            throw new Error(`No route found: ${element?.status || "UNKNOWN"}`);
          }

          return {
            distance: element.distance.text,
            distanceValue: element.distance.value, // in meters
            duration: element.duration.text,
            durationValue: element.duration.value, // in seconds
            status: element.status,
          };
        } catch (error) {
          console.error("Distance calculation error:", error);
          throw new Error(
            error instanceof Error ? error.message : "Failed to calculate distance"
          );
        }
      }),

    // Batched distance endpoint for dashboard spot cards
    getDistanceToSpots: publicProcedure
      .input(
        z.object({
          origin: z.string(), // "lat,lng" format
          mode: z.enum(["driving", "transit"]).default("driving"),
        })
      )
      .query(async ({ input }) => {
        // Spot coordinates (name -> lat,lng)
        const SPOT_COORDS: Record<string, string> = {
          "Lido Beach": "40.5892,-73.6265",
          "Long Beach": "40.5883,-73.6579",
          "Rockaway Beach": "40.5833,-73.8167",
        };

        // Round origin to 3 decimal places to improve cache hit rate
        const roundCoord = (coord: string) => {
          const [lat, lng] = coord.split(",").map(Number);
          return `${lat.toFixed(3)},${lng.toFixed(3)}`;
        };

        const roundedOrigin = roundCoord(input.origin);
        const cacheKey = `distance:${roundedOrigin}:${input.mode}`;

        // Check in-memory cache (12 hour TTL)
        const cached = distanceCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 12 * 60 * 60 * 1000) {
          return cached.data;
        }

        // Get API key - try direct key first, then fall back to proxy
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
          console.warn("GOOGLE_MAPS_API_KEY not set - distance feature disabled");
          const distances: Record<string, null> = {};
          Object.keys(SPOT_COORDS).forEach((name) => {
            distances[name] = null;
          });
          return distances;
        }

        try {
          // Join all destinations with | separator for batch request
          const destinations = Object.values(SPOT_COORDS).join("|");

          // Call Google Maps Distance Matrix API directly
          const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
          url.searchParams.set("origins", input.origin);
          url.searchParams.set("destinations", destinations);
          url.searchParams.set("mode", input.mode);
          url.searchParams.set("units", "imperial");
          url.searchParams.set("key", apiKey);

          const response = await fetch(url.toString());
          if (!response.ok) {
            throw new Error(`Google Maps API error: ${response.status}`);
          }

          const result = await response.json() as DistanceMatrixResult;

          if (result.status !== "OK") {
            throw new Error(`Distance Matrix API error: ${result.status}`);
          }

          // Map results back to spot names
          const spotNames = Object.keys(SPOT_COORDS);
          const elements = result.rows[0]?.elements || [];

          const distances: Record<string, {
            distanceMiles: number;
            durationMinutes: number;
            durationText: string;
            distanceText: string;
          } | null> = {};

          spotNames.forEach((spotName, index) => {
            const element = elements[index];
            if (element && element.status === "OK") {
              // Convert meters to miles (1 mile = 1609.34 meters)
              const distanceMiles = Math.round(element.distance.value / 1609.34 * 10) / 10;
              const durationMinutes = Math.round(element.duration.value / 60);

              distances[spotName] = {
                distanceMiles,
                durationMinutes,
                durationText: element.duration.text,
                distanceText: element.distance.text,
              };
            } else {
              distances[spotName] = null;
            }
          });

          // Cache the result
          distanceCache.set(cacheKey, {
            timestamp: Date.now(),
            data: distances,
          });

          return distances;
        } catch (error) {
          console.error("Batch distance calculation error:", error);
          // Return null for all spots on error (fail gracefully)
          const distances: Record<string, null> = {};
          Object.keys(SPOT_COORDS).forEach((name) => {
            distances[name] = null;
          });
          return distances;
        }
      }),
  }),

  // ==================== BUOY ROUTER ====================
  buoy: router({
    // Get real-time data from NOAA Buoy 44065 (NY Harbor Entrance)
    get44065: publicProcedure.query(async () => {
      const reading = await fetchBuoy44065Cached();
      return reading;
    }),

    // Clear buoy cache (for debugging/forcing refresh)
    clearCache: publicProcedure.mutation(async () => {
      clearBuoyCache();
      const freshReading = await fetchBuoy44065Cached();
      return { success: true, reading: freshReading };
    }),

    // Calculate breaking wave heights for all featured spots based on buoy data
    getBreakingHeightsForSpots: publicProcedure.query(async () => {
      const reading = await fetchBuoy44065Cached();
      console.log('[Buoy Breaking Heights] Raw buoy reading:', reading ? {
        swellHeight: reading.swellHeight,
        swellPeriod: reading.swellPeriod,
        windWaveHeight: reading.windWaveHeight,
        windWavePeriod: reading.windWavePeriod,
        timestamp: reading.timestamp,
      } : 'NULL - buoy data unavailable');

      if (!reading) {
        return null;
      }

      const featuredSpotNames = ["Rockaway Beach", "Long Beach", "Lido Beach"];
      const results: Record<string, { height: number; period: number; direction: number | null }> = {};

      // Get all spots to access tide station IDs
      const allSpots = await getAllSpots();

      for (const spotName of featuredSpotNames) {
        const profile = getSpotProfile(spotName);
        if (!profile) continue;

        // Find the spot to get tide station ID
        const spot = allSpots.find(s => s.name === spotName);
        if (!spot) {
          console.warn(`[Buoy Breaking Heights] Spot not found: ${spotName}`);
          continue;
        }

        // Get current tide info for this spot
        let tideHeightFt: number | null = null;
        let tidePhase: string | null = null;
        try {
          const tideInfo = await getCurrentTideInfo(spot.tideStationId);
          if (tideInfo) {
            tideHeightFt = tideInfo.currentHeightFt;
            tidePhase = tideInfo.tidePhase;
          }
        } catch (error) {
          console.warn(`[Buoy Breaking Heights] Failed to get tide info for ${spotName}:`, error);
        }

        // Calculate QUALITY-WEIGHTED energy for both components to determine which is dominant
        // SURF FORECASTER'S RULE: Period < 5s is wind chop, not surfable waves
        // We use the same calculateSwellEnergy function that applies period quality factors
        const swellEnergy = reading.swellHeight !== null && reading.swellPeriod !== null
          ? calculateSwellEnergy(reading.swellHeight, reading.swellPeriod)
          : 0;
        
        const windWaveEnergy = reading.windWaveHeight !== null && reading.windWavePeriod !== null
          ? calculateSwellEnergy(reading.windWaveHeight, reading.windWavePeriod)
          : 0;

        // Use the height and period that correspond to the dominant SURFABLE energy component
        let waveHeight: number;
        let dominantPeriod: number;
        let waveDirection: number | null;

        // Wind waves only win if they have higher quality-weighted energy AND period >= 5s (surfable)
        if (windWaveEnergy > swellEnergy && reading.windWaveHeight !== null && reading.windWavePeriod !== null && reading.windWavePeriod >= 5) {
          // Wind waves are dominant AND surfable
          waveHeight = reading.windWaveHeight;
          dominantPeriod = reading.windWavePeriod;
          waveDirection = reading.windWaveDirectionDeg;
          console.log(`[Buoy Breaking Heights] ${spotName}: Using wind waves (quality-weighted energy: ${windWaveEnergy.toFixed(1)}) - ${waveHeight.toFixed(1)}ft @ ${dominantPeriod}s`);
        } else if (reading.swellHeight !== null && reading.swellPeriod !== null && reading.swellPeriod >= 5) {
          // Swell is dominant (or wind waves are unsurfable chop)
          waveHeight = reading.swellHeight;
          dominantPeriod = reading.swellPeriod;
          waveDirection = reading.swellDirectionDeg;
          console.log(`[Buoy Breaking Heights] ${spotName}: Using swell (quality-weighted energy: ${swellEnergy.toFixed(1)}) - ${waveHeight.toFixed(1)}ft @ ${dominantPeriod}s`);
        } else {
          // Both components have period < 5s - no surfable waves
          console.warn(`[Buoy Breaking Heights] ${spotName}: No surfable waves - swell period ${reading.swellPeriod}s, wind wave period ${reading.windWavePeriod}s (both < 5s)`);
          results[spotName] = { height: 0, period: 0, direction: null };
          continue;
        }

        const breakingHeight = calculateBreakingWaveHeight(
          waveHeight,
          dominantPeriod,
          profile,
          waveDirection,
          tideHeightFt,
          tidePhase
        );

        console.log(`[Buoy Breaking Heights] ${spotName}: ${waveHeight.toFixed(1)}ft @ ${dominantPeriod}s → ${breakingHeight.toFixed(1)}ft breaking (tide: ${tideHeightFt?.toFixed(1) ?? 'N/A'}ft ${tidePhase ?? ''})`);
        results[spotName] = { height: breakingHeight, period: dominantPeriod, direction: waveDirection };
      }

      console.log('[Buoy Breaking Heights] Final results:', results);
      return results;
    }),
  }),

  // ==================== CONDITIONS LOG ROUTER ====================
  conditions: router({
    // Log current conditions snapshot for pattern matching
    logSnapshot: publicProcedure
      .input(z.object({
        bestSpotName: z.string().nullable(),
        qualityScore: z.number().nullable(),
        waveHeightFt: z.number().nullable(),
        wavePeriodSec: z.number().nullable(),
        waveDirectionDeg: z.number().nullable(),
        windSpeedMph: z.number().nullable(),
        windDirectionDeg: z.number().nullable(),
        windType: z.string().nullable(),
        buoyWaveHeightFt: z.number().nullable(),
        buoyPeriodSec: z.number().nullable(),
        buoyDirectionDeg: z.number().nullable(),
        isSurfable: z.boolean(),
        unsurfableReason: z.string().nullable(),
        tideHeightFt: z.number().nullable(),
        tidePhase: z.string().nullable(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }
        const now = new Date();

        await db.insert(conditionsLog).values({
          timestamp: now,
          bestSpotName: input.bestSpotName,
          qualityScore: input.qualityScore,
          waveHeightFt: input.waveHeightFt?.toString() ?? null,
          wavePeriodSec: input.wavePeriodSec,
          waveDirectionDeg: input.waveDirectionDeg,
          windSpeedMph: input.windSpeedMph,
          windDirectionDeg: input.windDirectionDeg,
          windType: input.windType,
          buoyWaveHeightFt: input.buoyWaveHeightFt?.toString() ?? null,
          buoyPeriodSec: input.buoyPeriodSec,
          buoyDirectionDeg: input.buoyDirectionDeg,
          isSurfable: input.isSurfable ? 1 : 0,
          unsurfableReason: input.unsurfableReason,
          dayOfWeek: now.getDay(),
          hourOfDay: now.getHours(),
          month: now.getMonth() + 1,
          tideHeightFt: input.tideHeightFt?.toString() ?? null,
          tidePhase: input.tidePhase,
        });

        console.log('[Conditions Log] Snapshot saved:', {
          timestamp: now.toISOString(),
          isSurfable: input.isSurfable,
          unsurfableReason: input.unsurfableReason,
          score: input.qualityScore,
        });

        return { success: true };
      }),

    // Get similar historical conditions (for pattern matching)
    getSimilarConditions: publicProcedure
      .input(z.object({
        reason: z.string().optional(),
        month: z.number().optional(),
        dayOfWeek: z.number().optional(),
        limit: z.number().default(10),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        // Build query based on filters
        let query = db.select().from(conditionsLog);

        // For now, just get recent logs with the same reason
        if (input.reason) {
          query = query.where(eq(conditionsLog.unsurfableReason, input.reason));
        }

        const results = await query
          .orderBy(desc(conditionsLog.timestamp))
          .limit(input.limit);

        return results;
      }),

    // Get condition statistics for a given reason
    getReasonStats: publicProcedure
      .input(z.object({ reason: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        const logs = await db.select()
          .from(conditionsLog)
          .where(eq(conditionsLog.unsurfableReason, input.reason))
          .orderBy(desc(conditionsLog.timestamp))
          .limit(100);

        if (logs.length === 0) {
          return null;
        }

        // Calculate averages
        const avgWindSpeed = logs.reduce((sum, l) => sum + (l.windSpeedMph ?? 0), 0) / logs.length;
        const avgWaveHeight = logs.reduce((sum, l) => sum + (parseFloat(l.waveHeightFt ?? '0') || 0), 0) / logs.length;

        // Most common hour
        const hourCounts: Record<number, number> = {};
        logs.forEach(l => {
          if (l.hourOfDay !== null) {
            hourCounts[l.hourOfDay] = (hourCounts[l.hourOfDay] || 0) + 1;
          }
        });
        const mostCommonHour = Object.entries(hourCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0];

        return {
          totalOccurrences: logs.length,
          avgWindSpeed: Math.round(avgWindSpeed),
          avgWaveHeight: avgWaveHeight.toFixed(1),
          mostCommonHour: mostCommonHour ? parseInt(mostCommonHour) : null,
          recentOccurrences: logs.slice(0, 5).map(l => ({
            timestamp: l.timestamp,
            windSpeed: l.windSpeedMph,
            waveHeight: l.waveHeightFt,
          })),
        };
      }),
  }),

  // ==================== ALERTS ROUTER ====================
  alerts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User must be authenticated" });
      }
      console.log(`[alerts.list] Fetching alerts for userId: ${ctx.user.id}`);
      const alerts = await getAllSwellAlertsForUser(ctx.user.id);
      console.log(`[alerts.list] Found ${alerts.length} alerts for userId: ${ctx.user.id}`);
      return alerts;
    }),

    get: protectedProcedure
      .input(z.object({ alertId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "User must be authenticated" });
        }
        const alert = await getSwellAlertById(input.alertId, ctx.user.id);
        if (!alert) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found" });
        }
        return alert;
      }),

    // Public endpoint - count of unique users with alerts (for waitlist counter)
    count: publicProcedure.query(async () => {
      return await getActiveAlertUserCount();
    }),

    create: protectedProcedure
      .input(
        z.object({
          spotId: z.number().nullable(),
          minWaveHeightFt: z.number().optional(),
          minQualityScore: z.number().min(0).max(100).optional(),
          minPeriodSec: z.number().optional(),
          idealWindOnly: z.boolean().optional(),
          allowedDays: z.array(z.number().min(0).max(6)).optional(), // 0=Sun, 6=Sat
          hoursAdvanceNotice: z.number().min(1).max(168).default(24),
          emailEnabled: z.boolean().default(true),
          smsEnabled: z.boolean().default(false),
          phone: z.string().optional(),
          // Alert frequency: "once" | "twice" | "threshold" | "realtime"
          notificationFrequency: z.enum(["once", "twice", "threshold", "realtime", "immediate"]).default("once"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "User must be authenticated" });
        }
        console.log(`[alerts.create] Creating alert for userId: ${ctx.user.id}, input:`, JSON.stringify(input));

        // If SMS is enabled, update user's smsOptIn and phone
        if (input.smsEnabled) {
          const db = await getDb();
          const updateFields: any = { smsOptIn: 1 };
          if (input.phone) {
            updateFields.phone = input.phone.replace(/\D/g, "");
          }
          await db.update(users).set(updateFields).where(eq(users.id, ctx.user.id));
        }

        // Helper to convert undefined/empty/null to null
        const toNull = (val: any) => (val === undefined || val === '' || val === null) ? null : val;
        // Convert all nullable fields to null if undefined/empty
        // Use != null check (covers null and undefined) so 0 values are preserved
        const minWaveHeightFtValue = input.minWaveHeightFt != null && input.minWaveHeightFt !== '' ? String(input.minWaveHeightFt) : null;
        const minPeriodSecValue = toNull(input.minPeriodSec);
        const minQualityScoreValue = toNull(input.minQualityScore);
        const spotIdValue = toNull(input.spotId);
        const alertId = await createSwellAlert({
          userId: ctx.user.id,
          spotId: spotIdValue,
          minWaveHeightFt: minWaveHeightFtValue,
          minQualityScore: minQualityScoreValue,
          minPeriodSec: minPeriodSecValue,
          idealWindOnly: input.idealWindOnly ? 1 : 0,
          allowedDays: input.allowedDays ? input.allowedDays.join(',') : "0,1,2,3,4,5,6",
          hoursAdvanceNotice: input.hoursAdvanceNotice,
          emailEnabled: input.emailEnabled ? 1 : 0,
          smsEnabled: input.smsEnabled ? 1 : 0,
          pushEnabled: 0,
          isActive: 1,
          notificationFrequency: input.notificationFrequency,
          daysAdvanceNotice: null,
          lastNotifiedScore: null,
        });
        console.log(`[alerts.create] Alert created with id: ${alertId} for userId: ${ctx.user.id}`);
        
        // Send confirmation email if user has email and email notifications are enabled
        if (ctx.user.email && input.emailEnabled) {
          const spotName = spotIdValue ? (await getSpotById(spotIdValue))?.name || "Selected spot" : "Best spot only";
          const frequencyLabel = {
            once: "Once Daily",
            twice: "Twice Daily",
            threshold: "Threshold Only",
            realtime: "Real-Time",
            immediate: "Immediate",
          }[input.notificationFrequency] || input.notificationFrequency;
          
          const notificationMethods = [];
          if (input.emailEnabled) notificationMethods.push("Email");
          if (input.smsEnabled) notificationMethods.push("SMS");
          
          await sendEmail({
            to: ctx.user.email,
            subject: "Surf Alert Created Successfully",
            html: `
              <h2>Your surf alert has been created!</h2>
              <p>We'll notify you when conditions match your criteria:</p>
              <ul>
                <li><strong>Spot:</strong> ${spotName}</li>
                <li><strong>Quality Threshold:</strong> ${minQualityScoreValue ?? "Any"}${minQualityScoreValue ? "+" : ""}</li>
                <li><strong>Forecast Window:</strong> ${Math.round(input.hoursAdvanceNotice / 24)} day(s)</li>
                <li><strong>Alert Frequency:</strong> ${frequencyLabel}</li>
                <li><strong>Notification Method:</strong> ${notificationMethods.join(", ") || "None"}</li>
              </ul>
              <p>You can view and manage your alerts on the <a href="https://www.nycsurfco.com/members">Members Portal</a>.</p>
              <p>Stay stoked! 🏄‍♂️</p>
            `,
          }).catch((error) => {
            console.warn("[Alert Creation] Failed to send confirmation email:", error);
            // Don't fail the mutation if email fails
          });
        }
        
        return { success: true, alertId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          alertId: z.number(),
          spotId: z.number().nullable().optional(),
          minWaveHeightFt: z.number().optional(),
          minQualityScore: z.number().min(0).max(100).optional(),
          minPeriodSec: z.number().optional(),
          idealWindOnly: z.boolean().optional(),
          allowedDays: z.array(z.number().min(0).max(6)).optional(),
          hoursAdvanceNotice: z.number().min(1).max(168).optional(),
          emailEnabled: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "User must be authenticated" });
        }
        const { alertId, ...updates } = input;
        const existingAlert = await getSwellAlertById(alertId, ctx.user.id);
        if (!existingAlert) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found" });
        }
        const updateData: any = {};
        if (updates.spotId !== undefined) updateData.spotId = updates.spotId;
        if (updates.minWaveHeightFt !== undefined) {
          updateData.minWaveHeightFt = updates.minWaveHeightFt ? String(updates.minWaveHeightFt) : null;
        }
        if (updates.minQualityScore !== undefined) updateData.minQualityScore = updates.minQualityScore;
        if (updates.minPeriodSec !== undefined) updateData.minPeriodSec = updates.minPeriodSec;
        if (updates.idealWindOnly !== undefined) updateData.idealWindOnly = updates.idealWindOnly ? 1 : 0;
        if (updates.allowedDays !== undefined) updateData.allowedDays = updates.allowedDays.join(',');
        if (updates.hoursAdvanceNotice !== undefined) updateData.hoursAdvanceNotice = updates.hoursAdvanceNotice;
        if (updates.emailEnabled !== undefined) updateData.emailEnabled = updates.emailEnabled ? 1 : 0;
        await updateSwellAlert(alertId, ctx.user.id, updateData);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ alertId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "User must be authenticated" });
        }
        await deleteSwellAlert(input.alertId, ctx.user.id);
        return { success: true };
      }),

    preview: protectedProcedure
      .input(
        z.object({
          spotId: z.number().nullable(),
          minWaveHeightFt: z.number().optional(),
          minQualityScore: z.number().min(0).max(100).optional(),
          minPeriodSec: z.number().optional(),
          hoursAdvanceNotice: z.number().min(1).max(168).default(24),
        })
      )
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "User must be authenticated" });
        }
        const { detectUpcomingSwells } = await import("./services/swellDetection");
        const tempAlert: any = {
          id: 0,
          userId: ctx.user.id,
          spotId: input.spotId,
          minWaveHeightFt: input.minWaveHeightFt ? String(input.minWaveHeightFt) : null,
          minQualityScore: input.minQualityScore ?? null,
          minPeriodSec: input.minPeriodSec ?? null,
          idealWindOnly: 0,
          hoursAdvanceNotice: input.hoursAdvanceNotice,
          emailEnabled: 1,
          pushEnabled: 0,
          isActive: 1,
        };
        const spots = await getAllSpots();
        return await detectUpcomingSwells(tempAlert, spots);
      }),
  }),

  admin: router({
    forecasts: router({
      // Manually trigger Stormglass fetch for a spot
      triggerStormglassFetch: adminProcedure
        .input(z.object({ spotId: z.number() }))
        .mutation(async ({ input }) => {
          const spot = await getSpotById(input.spotId);
          if (!spot) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Spot not found" });
          }

          const { fetchStormglassForSpot } = await import("./services/stormglass");
          const { insertStormglassVerificationBatch } = await import("./db");
          const { InsertStormglassVerification } = await import("../drizzle/schema");

          console.log(`[Admin] Manually triggering Stormglass fetch for ${spot.name}...`);

          try {
            // Fetch 7 days (168 hours) of ECMWF data to match Open-Meteo
            const forecastPoints = await fetchStormglassForSpot(spot, { hoursAhead: 168 });

            if (forecastPoints.length === 0) {
              return { success: false, message: "No data received from Stormglass API", pointsStored: 0 };
            }

            // Convert to database format
            const dbRecords = forecastPoints.map((point) => ({
              spotId: spot.id,
              forecastTimestamp: point.forecastTimestamp,
              waveHeightFt: point.waveHeightFt !== null ? point.waveHeightFt.toFixed(1) : null,
              swellHeightFt: point.swellHeightFt !== null ? point.swellHeightFt.toFixed(1) : null,
              swellPeriodS: point.swellPeriodS !== null ? Math.round(point.swellPeriodS) : null,
              swellDirectionDeg: point.swellDirectionDeg !== null ? Math.round(point.swellDirectionDeg) : null,
              source: point.source,
            }));

            // Insert into database
            await insertStormglassVerificationBatch(dbRecords);

            console.log(`[Admin] Stored ${dbRecords.length} Stormglass points for ${spot.name}`);

            return { success: true, message: `Fetched ${dbRecords.length} hours of data`, pointsStored: dbRecords.length };
          } catch (error: any) {
            console.error(`[Admin] Stormglass fetch error:`, error.message);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: error.message || "Failed to fetch Stormglass data",
            });
          }
        }),

      // Get comparison data for Open-Meteo vs Stormglass (ECMWF)
      getComparison: adminProcedure
        .input(z.object({ spotId: z.number() }))
        .query(async ({ input }) => {
          const spot = await getSpotById(input.spotId);
          if (!spot) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Spot not found" });
          }

          // Get Open-Meteo forecast timeline (7 days = 168 hours)
          const forecastPoints = await getForecastTimeline(input.spotId, 168);
          const avgCrowdLevel = await getAverageCrowdLevel(input.spotId);

          const { generateForecastTimeline } = await import("./services/forecast");
          const timeline = await generateForecastTimeline({
            forecastPoints,
            spot,
            tideStationId: spot.tideStationId,
            avgCrowdLevel,
          });

          // Get Stormglass verification data (7 days = 168 hours)
          const now = new Date();
          const endTime = new Date(now.getTime() + 168 * 60 * 60 * 1000);
          const stormglassData = await getStormglassVerification(input.spotId, now, endTime);

          // Get last fetch time
          const lastFetchTime = await getLatestStormglassFetchTime(input.spotId);

          // Helper to get hour key for Open-Meteo data (YYYY-MM-DDTHH format)
          // Open-Meteo timestamps are local Eastern time stored WITHOUT timezone info,
          // so they're parsed as UTC on the server. getUTCHours() gives the local hour.
          const getHourKey = (timestamp: Date | string): string => {
            const d = new Date(timestamp);
            const year = d.getUTCFullYear();
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            const hour = String(d.getUTCHours()).padStart(2, '0');
            return `${year}-${month}-${day}T${hour}`;
          };

          // Helper to get hour key for Stormglass data - converts UTC to Eastern time
          // Stormglass timestamps are actual UTC, so we need to convert to Eastern
          // to match Open-Meteo's (incorrectly stored) local time keys
          const getStormglassHourKey = (timestamp: Date | string): string => {
            const d = new Date(timestamp);
            // Convert UTC to Eastern time using Intl.DateTimeFormat
            const parts = new Intl.DateTimeFormat('en-US', {
              timeZone: 'America/New_York',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              hour12: false
            }).formatToParts(d);

            const year = parts.find(p => p.type === 'year')?.value;
            const month = parts.find(p => p.type === 'month')?.value;
            const day = parts.find(p => p.type === 'day')?.value;
            let hour = parts.find(p => p.type === 'hour')?.value;
            // Handle midnight (hour12:false can return '24' for midnight in some locales)
            if (hour === '24') hour = '00';
            return `${year}-${month}-${day}T${hour}`;
          };

          // Create a map of Stormglass data by hour for easy lookup
          const stormglassMap = new Map<string, {
            waveHeightFt: number | null;
            swellHeightFt: number | null;
            swellPeriodS: number | null;
            swellDirectionDeg: number | null;
          }>();
          for (const sg of stormglassData) {
            const key = getStormglassHourKey(sg.forecastTimestamp);  // Convert UTC → Eastern
            stormglassMap.set(key, {
              waveHeightFt: sg.waveHeightFt ? parseFloat(sg.waveHeightFt) : null,
              swellHeightFt: sg.swellHeightFt ? parseFloat(sg.swellHeightFt) : null,
              swellPeriodS: sg.swellPeriodS ?? null,
              swellDirectionDeg: sg.swellDirectionDeg ?? null,
            });
          }

          // Debug: Log sample keys to verify matching
          if (stormglassData.length > 0 && timeline.length > 0) {
            const sampleSgKeys = Array.from(stormglassMap.keys()).slice(0, 3);
            const sampleOmKey = getHourKey(timeline[0].forecastTimestamp);
            console.log('[Comparison Debug] Sample Stormglass keys (Eastern):', sampleSgKeys);
            console.log('[Comparison Debug] First Open-Meteo key:', sampleOmKey);
            console.log('[Comparison Debug] Key match?', stormglassMap.has(sampleOmKey));
          }

          // Combine Open-Meteo and Stormglass data
          const comparison = timeline.map((point) => {
            const pointTime = new Date(point.forecastTimestamp);
            const key = getHourKey(pointTime);
            const sg = stormglassMap.get(key);

            // Open-Meteo wave height (use breaking height or dominant swell)
            const openMeteoHeight = point.breakingWaveHeightFt ?? point.dominantSwellHeightFt ?? null;
            const stormglassHeight = sg?.swellHeightFt ?? null; // Use swellHeight (not waveHeight) for fair comparison - Open-Meteo shows swell, not combined

            // Calculate difference and confidence
            let difference: number | null = null;
            let confidence: ConfidenceLevel = null;
            if (openMeteoHeight !== null && stormglassHeight !== null) {
              difference = Math.abs(openMeteoHeight - stormglassHeight);
              if (difference < 0.5) confidence = "HIGH";
              else if (difference < 1.5) confidence = "MED";
              else confidence = "LOW";
            }

            return {
              time: pointTime.toISOString(),
              openMeteoHeightFt: openMeteoHeight,
              stormglassHeightFt: stormglassHeight, // This is now swellHeightFt (swell-to-swell comparison)
              stormglassCombinedHeightFt: sg?.waveHeightFt ?? null, // Combined wind+swell for reference
              differenceFt: difference,
              confidence,
              // Open-Meteo swell details
              swellPeriodS: point.dominantSwellPeriodS ?? point.wavePeriodSec ?? null,
              swellDirectionDeg: point.dominantSwellDirectionDeg ?? point.waveDirectionDeg ?? null,
              // Stormglass swell details
              stormglassPeriodS: sg?.swellPeriodS ?? null,
              stormglassDirectionDeg: sg?.swellDirectionDeg ?? null,
            };
          });

          return {
            spot,
            comparison,
            lastStormglassFetch: lastFetchTime,
            stormglassPointCount: stormglassData.length,
            openMeteoPointCount: timeline.length,
          };
        }),
    }),

    alerts: router({
      getAll: adminProcedure.query(async () => {
        return getAllSwellAlertsWithUsers();
      }),
      sendBulkAlert: adminProcedure
        .input(
          z.object({
            message: z.string().min(1),
            subject: z.string().min(1).default("NYC Surf Co. Alert"),
            sendEmail: z.boolean().default(true),
            sendSMS: z.boolean().default(false),
          })
        )
        .mutation(async ({ ctx, input }) => {
          const db = await getDb();
          if (!db) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Database not available",
            });
          }

          // Get all users with email (for email alerts)
          const allUsers = await db.select().from(users);
          
          // Get unique users (deduplicate by email)
          const uniqueUsersMap = new Map<string, User>();
          for (const user of allUsers) {
            if (user.email && !uniqueUsersMap.has(user.email)) {
              uniqueUsersMap.set(user.email, user);
            }
          }
          const uniqueUsers = Array.from(uniqueUsersMap.values());
          
          const emailUsers = uniqueUsers.filter((u) => u.email);
          const smsUsers = uniqueUsers.filter((u) => u.phone && u.smsOptIn === 1);

          let emailSuccessCount = 0;
          let emailErrorCount = 0;
          let smsSuccessCount = 0;
          let smsErrorCount = 0;

          // Send emails using batch API
          if (input.sendEmail && emailUsers.length > 0) {
            const emailOptions = emailUsers.map((user) => ({
              to: user.email!,
              subject: input.subject,
              html: `<p>${input.message.replace(/\n/g, "<br>")}</p>`,
              text: input.message,
            }));

            const emailResult = await sendBatchEmails(emailOptions);
            emailSuccessCount = emailResult.successCount;
            emailErrorCount = emailResult.errorCount;
          }

          // Send SMS (loop through users - Quo doesn't have batch API)
          if (input.sendSMS && smsUsers.length > 0) {
            for (const user of smsUsers) {
              if (user.phone) {
                const success = await sendSMS({
                  phone: user.phone,
                  message: input.message,
                });
                if (success) {
                  smsSuccessCount++;
                } else {
                  smsErrorCount++;
                }
              }
            }
          }

          return {
            emailSent: emailSuccessCount,
            emailErrors: emailErrorCount,
            smsSent: smsSuccessCount,
            smsErrors: smsErrorCount,
          };
        }),

      // Send a test alert email to the admin with fake swell data
      sendTestAlert: adminProcedure
        .input(
          z.object({
            spotName: z.enum(["Long Beach", "Rockaway Beach", "Lido Beach"]).default("Long Beach"),
            waveHeightFt: z.number().min(1).max(15).default(5),
            periodSec: z.number().min(5).max(20).default(10),
            qualityScore: z.number().min(0).max(100).default(75),
          })
        )
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user?.email) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Admin email not found",
            });
          }

          // Look up the actual spot from the database by name
          const allSpots = await getAllSpots();
          const realSpot = allSpots.find(s => s.name === input.spotName);

          if (!realSpot) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Spot "${input.spotName}" not found in database`,
            });
          }

          // Create fake detected swell data using the real spot ID
          const now = new Date();
          const swellStartTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
          const swellEndTime = new Date(swellStartTime.getTime() + 36 * 60 * 60 * 1000); // 36 hours later

          const fakeDetectedSwell = {
            spotId: realSpot.id,
            swellStartTime,
            swellEndTime,
            peakWaveHeightFt: input.waveHeightFt,
            peakQualityScore: input.qualityScore,
            avgQualityScore: input.qualityScore,
            avgPeriodSec: input.periodSec,
            bestDay: swellStartTime,
            confidenceScore: 85,
            conditions: [
              {
                windType: "offshore" as const,
                windSpeed: 8,
                windDirection: 315,
                primarySwellDirection: 180,
                primarySwellPeriod: input.periodSec,
                primarySwellHeight: input.waveHeightFt,
              },
            ],
          };

          const fakeAlert = {
            id: 0,
            userId: ctx.user.id,
            spotId: realSpot.id,
            minWaveHeightFt: null,
            minQualityScore: 60,
            minPeriodSec: null,
            idealWindOnly: 0,
            hoursAdvanceNotice: 24,
            emailEnabled: 1,
            smsEnabled: 0,
            pushEnabled: 0,
            notificationFrequency: "immediate",
            includeConfidenceIntervals: 1,
            includeExplanation: 1,
            isActive: 1,
            lastNotifiedScore: null,
            createdAt: now,
            updatedAt: now,
          };

          // Format the notification using the real formatter and real spot data
          const notification = formatSwellAlertNotification(
            fakeDetectedSwell,
            fakeAlert,
            realSpot
          );

          // Send the test email to the admin
          const emailSent = await sendEmail({
            to: ctx.user.email,
            subject: `[TEST] ${notification.subject}`,
            html: notification.emailHtml,
            text: notification.emailText,
          });

          if (!emailSent) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to send test email",
            });
          }

          return {
            success: true,
            sentTo: ctx.user.email,
            subject: `[TEST] ${notification.subject}`,
          };
        }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
