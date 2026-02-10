import { decimal, int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

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
