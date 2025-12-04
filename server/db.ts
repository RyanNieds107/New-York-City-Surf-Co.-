import { eq, desc, and, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  surfSpots,
  buoyReadings,
  forecasts,
  crowdReports,
  type SurfSpot,
  type InsertSurfSpot,
  type BuoyReading,
  type InsertBuoyReading,
  type Forecast,
  type InsertForecast,
  type CrowdReport,
  type InsertCrowdReport,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
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

    const textFields = ["name", "email", "loginMethod"] as const;
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

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== SURF SPOTS ====================

export async function getAllSpots(): Promise<SurfSpot[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(surfSpots);
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
