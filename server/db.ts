import { eq, desc, and, gte, lte, lt, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  InsertUser,
  users,
  surfSpots,
  buoyReadings,
  forecasts,
  forecastPoints,
  crowdReports,
  swellAlerts,
  swellAlertLogs,
  type SurfSpot,
  type InsertSurfSpot,
  type BuoyReading,
  type InsertBuoyReading,
  type Forecast,
  type InsertForecast,
  type ForecastPoint,
  type InsertForecastPoint,
  type CrowdReport,
  type InsertCrowdReport,
  type SwellAlert,
  type InsertSwellAlert,
  type SwellAlertLog,
  type InsertSwellAlertLog,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;
let _windGustsKtsColumnExists: boolean | null = null; // Cache column existence check

// Check if windGustsKts column exists in the database
async function checkWindGustsKtsColumnExists(): Promise<boolean> {
  if (_windGustsKtsColumnExists !== null) {
    return _windGustsKtsColumnExists; // Return cached result
  }
  
  try {
    const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
      console.warn('[checkWindGustsKtsColumnExists] No database URL, assuming column does not exist');
      _windGustsKtsColumnExists = false;
      return false;
    }
    
    const connection = await mysql.createConnection(dbUrl);
    const [rows] = await connection.execute(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'forecast_points' AND COLUMN_NAME = 'windGustsKts'`
    );
    await connection.end();
    
    const count = (rows as any[])[0]?.count ?? 0;
    _windGustsKtsColumnExists = count > 0;
    console.log(`[checkWindGustsKtsColumnExists] Column windGustsKts exists: ${_windGustsKtsColumnExists}`);
    return _windGustsKtsColumnExists;
  } catch (error: any) {
    console.warn('[checkWindGustsKtsColumnExists] Error checking column existence:', error.message);
    _windGustsKtsColumnExists = false;
    return false;
  }
}

// Retry helper for database connections during Railway startup
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  initialDelayMs: number = 2000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isConnectionError =
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('connect ETIMEDOUT');

      if (!isConnectionError || attempt === maxRetries) {
        throw error;
      }

      const delay = initialDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
      console.log(`[Database] Connection attempt ${attempt}/${maxRetries} failed (${error.code || error.message}). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  // Prioritize internal Railway URL first for better reliability
  // MYSQL_URL points to mysql.railway.internal (faster, more reliable, internal network)
  // DATABASE_URL is the external proxy (turntable.proxy.rlwy.net) which can timeout
  const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

  if (!_db && dbUrl) {
    await retryWithBackoff(async () => {
      // Create a connection pool with proper configuration for Railway
      // mysql2 createPool can accept a connection string as first argument with options as second
      _pool = mysql.createPool(dbUrl, {
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        // Connection timeout settings
        connectTimeout: 60000, // 60 seconds - allows Railway internal network to be ready
        acquireTimeout: 60000, // 60 seconds for acquiring connection from pool
      });

      // Test the connection immediately to catch connection issues early
      const testConnection = await _pool.getConnection();
      await testConnection.ping();
      testConnection.release();

      _db = drizzle(_pool);

      // Log which URL type is being used for debugging
      const urlType = dbUrl.includes('internal') || dbUrl.includes('.railway.internal')
        ? 'Internal Railway URL'
        : dbUrl.includes('proxy.rlwy.net')
          ? 'External Railway Proxy'
          : 'Custom URL';
      console.log(`[Database] Connection pool created successfully (${urlType})`);
    }, 5, 2000); // 5 retries, starting with 2 second delay
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "phone", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (user.smsOptIn !== undefined) {
      values.smsOptIn = user.smsOptIn;
      updateSet.smsOptIn = user.smsOptIn;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get user by openId:", {
      openId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Return undefined on error instead of throwing, to allow graceful degradation
    return undefined;
  }
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== SURF SPOTS ====================

export async function getAllSpots(): Promise<SurfSpot[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Get all spots, then deduplicate by name (keep the most recent one)
  const allSpots = await db.select().from(surfSpots).orderBy(desc(surfSpots.createdAt));
  
  // Create a Map to store unique spots by name (most recent wins)
  const uniqueSpotsMap = new Map<string, SurfSpot>();
  for (const spot of allSpots) {
    if (!uniqueSpotsMap.has(spot.name)) {
      uniqueSpotsMap.set(spot.name, spot);
    }
  }
  
  // Return as array, sorted by name for consistency
  return Array.from(uniqueSpotsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSpotById(id: number): Promise<SurfSpot | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(surfSpots).where(eq(surfSpots.id, id)).limit(1);
  return result[0];
}

export async function createSpot(spot: InsertSurfSpot): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(surfSpots).values(spot);
}

// ==================== BUOY READINGS ====================

export async function getLatestBuoyReading(buoyId: string): Promise<BuoyReading | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(buoyReadings)
    .where(eq(buoyReadings.buoyId, buoyId))
    .orderBy(desc(buoyReadings.timestamp))
    .limit(1);
  return result[0];
}

export async function insertBuoyReading(reading: InsertBuoyReading): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(buoyReadings).values(reading);
}

// ==================== FORECASTS ====================

export async function getLatestForecastForSpot(spotId: number): Promise<Forecast | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(forecasts)
    .where(eq(forecasts.spotId, spotId))
    .orderBy(desc(forecasts.createdAt))
    .limit(1);
  return result[0];
}

export async function getAllLatestForecasts(): Promise<Forecast[]> {
  const db = await getDb();
  if (!db) return [];
  // Get the latest forecast for each spot using a subquery
  const result = await db
    .select()
    .from(forecasts)
    .orderBy(desc(forecasts.createdAt));
  
  // Group by spotId and take the latest
  const latestBySpot = new Map<number, Forecast>();
  for (const forecast of result) {
    if (!latestBySpot.has(forecast.spotId)) {
      latestBySpot.set(forecast.spotId, forecast);
    }
  }
  return Array.from(latestBySpot.values());
}

export async function insertForecast(forecast: InsertForecast): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(forecasts).values(forecast);
}

export async function deleteForecastsBySpotId(spotId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(forecasts).where(eq(forecasts.spotId, spotId));
}

// ==================== CROWD REPORTS ====================

export async function getRecentCrowdReports(spotId: number, hoursBack: number = 4): Promise<CrowdReport[]> {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  return db
    .select()
    .from(crowdReports)
    .where(and(eq(crowdReports.spotId, spotId), gte(crowdReports.reportTime, cutoff)))
    .orderBy(desc(crowdReports.reportTime));
}

export async function getAverageCrowdLevel(spotId: number, hoursBack: number = 4): Promise<number | null> {
  const reports = await getRecentCrowdReports(spotId, hoursBack);
  if (reports.length === 0) return null;
  const sum = reports.reduce((acc, r) => acc + r.crowdLevel, 0);
  return Math.round(sum / reports.length);
}

export async function insertCrowdReport(report: InsertCrowdReport): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(crowdReports).values(report);
}

// ==================== FORECAST POINTS ====================

export async function insertForecastPoint(forecastPoint: InsertForecastPoint): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(forecastPoints).values(forecastPoint);
}

export async function insertForecastPoints(forecastPointsArray: InsertForecastPoint[]): Promise<void> {
  const db = await getDb();
  if (!db) return;
  if (forecastPointsArray.length === 0) return;
  
  // Extract spotId from first point to clean up old data
  const spotId = forecastPointsArray[0].spotId;
  
  // 🧹 MANDATORY CLEANUP: Always delete old forecast points before inserting new ones
  // This prevents accumulation of stale data (914+ points) that breaks timeline grouping
  console.log(`🧹 [Auto-Cleanup] Deleting ALL existing forecast points for spot ${spotId}...`);
  const deleteResult = await db
    .delete(forecastPoints)
    .where(eq(forecastPoints.spotId, spotId));
  
  const deletedCount = deleteResult.rowsAffected || 0;
  if (deletedCount > 0) {
    console.log(`✅ [Auto-Cleanup] Removed ${deletedCount} old forecast points for spot ${spotId}`);
  } else {
    console.log(`ℹ️ [Auto-Cleanup] No existing forecast points found for spot ${spotId}`);
  }
  
  // 💾 STEP 3: Inserting Fresh Data to Database
  const firstPoint = forecastPointsArray[0];
  console.log('💾 STEP 3: Inserting to Database');
  console.log('Total points to insert:', forecastPointsArray.length);
  console.log('ForecastPoint object sample:', JSON.stringify({
    secondarySwellHeightFt: firstPoint.secondarySwellHeightFt,
    secondarySwellPeriodS: firstPoint.secondarySwellPeriodS,
    secondarySwellDirectionDeg: firstPoint.secondarySwellDirectionDeg,
    windWaveHeightFt: firstPoint.windWaveHeightFt,
    windWavePeriodS: firstPoint.windWavePeriodS,
    windWaveDirectionDeg: firstPoint.windWaveDirectionDeg,
  }, null, 2));
  
  try {
    await db.insert(forecastPoints).values(forecastPointsArray);
    console.log('✅ Successfully inserted', forecastPointsArray.length, 'forecast points');
    console.log(`📊 Net result: ${deletedCount} deleted → ${forecastPointsArray.length} inserted (spot ${spotId})`);
  } catch (error: any) {
    // DrizzleQueryError wraps the actual MySQL error in error.cause
    const actualError = error.cause || error;
    const errorStr = JSON.stringify(error);
    
    // Check if this is a windGustsKts column error
    const isWindGustsError = 
      actualError.code === "ER_BAD_FIELD_ERROR" ||
      actualError.sqlMessage?.includes("windGustsKts") ||
      actualError.sqlMessage?.includes("Unknown column 'windGustsKts'") ||
      actualError.message?.includes("windGustsKts") ||
      error.message?.includes("windGustsKts") ||
      errorStr.includes("windGustsKts");
    
    if (isWindGustsError) {
      console.warn(`[insertForecastPoints] Schema mismatch: windGustsKts column doesn't exist. Using backward-compatible insert...`);
      
      // Use raw SQL insert without windGustsKts column
      try {
        const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
        if (!dbUrl) {
          throw new Error("Database connection URL not available for backward-compatible insert");
        }
        
        const connection = await mysql.createConnection(dbUrl);
        
        // Build INSERT statement without windGustsKts
        const columns = 'spotId, forecastTimestamp, modelRunTime, hoursOut, waveHeightFt, wavePeriodSec, waveDirectionDeg, secondarySwellHeightFt, secondarySwellPeriodS, secondarySwellDirectionDeg, tertiarySwellHeightFt, tertiarySwellPeriodS, tertiarySwellDirectionDeg, windWaveHeightFt, windWavePeriodS, windWaveDirectionDeg, windSpeedKts, windDirectionDeg, waterTempF, airTempF, source';
        const placeholders = forecastPointsArray.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const values = forecastPointsArray.flatMap(point => [
          point.spotId,
          point.forecastTimestamp,
          point.modelRunTime,
          point.hoursOut,
          point.waveHeightFt,
          point.wavePeriodSec,
          point.waveDirectionDeg,
          point.secondarySwellHeightFt,
          point.secondarySwellPeriodS,
          point.secondarySwellDirectionDeg,
          point.tertiarySwellHeightFt,
          point.tertiarySwellPeriodS,
          point.tertiarySwellDirectionDeg,
          point.windWaveHeightFt,
          point.windWavePeriodS,
          point.windWaveDirectionDeg,
          point.windSpeedKts,
          point.windDirectionDeg,
          point.waterTempF,
          point.airTempF,
          point.source,
        ]);
        
        await connection.execute(
          `INSERT INTO forecast_points (${columns}) VALUES ${placeholders}`,
          values
        );
        
        await connection.end();
        console.log('✅ Successfully inserted', forecastPointsArray.length, 'forecast points (without windGustsKts)');
        console.log(`📊 Net result: ${deletedCount} deleted → ${forecastPointsArray.length} inserted (spot ${spotId})`);
      } catch (fallbackError: any) {
        console.error(`[insertForecastPoints] Backward-compatible insert also failed:`, fallbackError);
        throw fallbackError;
      }
    } else {
      // Re-throw other errors
      throw error;
    }
  }
}

export async function getForecastTimeline(
  spotId: number,
  maxHoursOut: number = 180
): Promise<ForecastPoint[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const result = await db
      .select()
      .from(forecastPoints)
      .where(
        and(
          eq(forecastPoints.spotId, spotId),
          lte(forecastPoints.hoursOut, maxHoursOut)
        )
      )
      .orderBy(forecastPoints.forecastTimestamp);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/db.ts:363',message:'getForecastTimeline query success',data:{spotId,maxHoursOut,resultCount:result.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // 📖 STEP 4: Reading from Database
    if (result.length > 0) {
      const sample = result[0];
      console.log('📖 STEP 4: Reading from Database');
      console.log('Total points retrieved:', result.length);
      console.log('Database has secondary swell?', !!sample.secondarySwellHeightFt);
      console.log('Database has wind waves?', !!sample.windWaveHeightFt);
      console.log('Database sample:', {
        secondarySwellHeightFt: sample.secondarySwellHeightFt,
        secondarySwellPeriodS: sample.secondarySwellPeriodS,
        secondarySwellDirectionDeg: sample.secondarySwellDirectionDeg,
        windWaveHeightFt: sample.windWaveHeightFt,
        windWavePeriodS: sample.windWavePeriodS,
        windWaveDirectionDeg: sample.windWaveDirectionDeg,
      });
    } else {
      console.log('📖 STEP 4: Reading from Database - No data found');
    }
    
    return result;
  } catch (error: any) {
    // DrizzleQueryError wraps the actual MySQL error in error.cause
    const actualError = error.cause || error;
    const errorStr = JSON.stringify(error);
    
    // Check if this is a windGustsKts column error - check both error and cause
    const isWindGustsError = 
      actualError.code === "ER_BAD_FIELD_ERROR" ||
      actualError.sqlMessage?.includes("windGustsKts") ||
      actualError.sqlMessage?.includes("Unknown column 'windGustsKts'") ||
      actualError.message?.includes("windGustsKts") ||
      error.message?.includes("windGustsKts") ||
      errorStr.includes("windGustsKts");
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/db.ts:483',message:'getForecastTimeline query error',data:{spotId,maxHoursOut,errorCode:error.code,causeCode:actualError.code,errorMessage:error.message,causeMessage:actualError.message,sqlMessage:error.sqlMessage,causeSqlMessage:actualError.sqlMessage,isWindGustsError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (isWindGustsError) {
      console.warn(`[getForecastTimeline] Schema mismatch: windGustsKts column doesn't exist. Using backward-compatible query...`);
      console.warn(`[getForecastTimeline] Error details:`, actualError.message || actualError.sqlMessage || error.message);
      
      // TEMPORARY FIX: Try query without windGustsKts to allow backward compatibility
      // This allows the app to work while waiting for migration
      console.warn(`[getForecastTimeline] Attempting backward-compatible query (excluding windGustsKts)...`);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/db.ts:403',message:'Attempting backward-compatible query',data:{spotId,maxHoursOut,hasDbUrl:!!(process.env.MYSQL_URL || process.env.DATABASE_URL)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      try {
        const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
        if (!dbUrl) {
          throw new Error("Database connection URL not available for backward-compatible query");
        }
        
        // Query without selecting windGustsKts - use raw SQL with explicit column selection
        const connection = await mysql.createConnection(dbUrl);
        const [rows] = await connection.execute(
          `SELECT id, spotId, forecastTimestamp, modelRunTime, hoursOut, waveHeightFt, wavePeriodSec, waveDirectionDeg, secondarySwellHeightFt, secondarySwellPeriodS, secondarySwellDirectionDeg, tertiarySwellHeightFt, tertiarySwellPeriodS, tertiarySwellDirectionDeg, windWaveHeightFt, windWavePeriodS, windWaveDirectionDeg, windSpeedKts, windDirectionDeg, waterTempF, airTempF, source, createdAt FROM forecast_points WHERE spotId = ? AND hoursOut <= ? ORDER BY forecastTimestamp`,
          [spotId, maxHoursOut]
        );
        await connection.end();
        
        // Map results to ForecastPoint format (windGustsKts will be null)
        const backwardCompatibleResults = (rows as any[]).map(row => ({
          ...row,
          windGustsKts: null, // Column doesn't exist yet, set to null
        })) as ForecastPoint[];
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/db.ts:422',message:'Backward-compatible query succeeded',data:{spotId,maxHoursOut,resultCount:backwardCompatibleResults.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        console.log(`[getForecastTimeline] ✓ Backward-compatible query succeeded, returned ${backwardCompatibleResults.length} points`);
        return backwardCompatibleResults;
      } catch (fallbackError: any) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/db.ts:424',message:'Backward-compatible query failed',data:{spotId,maxHoursOut,errorMessage:fallbackError.message,errorCode:fallbackError.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        console.error(`[getForecastTimeline] ❌ Backward-compatible query also failed:`, fallbackError);
        throw new Error("Database schema is out of sync. The windGustsKts column is missing. Please ensure migration 0014_add_wind_gusts.sql has been applied to the database.");
      }
    }
    console.error(`[getForecastTimeline] Database query error:`, error);
    throw error;
  }
}

export async function getLatestModelRunTime(spotId?: number): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    let query = db
      .select({ modelRunTime: forecastPoints.modelRunTime })
      .from(forecastPoints)
      .orderBy(desc(forecastPoints.modelRunTime))
      .limit(1);
    
    if (spotId !== undefined) {
      query = query.where(eq(forecastPoints.spotId, spotId)) as typeof query;
    }
    
    const result = await query;
    return result.length > 0 ? result[0].modelRunTime : null;
  } catch (error: any) {
    // DrizzleQueryError wraps the actual MySQL error in error.cause
    const actualError = error.cause || error;
    const errorStr = JSON.stringify(error);
    
    // Check if this is a windGustsKts column error
    const isWindGustsError = 
      actualError.code === "ER_BAD_FIELD_ERROR" ||
      actualError.sqlMessage?.includes("windGustsKts") ||
      actualError.sqlMessage?.includes("Unknown column 'windGustsKts'") ||
      actualError.message?.includes("windGustsKts") ||
      error.message?.includes("windGustsKts") ||
      errorStr.includes("windGustsKts");
    
    if (isWindGustsError) {
      console.warn(`[getLatestModelRunTime] Schema mismatch: windGustsKts column doesn't exist. Using backward-compatible query...`);
      
      // Use raw SQL query - even column projection might fail if schema validation happens
      try {
        const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
        if (!dbUrl) {
          console.warn(`[getLatestModelRunTime] Database URL not available, returning null`);
          return null;
        }
        
        const connection = await mysql.createConnection(dbUrl);
        const sql = spotId !== undefined
          ? `SELECT modelRunTime FROM forecast_points WHERE spotId = ? ORDER BY modelRunTime DESC LIMIT 1`
          : `SELECT modelRunTime FROM forecast_points ORDER BY modelRunTime DESC LIMIT 1`;
        const params = spotId !== undefined ? [spotId] : [];
        
        const [rows] = await connection.execute(sql, params);
        await connection.end();
        
        const rowArray = rows as any[];
        return rowArray.length > 0 ? rowArray[0].modelRunTime : null;
      } catch (fallbackError: any) {
        console.error(`[getLatestModelRunTime] Backward-compatible query also failed:`, fallbackError);
        return null;
      }
    }
    
    // Re-throw other errors
    console.error(`[getLatestModelRunTime] Query error:`, error);
    throw error;
  }
}

export async function isForecastDataStale(
  spotId: number,
  maxAgeHours: number = 6
): Promise<boolean> {
  const db = await getDb();
  if (!db) return true;
  
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  
  try {
    const result = await db
      .select()
      .from(forecastPoints)
      .where(
        and(
          eq(forecastPoints.spotId, spotId),
          gte(forecastPoints.modelRunTime, cutoff)
        )
      )
      .limit(1);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/db.ts:478',message:'isForecastDataStale query success',data:{spotId,maxAgeHours,resultCount:result.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    
    return result.length === 0;
  } catch (error: any) {
    // DrizzleQueryError wraps the actual MySQL error in error.cause
    const actualError = error.cause || error;
    const errorStr = JSON.stringify(error);
    
    // Check if this is a windGustsKts column error
    const isWindGustsError = 
      actualError.code === "ER_BAD_FIELD_ERROR" ||
      actualError.sqlMessage?.includes("windGustsKts") ||
      actualError.sqlMessage?.includes("Unknown column 'windGustsKts'") ||
      actualError.message?.includes("windGustsKts") ||
      error.message?.includes("windGustsKts") ||
      errorStr.includes("windGustsKts");
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/db.ts:647',message:'isForecastDataStale query error',data:{spotId,maxAgeHours,errorCode:error.code,causeCode:actualError.code,errorMessage:error.message,causeMessage:actualError.message,sqlMessage:error.sqlMessage,causeSqlMessage:actualError.sqlMessage,isWindGustsError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    
    if (isWindGustsError) {
      console.warn(`[isForecastDataStale] Schema mismatch: windGustsKts column doesn't exist. Using backward-compatible query...`);
      
      // TEMPORARY FIX: Use raw SQL query excluding windGustsKts
      try {
        const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
        if (!dbUrl) {
          console.warn(`[isForecastDataStale] Database URL not available, assuming stale`);
          return true;
        }
        
        const connection = await mysql.createConnection(dbUrl);
        const [rows] = await connection.execute(
          `SELECT id FROM forecast_points WHERE spotId = ? AND modelRunTime >= ? LIMIT 1`,
          [spotId, cutoff]
        );
        await connection.end();
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/db.ts:510',message:'isForecastDataStale backward-compatible query succeeded',data:{spotId,maxAgeHours,resultCount:(rows as any[]).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        
        const rowArray = rows as any[];
        return rowArray.length === 0;
      } catch (fallbackError: any) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/302a4464-f7cb-4796-9974-3ea0452e20e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/db.ts:515',message:'isForecastDataStale backward-compatible query failed',data:{spotId,maxAgeHours,errorMessage:fallbackError.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        
        console.error(`[isForecastDataStale] Backward-compatible query also failed:`, fallbackError);
        // If we can't check, assume data is stale (safer to refetch)
        return true;
      }
    }
    
    // For other errors, assume data is stale (safer to refetch)
    console.error(`[isForecastDataStale] Query error:`, error);
    return true;
  }
}

export async function deleteForecastPointsBySpotAndModelRun(
  spotId: number,
  modelRunTime: Date
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .delete(forecastPoints)
    .where(
      and(
        eq(forecastPoints.spotId, spotId),
        eq(forecastPoints.modelRunTime, modelRunTime)
      )
    );
}

/**
 * Delete all forecast points for a spot older than the specified cutoff time
 * This is useful for cleaning up old forecasts during data refresh
 */
export async function deleteForecastPointsBySpotOlderThan(
  spotId: number,
  cutoffTime: Date
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .delete(forecastPoints)
    .where(
      and(
        eq(forecastPoints.spotId, spotId),
        lt(forecastPoints.modelRunTime, cutoffTime)
      )
    );
  
  return result.rowsAffected || 0;
}

/**
 * Delete ALL forecast points for a spot
 * Use this for a complete data refresh
 */
export async function deleteAllForecastPointsForSpot(
  spotId: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .delete(forecastPoints)
    .where(eq(forecastPoints.spotId, spotId));
  
  return result.rowsAffected || 0;
}

// ==================== SWELL ALERTS ====================

export async function getAllSwellAlertsForUser(userId: number): Promise<SwellAlert[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(swellAlerts)
    .where(
      and(
        eq(swellAlerts.userId, userId),
        eq(swellAlerts.isActive, 1)
      )
    )
    .orderBy(desc(swellAlerts.createdAt));
  
  return result;
}

export async function getSwellAlertById(alertId: number, userId: number): Promise<SwellAlert | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(swellAlerts)
    .where(
      and(
        eq(swellAlerts.id, alertId),
        eq(swellAlerts.userId, userId)
      )
    )
    .limit(1);
  
  return result[0];
}

export async function getAllActiveSwellAlerts(): Promise<SwellAlert[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(swellAlerts)
    .where(eq(swellAlerts.isActive, 1))
    .orderBy(desc(swellAlerts.createdAt));
  
  return result;
}

export interface SwellAlertWithUser {
  id: number;
  userId: number;
  spotId: number | null;
  minWaveHeightFt: string | null;
  minQualityScore: number | null;
  minPeriodSec: number | null;
  idealWindOnly: number;
  emailEnabled: number;
  smsEnabled: number;
  pushEnabled: number;
  hoursAdvanceNotice: number;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
  userEmail: string | null;
  userName: string | null;
  userPhone: string | null;
  userSmsOptIn: number | null;
  spotName: string | null;
}

export async function getAllSwellAlertsWithUsers(): Promise<SwellAlertWithUser[]> {
  if (!_pool) {
    await getDb(); // Initialize pool if needed
  }
  if (!_pool) return [];
  
  try {
    // Get all alerts with user info and spot info
    // Using raw SQL for the joins since drizzle-orm/mysql2 doesn't have built-in join helpers
    const query = `
      SELECT 
        sa.id,
        sa.userId,
        sa.spotId,
        sa.minWaveHeightFt,
        sa.minQualityScore,
        sa.minPeriodSec,
        sa.idealWindOnly,
        sa.emailEnabled,
        sa.smsEnabled,
        sa.pushEnabled,
        sa.hoursAdvanceNotice,
        sa.isActive,
        sa.createdAt,
        sa.updatedAt,
        u.email as userEmail,
        u.name as userName,
        u.phone as userPhone,
        u.smsOptIn as userSmsOptIn,
        sp.name as spotName
      FROM swell_alerts sa
      LEFT JOIN users u ON sa.userId = u.id
      LEFT JOIN surf_spots sp ON sa.spotId = sp.id
      ORDER BY sa.createdAt DESC
    `;
    
    const [rows] = await _pool.execute(query);
    const results = rows as unknown as any[];
    
    return results.map(row => ({
      id: row.id,
      userId: row.userId,
      spotId: row.spotId,
      minWaveHeightFt: row.minWaveHeightFt,
      minQualityScore: row.minQualityScore,
      minPeriodSec: row.minPeriodSec,
      idealWindOnly: row.idealWindOnly,
      emailEnabled: row.emailEnabled,
      smsEnabled: row.smsEnabled,
      pushEnabled: row.pushEnabled,
      hoursAdvanceNotice: row.hoursAdvanceNotice,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      userEmail: row.userEmail,
      userName: row.userName,
      userPhone: row.userPhone,
      userSmsOptIn: row.userSmsOptIn,
      spotName: row.spotName,
    }));
  } catch (error) {
    console.error("[Database] Failed to get all swell alerts with users:", error);
    return [];
  }
}

export async function createSwellAlert(alert: InsertSwellAlert): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Create an object with ONLY the data fields. 
  // Do NOT include id, createdAt, or updatedAt here.
  const valuesToInsert = {
    userId: alert.userId,
    spotId: alert.spotId ?? null,
    minWaveHeightFt: alert.minWaveHeightFt ?? null,
    minQualityScore: alert.minQualityScore ?? null,
    minPeriodSec: alert.minPeriodSec ?? null,
    idealWindOnly: alert.idealWindOnly ?? 0,
    emailEnabled: alert.emailEnabled ?? 1,
    smsEnabled: alert.smsEnabled ?? 0,
    pushEnabled: alert.pushEnabled ?? 0,
    hoursAdvanceNotice: alert.hoursAdvanceNotice ?? 24,
    daysAdvanceNotice: alert.daysAdvanceNotice ?? null,
    notificationFrequency: alert.notificationFrequency ?? 'immediate',
    includeConfidenceIntervals: alert.includeConfidenceIntervals ?? 1,
    includeExplanation: alert.includeExplanation ?? 1,
    isActive: alert.isActive ?? 1,
    lastNotifiedScore: alert.lastNotifiedScore ?? null,
  };

  const result = await db.insert(swellAlerts).values(valuesToInsert);
  
  return result.insertId;
}

export async function updateSwellAlert(
  alertId: number,
  userId: number,
  updates: Partial<InsertSwellAlert>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(swellAlerts)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(swellAlerts.id, alertId),
        eq(swellAlerts.userId, userId)
      )
    );
}

export async function deleteSwellAlert(alertId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Soft delete - set isActive to 0
  await db
    .update(swellAlerts)
    .set({
      isActive: 0,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(swellAlerts.id, alertId),
        eq(swellAlerts.userId, userId)
      )
    );
}

/**
 * Update the lastNotifiedScore for an alert (used for threshold-only notifications)
 */
export async function updateAlertLastScore(
  alertId: number,
  score: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(swellAlerts)
    .set({
      lastNotifiedScore: score,
      updatedAt: new Date(),
    })
    .where(eq(swellAlerts.id, alertId));
}

/**
 * Get count of unique users with active alerts (for waitlist counter)
 */
export async function getActiveAlertUserCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Count distinct users with active alerts
  const result = await db
    .selectDistinct({ userId: swellAlerts.userId })
    .from(swellAlerts)
    .where(eq(swellAlerts.isActive, 1));

  return result.length;
}

export async function checkIfAlertAlreadySent(
  alertId: number,
  spotId: number,
  swellStartTime: Date,
  swellEndTime: Date
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // Check if we've already sent an alert for this swell window
  // Use a 12-hour window tolerance to avoid duplicates
  const toleranceMs = 12 * 60 * 60 * 1000; // 12 hours
  const startTimeMin = new Date(swellStartTime.getTime() - toleranceMs);
  const startTimeMax = new Date(swellStartTime.getTime() + toleranceMs);
  
  const result = await db
    .select()
    .from(swellAlertLogs)
    .where(
      and(
        eq(swellAlertLogs.alertId, alertId),
        eq(swellAlertLogs.spotId, spotId),
        gte(swellAlertLogs.swellStartTime, startTimeMin),
        lte(swellAlertLogs.swellStartTime, startTimeMax)
      )
    )
    .limit(1);
  
  return result.length > 0;
}

export async function logSwellAlertSent(alertLog: InsertSwellAlertLog): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(swellAlertLogs).values({
    ...alertLog,
    emailSent: alertLog.emailSent ?? 0,
    pushSent: alertLog.pushSent ?? 0,
  });
  
  return result.insertId;
}

export async function updateSwellAlertLogEmailSent(
  logId: number,
  sentAt?: Date
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(swellAlertLogs)
    .set({
      emailSent: 1,
      emailSentAt: sentAt || new Date(),
    })
    .where(eq(swellAlertLogs.id, logId));
}

export async function updateSwellAlertLogSmsSent(
  logId: number,
  sentAt?: Date
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(swellAlertLogs)
    .set({
      smsSent: 1,
      smsSentAt: sentAt || new Date(),
    })
    .where(eq(swellAlertLogs.id, logId));
}
