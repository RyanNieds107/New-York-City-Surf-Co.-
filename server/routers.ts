import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAllSpots,
  getSpotById,
  createSpot,
  getLatestBuoyReading,
  insertBuoyReading,
  getLatestForecastForSpot,
  getAllLatestForecasts,
  insertForecast,
  getRecentCrowdReports,
  getAverageCrowdLevel,
  insertCrowdReport,
  getForecastTimeline,
} from "./db";
import { fetchLatestBuoyReading } from "./services/ndbc";
import { getCurrentTideInfo } from "./services/tides";
import { generateForecast, generateForecastTimeline } from "./services/forecast";
import { makeRequest, type DistanceMatrixResult, type TravelMode } from "./_core/map";
import { getSpotProfile, SPOT_PROFILES } from "./utils/spotProfiles";
import { getDominantSwell, calculateBreakingWaveHeight, formatWaveHeight, getPeriodMultiplier } from "./utils/waveHeight";
import { generateForecastOutput } from "./utils/forecastOutput";
import { forecastPoints } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
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
  }),

  // ==================== FORECASTS ROUTER ====================
  forecasts: router({
    // Get the latest forecast for a specific spot
    getForSpot: publicProcedure.input(z.object({ spotId: z.number() })).query(async ({ input }) => {
      const forecast = await getLatestForecastForSpot(input.spotId);
      const spot = await getSpotById(input.spotId);
      
      // Get latest buoy reading for period and direction data
      let buoyReading = null;
      if (spot) {
        buoyReading = await getLatestBuoyReading(spot.buoyId);
      }
      
      return { forecast, spot, buoyReading };
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

    // Refresh forecast for a spot (fetches fresh data and generates new forecast)
    refresh: publicProcedure.input(z.object({ spotId: z.number() })).mutation(async ({ input }) => {
      const spot = await getSpotById(input.spotId);
      if (!spot) {
        throw new Error("Spot not found");
      }

      // Fetch fresh buoy data
      const ndbcReading = await fetchLatestBuoyReading(spot.buoyId);
      if (ndbcReading) {
        await insertBuoyReading({
          buoyId: ndbcReading.buoyId,
          timestamp: ndbcReading.timestamp,
          waveHeightCm: ndbcReading.waveHeightCm,
          dominantPeriodDs: ndbcReading.dominantPeriodDs,
          swellDirectionDeg: ndbcReading.swellDirectionDeg,
          windSpeedCmps: ndbcReading.windSpeedCmps,
          windDirectionDeg: ndbcReading.windDirectionDeg,
        });
      }

      // Get tide info
      const tideInfo = await getCurrentTideInfo(spot.tideStationId);

      // Get average crowd level
      const avgCrowdLevel = await getAverageCrowdLevel(spot.id);

      // Get the latest buoy reading from DB (may be the one we just inserted or an older one)
      const buoyReading = await getLatestBuoyReading(spot.buoyId);

      // Generate forecast
      const forecastResult = generateForecast({
        spot,
        buoyReading: buoyReading || null,
        tideInfo,
        avgCrowdLevel,
      });

      // Save forecast
      await insertForecast({
        spotId: spot.id,
        forecastTime: new Date(),
        probabilityScore: forecastResult.probabilityScore,
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
        buoyDataFresh: !!ndbcReading,
      };
    }),

    // Refresh all spots
    refreshAll: publicProcedure.mutation(async () => {
      const spots = await getAllSpots();
      const results = [];

      for (const spot of spots) {
        try {
          // Fetch fresh buoy data
          const ndbcReading = await fetchLatestBuoyReading(spot.buoyId);
          if (ndbcReading) {
            await insertBuoyReading({
              buoyId: ndbcReading.buoyId,
              timestamp: ndbcReading.timestamp,
              waveHeightCm: ndbcReading.waveHeightCm,
              dominantPeriodDs: ndbcReading.dominantPeriodDs,
              swellDirectionDeg: ndbcReading.swellDirectionDeg,
              windSpeedCmps: ndbcReading.windSpeedCmps,
              windDirectionDeg: ndbcReading.windDirectionDeg,
            });
          }

          // Get tide info
          const tideInfo = await getCurrentTideInfo(spot.tideStationId);

          // Get average crowd level
          const avgCrowdLevel = await getAverageCrowdLevel(spot.id);

          // Get the latest buoy reading from DB
          const buoyReading = await getLatestBuoyReading(spot.buoyId);

          // Generate forecast
          const forecastResult = generateForecast({
            spot,
            buoyReading: buoyReading || null,
            tideInfo,
            avgCrowdLevel,
          });

          // Save forecast
          await insertForecast({
            spotId: spot.id,
            forecastTime: new Date(),
            probabilityScore: forecastResult.probabilityScore,
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
          hours: z.number().min(1).max(180).default(72),
        })
      )
      .query(async ({ input }) => {
        const spot = await getSpotById(input.spotId);
        if (!spot) {
          throw new Error("Spot not found");
        }

        // Check if data is stale or missing
        const { isForecastDataStale } = await import("./db");
        const isStale = await isForecastDataStale(input.spotId, 6); // 6 hours stale threshold
        let forecastPoints = await getForecastTimeline(input.spotId, input.hours);

        // If data is stale or missing, fetch fresh data from Open-Meteo
        if (isStale || forecastPoints.length === 0) {
          console.log(`[Forecasts Router] Data for spot ${input.spotId} is stale or missing, fetching from Open-Meteo...`);
          const { fetchOpenMeteoForecastForSpot, convertToDbFormat } = await import("./services/openMeteo");
          const { insertForecastPoints, deleteForecastPointsBySpotAndModelRun } = await import("./db");

          try {
            const fetchedPoints = await fetchOpenMeteoForecastForSpot(spot, { maxHoursOut: input.hours });
            console.log('Converting', fetchedPoints.length, 'points to database format...');
            const dbPoints = fetchedPoints.map((point) => convertToDbFormat(point, spot.id));
            if (dbPoints.length > 0) {
              console.log('Converted sample:', {
                secondarySwellHeightFt: dbPoints[0].secondarySwellHeightFt,
                windWaveHeightFt: dbPoints[0].windWaveHeightFt,
              });
            }

            // Delete old forecast points (older than 1 hour) to avoid duplicates
            const cutoffTime = new Date(Date.now() - 60 * 60 * 1000);
            await deleteForecastPointsBySpotAndModelRun(spot.id, cutoffTime);

            // Store in database
            await insertForecastPoints(dbPoints);

            // Re-fetch from database after insert
            forecastPoints = await getForecastTimeline(input.spotId, input.hours);
          } catch (error: any) {
            const status = error.response?.status;
            const statusMessage = status ? ` (${status})` : '';
            throw new TRPCError({
              code: status === 400 ? "BAD_REQUEST" : status === 404 ? "NOT_FOUND" : status >= 500 ? "INTERNAL_SERVER_ERROR" : "INTERNAL_SERVER_ERROR",
              message: `Open-Meteo API request failed${statusMessage}`,
            });
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
        const { insertForecastPoints, deleteForecastPointsBySpotAndModelRun } = await import("./db");

        // Fetch forecast from Open-Meteo (7 days = 168 hours)
        const forecastPoints = await fetchOpenMeteoForecastForSpot(spot, { maxHoursOut: 168 });

        // Convert to database format
        console.log('Converting', forecastPoints.length, 'points to database format...');
        const dbPoints = forecastPoints.map((point) => convertToDbFormat(point, spot.id));
        if (dbPoints.length > 0) {
          console.log('Converted sample:', {
            secondarySwellHeightFt: dbPoints[0].secondarySwellHeightFt,
            windWaveHeightFt: dbPoints[0].windWaveHeightFt,
          });
        }

        // Delete old forecast points for this spot/model run to avoid duplicates
        // Since Open-Meteo uses current time as model run time, we'll delete points older than 1 hour
        const cutoffTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
        await deleteForecastPointsBySpotAndModelRun(spot.id, cutoffTime);

        // Store in database
        await insertForecastPoints(dbPoints);

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
        try {
          const result = await makeRequest<DistanceMatrixResult>(
            "/maps/api/distancematrix/json",
            {
              origins: input.origin,
              destinations: input.destination,
              mode: input.mode,
              units: "imperial",
            }
          );

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
  }),
});

export type AppRouter = typeof appRouter;
