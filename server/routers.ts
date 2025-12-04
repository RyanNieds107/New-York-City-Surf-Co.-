import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
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
} from "./db";
import { fetchLatestBuoyReading } from "./services/ndbc";
import { getCurrentTideInfo } from "./services/tides";
import { generateForecast } from "./services/forecast";

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
      return { forecast, spot };
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
});

export type AppRouter = typeof appRouter;
