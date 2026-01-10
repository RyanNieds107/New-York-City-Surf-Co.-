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
} from "./db";
import { getCurrentTideInfo } from "./services/tides";
import { getCurrentConditionsFromOpenMeteo } from "./services/openMeteo";
import { generateForecast, generateForecastTimeline } from "./services/forecast";
import { makeRequest, type DistanceMatrixResult, type TravelMode } from "./_core/map";
import { getSpotProfile, getSpotKey, SPOT_PROFILES } from "./utils/spotProfiles";
import { getDominantSwell, calculateBreakingWaveHeight, formatWaveHeight } from "./utils/waveHeight";
import { generateForecastOutput } from "./utils/forecastOutput";
import { forecastPoints, conditionsLog } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import { fetchBuoy44065Cached, clearBuoyCache } from "./services/buoy44065";

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
          phone: z.string().min(10).max(20),
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

        // Create user
        await upsertUser({
          openId: customOpenId,
          name: input.name,
          email: input.email.toLowerCase(),
          phone: input.phone,
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

        // Filter to only recent/future points (within max age threshold)
        const validPoints = timeline.filter((point) => {
          const pointTime = new Date(point.forecastTimestamp).getTime();
          return pointTime >= cutoffTime;
        });

        if (validPoints.length === 0) return undefined;

        // Find the point nearest to now (minimum absolute time difference)
        let nearestPoint = validPoints[0];
        let nearestPointTime = new Date(nearestPoint.forecastTimestamp).getTime();
        let nearestDiff = Math.abs(nearestPointTime - now);

        for (const point of validPoints) {
          const pointTime = new Date(point.forecastTimestamp).getTime();
          const diff = Math.abs(pointTime - now);
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
            // Check if data is stale or missing
            const isStale = await isForecastDataStale(spot.id, 0.5); // 30 minutes stale threshold
            let forecastPoints = await getForecastTimeline(spot.id, 3); // Only need 3 hours for current conditions

            // If data is stale or missing, fetch fresh data from Open-Meteo
            if (isStale || forecastPoints.length === 0) {
              const { fetchOpenMeteoForecastForSpot, convertToDbFormat } = await import("./services/openMeteo");
              const { insertForecastPoints } = await import("./db");

              try {
                // IMPORTANT: Fetch 120 hours to match getTimeline behavior
                // Previously was fetching 3 hours, which would delete full 120-hour data
                const fetchedPoints = await fetchOpenMeteoForecastForSpot(spot, { maxHoursOut: 120 });
                const dbPoints = fetchedPoints.map((point) => convertToDbFormat(point, spot.id));

                // Store in database (auto-cleanup happens inside insertForecastPoints)
                await insertForecastPoints(dbPoints);

                // Re-fetch from database after insert
                forecastPoints = await getForecastTimeline(spot.id, 3);
              } catch (error) {
                // If fetch fails, continue with existing data or empty
                console.warn(`Failed to fetch fresh data for spot ${spot.id}:`, error);
              }
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

            // Get current conditions point (nearest to now)
            const currentPoint = selectCurrentTimelinePoint(timeline);

            if (!currentPoint) {
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
          hours: z.number().min(1).max(180).default(120),
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

        return { timeline, spot };
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

        // Fetch forecast from Open-Meteo (120 hours = 5 days)
        const forecastPoints = await fetchOpenMeteoForecastForSpot(spot, { maxHoursOut: 120 });
        console.log(`[Refresh Timeline] Fetched ${forecastPoints.length} points from Open-Meteo (expected: 120)`);

        if (forecastPoints.length === 0) {
          console.error(`[Refresh Timeline] ERROR: Fetched 0 forecast points from Open-Meteo!`);
          throw new Error("Failed to fetch forecast points from Open-Meteo");
        }

        if (forecastPoints.length < 120) {
          console.warn(`[Refresh Timeline] WARNING: Expected 120 points but got ${forecastPoints.length}`);
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
      const results: Record<string, number> = {};

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

        // Calculate energy for both components to determine which is dominant
        const swellEnergy = reading.swellHeight !== null && reading.swellPeriod !== null
          ? reading.swellHeight * reading.swellHeight * reading.swellPeriod
          : 0;
        
        const windWaveEnergy = reading.windWaveHeight !== null && reading.windWavePeriod !== null
          ? reading.windWaveHeight * reading.windWaveHeight * reading.windWavePeriod
          : 0;

        // Use the height and period that correspond to the dominant energy component
        let waveHeight: number;
        let dominantPeriod: number;
        let waveDirection: number | null;

        if (windWaveEnergy > swellEnergy && reading.windWaveHeight !== null && reading.windWavePeriod !== null) {
          // Wind waves are dominant
          waveHeight = reading.windWaveHeight;
          dominantPeriod = reading.windWavePeriod;
          waveDirection = reading.windWaveDirectionDeg;
          console.log(`[Buoy Breaking Heights] ${spotName}: Using wind waves (energy: ${windWaveEnergy.toFixed(1)}) - ${waveHeight.toFixed(1)}ft @ ${dominantPeriod}s`);
        } else if (reading.swellHeight !== null && reading.swellPeriod !== null) {
          // Swell is dominant (or wind waves unavailable)
          waveHeight = reading.swellHeight;
          dominantPeriod = reading.swellPeriod;
          waveDirection = reading.swellDirectionDeg;
          console.log(`[Buoy Breaking Heights] ${spotName}: Using swell (energy: ${swellEnergy.toFixed(1)}) - ${waveHeight.toFixed(1)}ft @ ${dominantPeriod}s`);
        } else {
          console.warn(`[Buoy Breaking Heights] ${spotName}: No valid swell data available`);
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
        results[spotName] = breakingHeight;
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
        const db = getDb();
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
        const db = getDb();

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
        const db = getDb();

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
      return await getAllSwellAlertsForUser(ctx.user.id);
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

    create: protectedProcedure
      .input(
        z.object({
          spotId: z.number().nullable(),
          minWaveHeightFt: z.number().optional(),
          minQualityScore: z.number().min(0).max(100).optional(),
          minPeriodSec: z.number().optional(),
          idealWindOnly: z.boolean().optional(),
          hoursAdvanceNotice: z.number().min(1).max(168).default(24),
          emailEnabled: z.boolean().default(true),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "User must be authenticated" });
        }
        const alertId = await createSwellAlert({
          userId: ctx.user.id,
          spotId: input.spotId,
          minWaveHeightFt: input.minWaveHeightFt ? String(input.minWaveHeightFt) : null,
          minQualityScore: input.minQualityScore ?? null,
          minPeriodSec: input.minPeriodSec ?? null,
          idealWindOnly: input.idealWindOnly ? 1 : 0,
          hoursAdvanceNotice: input.hoursAdvanceNotice,
          emailEnabled: input.emailEnabled ? 1 : 1,
          pushEnabled: 0,
          isActive: 1,
        });
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
});

export type AppRouter = typeof appRouter;
