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
  phone: varchar("phone", { length: 20 }), // Phone number for sign-up
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
  probabilityScore: int("probabilityScore").notNull(), // 0-100 (legacy score)
  qualityScore: int("qualityScore"), // 0-100 (new algorithm score, nullable for backward compatibility)
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
  // Tertiary swell (third swell component - only from GFS wave models)
  tertiarySwellHeightFt: decimal("tertiarySwellHeightFt", { precision: 4, scale: 1 }),
  tertiarySwellPeriodS: int("tertiarySwellPeriodS"), // seconds
  tertiarySwellDirectionDeg: int("tertiarySwellDirectionDeg"), // degrees
  // Wind waves (NEW - stored as decimal feet)
  windWaveHeightFt: decimal("windWaveHeightFt", { precision: 4, scale: 1 }),
  windWavePeriodS: int("windWavePeriodS"), // seconds
  windWaveDirectionDeg: int("windWaveDirectionDeg"), // degrees
  // Wind data
  windSpeedKts: int("windSpeedKts"), // knots
  windDirectionDeg: int("windDirectionDeg"), // degrees
  // Temperature data (NEW)
  waterTempF: decimal("waterTempF", { precision: 4, scale: 1 }), // Fahrenheit
  airTempF: decimal("airTempF", { precision: 4, scale: 1 }), // Fahrenheit
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

// Conditions Log Table (historical snapshots for pattern matching)
// Records condition states at regular intervals for ML/pattern analysis
export const conditionsLog = mysqlTable("conditions_log", {
  id: int("id").autoincrement().primaryKey(),
  timestamp: timestamp("timestamp").notNull(),
  // Best spot data at this moment
  bestSpotName: varchar("bestSpotName", { length: 64 }),
  qualityScore: int("qualityScore"), // 0-100
  // Wave conditions
  waveHeightFt: decimal("waveHeightFt", { precision: 4, scale: 1 }), // breaking wave height
  wavePeriodSec: int("wavePeriodSec"),
  waveDirectionDeg: int("waveDirectionDeg"),
  // Wind conditions
  windSpeedMph: int("windSpeedMph"),
  windDirectionDeg: int("windDirectionDeg"),
  windType: varchar("windType", { length: 16 }), // offshore, onshore, cross
  // Buoy data (raw from NOAA 44065)
  buoyWaveHeightFt: decimal("buoyWaveHeightFt", { precision: 4, scale: 1 }),
  buoyPeriodSec: int("buoyPeriodSec"),
  buoyDirectionDeg: int("buoyDirectionDeg"),
  // Condition classification
  isSurfable: int("isSurfable").notNull().default(0), // 0 = not surfable, 1 = surfable
  unsurfableReason: varchar("unsurfableReason", { length: 32 }), // flat, blown_out, choppy, too_windy, cross_shore, too_small, wind_swell, poor
  // Metadata for pattern matching
  dayOfWeek: int("dayOfWeek"), // 0 = Sunday, 6 = Saturday
  hourOfDay: int("hourOfDay"), // 0-23
  month: int("month"), // 1-12
  // Tide data
  tideHeightFt: decimal("tideHeightFt", { precision: 4, scale: 1 }),
  tidePhase: varchar("tidePhase", { length: 16 }), // rising, falling, high, low
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConditionsLog = typeof conditionsLog.$inferSelect;
export type InsertConditionsLog = typeof conditionsLog.$inferInsert;

// Swell Alerts Table (user alert preferences)
export const swellAlerts = mysqlTable("swell_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK to users.id
  spotId: int("spotId"), // FK to surf_spots.id (NULL = all spots)
  // Alert criteria
  minWaveHeightFt: decimal("minWaveHeightFt", { precision: 4, scale: 1 }), // e.g., 3.0ft
  minQualityScore: int("minQualityScore"), // e.g., 60 (Go Surf or better)
  minPeriodSec: int("minPeriodSec"), // e.g., 8s minimum period
  idealWindOnly: int("idealWindOnly").default(0), // 0 = any wind, 1 = offshore/cross-offshore only
  // Notification preferences
  emailEnabled: int("emailEnabled").default(1), // 0/1 boolean
  pushEnabled: int("pushEnabled").default(0), // 0/1 boolean (future: web push)
  // Alert timing
  hoursAdvanceNotice: int("hoursAdvanceNotice").default(24), // Alert X hours before swell arrives
  // Status
  isActive: int("isActive").default(1), // 0/1 boolean
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SwellAlert = typeof swellAlerts.$inferSelect;
export type InsertSwellAlert = typeof swellAlerts.$inferInsert;

// Swell Alert Logs Table (prevent duplicate notifications)
export const swellAlertLogs = mysqlTable("swell_alert_logs", {
  id: int("id").autoincrement().primaryKey(),
  alertId: int("alertId").notNull(), // FK to swell_alerts.id
  userId: int("userId").notNull(), // FK to users.id
  spotId: int("spotId").notNull(), // FK to surf_spots.id
  // When the swell is expected
  swellStartTime: timestamp("swellStartTime").notNull(),
  swellEndTime: timestamp("swellEndTime").notNull(),
  // Conditions that triggered the alert
  peakWaveHeightFt: decimal("peakWaveHeightFt", { precision: 4, scale: 1 }),
  peakQualityScore: int("peakQualityScore"),
  avgPeriodSec: int("avgPeriodSec"),
  // Delivery status
  emailSent: int("emailSent").default(0), // 0/1 boolean
  pushSent: int("pushSent").default(0), // 0/1 boolean
  emailSentAt: timestamp("emailSentAt"),
  pushSentAt: timestamp("pushSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SwellAlertLog = typeof swellAlertLogs.$inferSelect;
export type InsertSwellAlertLog = typeof swellAlertLogs.$inferInsert;