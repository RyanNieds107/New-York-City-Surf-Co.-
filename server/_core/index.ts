import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getAllSpots, getAverageCrowdLevel, insertForecast, getDb } from "../db";
import { getCurrentTideInfo } from "../services/tides";
import { generateForecast } from "../services/forecast";
import { getCurrentConditionsFromOpenMeteo } from "../services/openMeteo";

/**
 * Runs database migrations at server startup.
 * This ensures the database schema is up-to-date before accepting requests.
 */
async function runMigrations(): Promise<void> {
  console.log("[Migrations] Starting database migrations...");

  try {
    const db = await getDb();

    if (!db) {
      console.warn("[Migrations] Database connection not available - skipping migrations");
      return;
    }

    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("[Migrations] Database migrations completed successfully");
  } catch (error) {
    console.error("[Migrations] Failed to run migrations:", error);
    // Don't crash the server - log the error and continue
    // The app may still work if the schema is already up-to-date
  }
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

/**
 * Refreshes forecasts for all surf spots.
 * This function is used by both the scheduled task and the manual refresh endpoint.
 */
async function refreshAllForecasts(): Promise<void> {
  try {
    console.log("[Forecast Refresh] Starting automatic forecast refresh...");
    const spots = await getAllSpots();
    const results = { success: 0, failed: 0 };

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

        results.success++;
        console.log(`[Forecast Refresh] ✓ Updated forecast for ${spot.name}`);
      } catch (error) {
        results.failed++;
        console.error(`[Forecast Refresh] ✗ Failed to refresh forecast for spot ${spot.id} (${spot.name}):`, error);
      }
    }

    console.log(`[Forecast Refresh] Completed: ${results.success} succeeded, ${results.failed} failed`);
  } catch (error) {
    console.error("[Forecast Refresh] Error during automatic refresh:", error);
  }
}

/**
 * Sets up automatic forecast refresh on a schedule.
 */
function setupAutomaticRefresh(): void {
  // Get refresh interval from environment variable (default: 30 minutes)
  // Supports FORECAST_REFRESH_INTERVAL_MINUTES or legacy FORECAST_REFRESH_INTERVAL_HOURS
  const intervalMinutes = process.env.FORECAST_REFRESH_INTERVAL_MINUTES
    ? parseInt(process.env.FORECAST_REFRESH_INTERVAL_MINUTES, 10)
    : process.env.FORECAST_REFRESH_INTERVAL_HOURS
      ? parseInt(process.env.FORECAST_REFRESH_INTERVAL_HOURS, 10) * 60
      : 30; // Default: 30 minutes

  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`[Forecast Refresh] Automatic refresh enabled - will run every ${intervalMinutes} minute(s)`);

  // Run immediately on startup
  refreshAllForecasts().catch(console.error);

  // Set up interval to run periodically
  setInterval(() => {
    refreshAllForecasts().catch(console.error);
  }, intervalMs);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Set up automatic forecast refresh
    setupAutomaticRefresh();
  });
}

// Run migrations first, then start the server
runMigrations()
  .then(() => startServer())
  .catch(console.error);
