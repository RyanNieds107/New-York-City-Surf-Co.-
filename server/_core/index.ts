import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { registerOAuthRoutes } from "./oauth";
import { registerGoogleOAuthRoutes } from "./googleOAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getAllSpots, getAverageCrowdLevel, insertForecast, getDb } from "../db";
import { getCurrentTideInfo } from "../layers/environmental/clients/tides";
import { generateForecast } from "../services/forecast";
import { getCurrentConditionsFromOpenMeteo } from "../layers/environmental/clients/openmeteo";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Tests database connection with retry logic
 */
async function testDatabaseConnection(dbUrl: string, maxRetries: number = 5): Promise<mysql.Connection | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Database] Connection attempt ${attempt}/${maxRetries}...`);
      const connection = await mysql.createConnection({
        uri: dbUrl,
        connectTimeout: 60000, // 60 seconds
      });
      await connection.ping();
      console.log(`[Database] ✓ Connection established on attempt ${attempt}`);
      return connection;
    } catch (error: any) {
      console.error(`[Database] Connection attempt ${attempt} failed: ${error.code || error.message}`);
      if (attempt < maxRetries) {
        const delay = 2000 * Math.pow(2, attempt - 1); // Exponential backoff: 2s, 4s, 8s, 16s, 32s
        console.log(`[Database] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return null;
}

/**
 * Runs database migrations at server startup.
 * This ensures the database schema is up-to-date before accepting requests.
 */
async function runMigrations(): Promise<void> {
  console.log("[Migrations] Starting database migrations...");
  console.log(`[Server] PORT env: ${process.env.PORT || '(not set, using 3000)'}`);

  // DEBUG: Log what database variables we actually have (mask password)
  const mysqlUrl = process.env.MYSQL_URL || '';
  const dbUrlEnv = process.env.DATABASE_URL || '';
  const maskPassword = (url: string) => url.replace(/(:)([^@]+)(@)/, '$1****$3');
  console.log(`[DEBUG] MYSQL_URL: ${mysqlUrl ? maskPassword(mysqlUrl) : '(not set)'}`);
  console.log(`[DEBUG] DATABASE_URL: ${dbUrlEnv ? maskPassword(dbUrlEnv) : '(not set)'}`);
  console.log(`[DEBUG] NODE_ENV: ${process.env.NODE_ENV}`);

  try {
    // Prioritize internal Railway URL first for better reliability
    // MYSQL_URL points to mysql.railway.internal (internal network, faster)
    // DATABASE_URL is the external proxy which can timeout
    const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

    if (!dbUrl) {
      console.error("[Migrations] ❌ No database connection URL found!");
      console.error("[Migrations] Check: MYSQL_URL or DATABASE_URL");
      console.log("[Migrations] Skipping migrations - server will start without database");
      return; // Don't throw, just skip migrations
    }

    // Log which URL type is being used
    const urlType = dbUrl.includes('internal') || dbUrl.includes('.railway.internal')
      ? 'Internal Railway URL'
      : dbUrl.includes('proxy.rlwy.net')
        ? 'External Railway Proxy'
        : 'Custom URL';
    console.log(`[Migrations] Using: ${urlType}`);

    // Pre-flight delay: Wait 5 seconds to ensure Railway internal network is fully resolved
    console.log(`[Migrations] Pre-flight check: waiting 5 seconds for network initialization...`);
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test database connection first before running migrations
    const connection = await testDatabaseConnection(dbUrl, 5);

    if (!connection) {
      console.error("[Migrations] ❌ Could not establish database connection after retries");
      console.log("[Migrations] Skipping migrations - server will start without running migrations");
      return; // Don't crash, just skip migrations
    }

    // Connection successful - now run migrations
    try {
      const migrationsDir = join(__dirname, "..", "..", "drizzle");
      const files = readdirSync(migrationsDir)
        .filter(f => f.endsWith(".sql"))
        .sort();

      console.log(`[Migrations] Found ${files.length} migration files, executing directly...`);

      let executed = 0;
      let skipped = 0;

      for (const file of files) {
        const filePath = join(migrationsDir, file);
        const sql = readFileSync(filePath, "utf-8");
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/_core/index.ts:66',message:'Processing migration file',data:{fileName:file},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
        // #endregion
        
        const statements = sql.split("--> statement-breakpoint").filter(s => s.trim().length > 0);
        
        for (const statement of statements) {
          // Extract SQL statements, removing comment lines but keeping actual SQL
          const sqlLines = statement.split('\n').filter(line => {
            const cleanLine = line.trim();
            return cleanLine && !cleanLine.startsWith('--') && cleanLine !== '--> statement-breakpoint';
          });
          const actualSQL = sqlLines.join('\n').trim();
          
          if (actualSQL) {
            try {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/_core/index.ts:81',message:'Executing migration SQL',data:{fileName:file,sqlPreview:actualSQL.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
              // #endregion
              
              await connection.execute(actualSQL);
              executed++;
              console.log(`[Migrations] ✓ Executed migration from ${file}`);
              
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/_core/index.ts:83',message:'Migration executed successfully',data:{fileName:file},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
              // #endregion
            } catch (error: any) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/_core/index.ts:85',message:'Migration execution error',data:{fileName:file,errorCode:error.code,errorMessage:error.message,sqlMessage:error.sqlMessage,isDuplicateColumn:error.code === "ER_DUP_FIELDNAME" || error.message?.includes("Duplicate column")},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
              // #endregion
              
              if (error.code === "ER_TABLE_EXISTS_ERROR" || 
                  error.code === "ER_DUP_FIELDNAME" || 
                  error.message?.includes("already exists") || 
                  error.message?.includes("Duplicate column name") || 
                  error.message?.includes("Duplicate column") ||
                  error.sqlMessage?.includes("Duplicate column")) {
                skipped++;
                console.log(`[Migrations] ⊘ Skipped (already applied): ${file} - ${error.message}`);
              } else {
                console.warn(`[Migrations] ⚠️ Warning in ${file}: ${error.message}`);
                // Don't throw - continue with other migrations
              }
            }
          }
        }
      }

      await connection.end();
      console.log(`[Migrations] Database migrations completed: ${executed} executed, ${skipped} skipped`);
    } catch (error: any) {
      console.warn("[Migrations] Direct SQL execution failed, trying drizzle migrate:", error.message);
      // Fallback to drizzle migrate
      const db = await getDb();
      if (db) {
        await migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });
        console.log("[Migrations] Database migrations completed successfully (via drizzle)");
      }
    }
  } catch (error) {
    console.error("[Migrations] Failed to run migrations:", error);
    // Don't crash the server - log the error and continue
    // The app may still work if the schema is already up-to-date
  }
}

/**
 * Refreshes forecasts for all surf spots.
 * This function is used by both the scheduled task and the manual refresh endpoint.
 */
async function refreshAllForecasts(): Promise<void> {
  try {
    console.log("[Forecast Refresh] Starting automatic forecast refresh...");
    
    // Check database connection first
    const db = await getDb();
    if (!db) {
      console.warn("[Forecast Refresh] Database not available - skipping refresh");
      return;
    }
    
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

/**
 * Sets up automatic swell alert checking on a schedule.
 */
function setupSwellAlertChecking(): void {
  // Get check interval from environment variable (default: 6 hours)
  const intervalHours = process.env.SWELL_ALERT_CHECK_INTERVAL_HOURS
    ? parseInt(process.env.SWELL_ALERT_CHECK_INTERVAL_HOURS, 10)
    : 6;

  const intervalMs = intervalHours * 60 * 60 * 1000;

  console.log(`[Swell Alerts] Automatic checking enabled - will run every ${intervalHours} hour(s)`);

  // Import the check function dynamically
  import("../jobs/checkSwellAlerts").then(({ checkSwellAlerts }) => {
    // Run immediately on startup (after a short delay to let forecasts load)
    setTimeout(() => {
      console.log("[Swell Alerts] Running first check (after 5-minute startup delay)");
      checkSwellAlerts().catch(console.error);
    }, 5 * 60 * 1000); // Wait 5 minutes for forecasts to refresh

    // Set up interval to run periodically
    setInterval(() => {
      console.log(`[Swell Alerts] Running periodic check (every ${intervalHours} hours)`);
      checkSwellAlerts().catch(console.error);
    }, intervalMs);
  }).catch((error) => {
    console.error("[Swell Alerts] Failed to load alert checking module:", error);
  });
}

// ==================== REPORT PROMPTS JOB ====================
// Send "How was your session?" emails 24 hours after forecast views
const reportPromptsEnabled = process.env.REPORT_PROMPTS_ENABLED !== "false"; // Default: enabled

if (reportPromptsEnabled) {
  console.log("[Report Prompts] Automatic checking enabled - will run every hour");

  // Import the job function dynamically
  import("../jobs/sendReportPrompts").then(({ sendReportPrompts }) => {
    // Run immediately on startup (after a short delay)
    setTimeout(() => {
      sendReportPrompts().catch(console.error);
    }, 2 * 60 * 1000); // Wait 2 minutes after startup

    // Set up interval to run every hour
    setInterval(() => {
      sendReportPrompts().catch(console.error);
    }, 60 * 60 * 1000); // Every hour
  }).catch((error) => {
    console.error("[Report Prompts] Failed to load report prompts module:", error);
  });
} else {
  console.log("[Report Prompts] Automatic checking disabled (set REPORT_PROMPTS_ENABLED=true to enable)");
}

/**
 * Gets the current hour in Eastern Time (ET).
 */
function getEasternTimeHour(): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false,
  });
  return parseInt(formatter.format(new Date()), 10);
}

/**
 * Calculates milliseconds until the next target hour in Eastern Time.
 * @param targetHour - Hour in 24h format (e.g., 7 for 7 AM, 19 for 7 PM)
 */
function msUntilNextETHour(targetHour: number): number {
  const now = new Date();

  // Get current time in ET
  const etFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const etParts = etFormatter.formatToParts(now);
  const getPart = (type: string) => etParts.find(p => p.type === type)?.value || '0';

  const etHour = parseInt(getPart('hour'), 10);
  const etMinute = parseInt(getPart('minute'), 10);
  const etSecond = parseInt(getPart('second'), 10);

  // Calculate hours until target
  let hoursUntil = targetHour - etHour;
  if (hoursUntil <= 0) {
    hoursUntil += 24; // Next day
  }

  // Convert to milliseconds, accounting for current minutes/seconds
  const msUntil = (hoursUntil * 60 * 60 * 1000)
    - (etMinute * 60 * 1000)
    - (etSecond * 1000);

  return msUntil;
}

/**
 * Sets up automatic Stormglass ECMWF verification data fetching.
 * Runs twice daily at 7 AM and 7 PM ET to stay within free tier quota.
 * Uses 6 API calls/day (3 spots × 2 syncs), leaving 4 spare.
 */
function setupStormglassVerification(): void {
  const MORNING_HOUR = 7;  // 7 AM ET
  const EVENING_HOUR = 19; // 7 PM ET

  console.log(`[Stormglass Verification] Scheduled for 7 AM + 7 PM ET daily`);

  // Import the fetch function dynamically
  import("../jobs/fetchStormglassVerification").then(({ fetchStormglassVerification }) => {

    // Schedule next morning sync
    const scheduleMorningSync = () => {
      const msUntilMorning = msUntilNextETHour(MORNING_HOUR);
      console.log(`[Stormglass Verification] Next morning sync in ${(msUntilMorning / 1000 / 60 / 60).toFixed(1)} hours`);

      setTimeout(() => {
        console.log(`[Stormglass Verification] Running 7 AM ET sync...`);
        fetchStormglassVerification().catch(console.error);
        // Schedule next morning sync (24 hours later)
        setTimeout(scheduleMorningSync, 1000); // Small delay before rescheduling
      }, msUntilMorning);
    };

    // Schedule next evening sync
    const scheduleEveningSync = () => {
      const msUntilEvening = msUntilNextETHour(EVENING_HOUR);
      console.log(`[Stormglass Verification] Next evening sync in ${(msUntilEvening / 1000 / 60 / 60).toFixed(1)} hours`);

      setTimeout(() => {
        console.log(`[Stormglass Verification] Running 7 PM ET sync...`);
        fetchStormglassVerification().catch(console.error);
        // Schedule next evening sync (24 hours later)
        setTimeout(scheduleEveningSync, 1000); // Small delay before rescheduling
      }, msUntilEvening);
    };

    // Start both schedules
    scheduleMorningSync();
    scheduleEveningSync();

    // Do NOT run on startup: with 10 calls/day quota, restarts/deploys during 7–8 or 19–20 ET
    // would burn extra calls and cause "quota exceeded". Rely only on scheduled 7 AM / 7 PM runs.

  }).catch((error) => {
    console.error("[Stormglass Verification] Failed to load module:", error);
  });
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Google OAuth routes
  registerGoogleOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Sitemap endpoint for Google Search Console - must be before static middleware
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const spots = await getAllSpots();
      // Remove trailing slash from baseUrl if present
      const baseUrl = (process.env.BASE_URL || process.env.PUBLIC_URL || "https://www.nycsurfco.com").replace(/\/$/, "");
      const today = new Date().toISOString().split("T")[0];
      
      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/dashboard</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/surf-analysis</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;

      // Add all spot pages
      for (const spot of spots) {
        sitemap += `
  <url>
    <loc>${baseUrl}/spot/${spot.id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }

      sitemap += `
</urlset>`;

      res.setHeader("Content-Type", "application/xml");
      res.send(sitemap);
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).setHeader("Content-Type", "text/plain").send("Error generating sitemap");
    }
  });
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use Railway's PORT or default to 3000
  const port = parseInt(process.env.PORT || "3000", 10);

  console.log(`[Server] Starting server...`);
  console.log(`[Server] PORT from env: ${process.env.PORT || '(not set)'}`);
  console.log(`[Server] Using port: ${port}`);

  // Listen on 0.0.0.0 to accept connections from any interface (required for Railway/Docker)
  server.listen(port, "0.0.0.0", () => {
    console.log(`[Server] ✓ Server running on http://0.0.0.0:${port}/`);

    // Set up automatic forecast refresh
    setupAutomaticRefresh();

    // Set up automatic swell alert checking
    setupSwellAlertChecking();

    // Set up Stormglass ECMWF verification fetching
    setupStormglassVerification();
  });

  server.on("error", (error: any) => {
    if (error.code === "EADDRINUSE") {
      console.error(`[Server] ❌ Port ${port} is already in use!`);
      console.error(`[Server] Make sure no other service is using this port.`);
    } else {
      console.error(`[Server] ❌ Server error:`, error);
    }
    process.exit(1);
  });
}

// Run migrations first, then start the server
runMigrations()
  .then(() => startServer())
  .catch(console.error);
