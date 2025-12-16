import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Surf Spots Table
export const surfSpots = mysqlTable("surf_spots", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  latitude: varchar("latitude", { length: 32 }).notNull(),
  longitude: varchar("longitude", { length: 32 }).notNull(),
  buoyId: varchar("buoyId", { length: 16 }).notNull(),
  tideStationId: varchar("tideStationId", { length: 16 }).notNull(),
  bathymetryFactor: int("bathymetryFactor").notNull().default(5), // 1-10 scale
  idealSwellDirMin: int("idealSwellDirMin").notNull().default(90), // degrees
  idealSwellDirMax: int("idealSwellDirMax").notNull().default(180), // degrees
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SurfSpot = typeof surfSpots.$inferSelect;
export type InsertSurfSpot = typeof surfSpots.$inferInsert;

// Buoy Readings Table (raw data from NDBC)
export const buoyReadings = mysqlTable("buoy_readings", {
  id: int("id").autoincrement().primaryKey(),
  buoyId: varchar("buoyId", { length: 16 }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  waveHeightCm: int("waveHeightCm"), // significant wave height in cm
  dominantPeriodDs: int("dominantPeriodDs"), // dominant period in deciseconds (tenths of seconds)
  swellDirectionDeg: int("swellDirectionDeg"), // mean wave direction in degrees
  windSpeedCmps: int("windSpeedCmps"), // wind speed in cm/s
  windDirectionDeg: int("windDirectionDeg"), // wind direction in degrees
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BuoyReading = typeof buoyReadings.$inferSelect;
export type InsertBuoyReading = typeof buoyReadings.$inferInsert;

// Forecasts Table (model output)
export const forecasts = mysqlTable("forecasts", {
  id: int("id").autoincrement().primaryKey(),
  spotId: int("spotId").notNull(),
  forecastTime: timestamp("forecastTime").notNull(),
  probabilityScore: int("probabilityScore").notNull(), // 0-100
  waveHeightTenthsFt: int("waveHeightTenthsFt").notNull(), // wave height in tenths of feet
  confidenceBand: varchar("confidenceBand", { length: 16 }).notNull(), // Low, Medium, High
  usabilityIntermediate: int("usabilityIntermediate").notNull(), // 0-100
  usabilityAdvanced: int("usabilityAdvanced").notNull(), // 0-100
  // Wind data
  windSpeedMph: int("windSpeedMph"), // wind speed in mph
  windDirectionDeg: int("windDirectionDeg"), // wind direction in degrees
  windType: varchar("windType", { length: 16 }), // offshore, onshore, cross
  // Tide data
  tideHeightFt: int("tideHeightFt"), // current tide height in tenths of feet
  tidePhase: varchar("tidePhase", { length: 16 }), // rising, falling, high, low
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Forecast = typeof forecasts.$inferSelect;
export type InsertForecast = typeof forecasts.$inferInsert;

// Forecast Points Table (NOMADS time-series forecast data)
export const forecastPoints = mysqlTable("forecast_points", {
  id: int("id").autoincrement().primaryKey(),
  spotId: int("spotId").notNull(),
  forecastTimestamp: timestamp("forecastTimestamp").notNull(), // when this forecast is for
  modelRunTime: timestamp("modelRunTime").notNull(), // when WW3 model ran (00z, 06z, 12z, 18z)
  hoursOut: int("hoursOut").notNull(), // hours from model run time
  // Primary swell (backward compatibility - stored as integer tenths of feet)
  waveHeightFt: int("waveHeightFt"), // feet in tenths (from WW3/Open-Meteo)
  wavePeriodSec: int("wavePeriodSec"), // seconds
  waveDirectionDeg: int("waveDirectionDeg"), // degrees
  // Secondary swell (NEW - stored as decimal feet)
  secondarySwellHeightFt: decimal("secondarySwellHeightFt", { precision: 4, scale: 1 }),
  secondarySwellPeriodS: int("secondarySwellPeriodS"), // seconds
  secondarySwellDirectionDeg: int("secondarySwellDirectionDeg"), // degrees
  // Wind waves (NEW - stored as decimal feet)
  windWaveHeightFt: decimal("windWaveHeightFt", { precision: 4, scale: 1 }),
  windWavePeriodS: int("windWavePeriodS"), // seconds
  windWaveDirectionDeg: int("windWaveDirectionDeg"), // degrees
  // Wind data
  windSpeedKts: int("windSpeedKts"), // knots
  windDirectionDeg: int("windDirectionDeg"), // degrees
  source: mysqlEnum("source", ["ww3", "gfs", "hrrr", "openmeteo"]).default("ww3").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ForecastPoint = typeof forecastPoints.$inferSelect;
export type InsertForecastPoint = typeof forecastPoints.$inferInsert;

// Crowd Reports Table (user-submitted data)
export const crowdReports = mysqlTable("crowd_reports", {
  id: int("id").autoincrement().primaryKey(),
  spotId: int("spotId").notNull(),
  userId: int("userId").notNull(),
  reportTime: timestamp("reportTime").notNull(),
  crowdLevel: int("crowdLevel").notNull(), // 1-5 scale
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CrowdReport = typeof crowdReports.$inferSelect;
export type InsertCrowdReport = typeof crowdReports.$inferInsert;