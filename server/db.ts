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

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  // Prioritize internal Railway URL first for better reliability
  // MYSQL_URL points to mysql.railway.internal (faster, more reliable, internal network)
  // DATABASE_URL is the external proxy (turntable.proxy.rlwy.net) which can timeout
  const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
  
  if (!_db && dbUrl) {
    try {
      // Create a connection pool with proper configuration for Railway
      // mysql2 createPool can accept a connection string as first argument with options as second
      _pool = mysql.createPool(dbUrl, {
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        // Connection timeout settings
        connectTimeout: 60000, // 60 seconds
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
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
      throw error; // Re-throw to prevent silent failures and help with debugging
    }
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
  
  await db.insert(forecastPoints).values(forecastPointsArray);
  console.log('✅ Successfully inserted', forecastPointsArray.length, 'forecast points');
  console.log(`📊 Net result: ${deletedCount} deleted → ${forecastPointsArray.length} inserted (spot ${spotId})`);
}

export async function getForecastTimeline(
  spotId: number,
  maxHoursOut: number = 180
): Promise<ForecastPoint[]> {
  const db = await getDb();
  if (!db) return [];
  
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
}

export async function getLatestModelRunTime(spotId?: number): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;
  
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
}

export async function isForecastDataStale(
  spotId: number,
  maxAgeHours: number = 6
): Promise<boolean> {
  const db = await getDb();
  if (!db) return true;
  
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  
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
  
  return result.length === 0;
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

export async function createSwellAlert(alert: InsertSwellAlert): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(swellAlerts).values({
    ...alert,
    isActive: alert.isActive ?? 1,
    emailEnabled: alert.emailEnabled ?? 1,
    pushEnabled: alert.pushEnabled ?? 0,
    idealWindOnly: alert.idealWindOnly ?? 0,
    hoursAdvanceNotice: alert.hoursAdvanceNotice ?? 24,
  });
  
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
