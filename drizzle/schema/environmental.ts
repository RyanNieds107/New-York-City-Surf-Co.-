import { decimal, int, mysqlEnum, mysqlTable, timestamp, unique, varchar } from "drizzle-orm/mysql-core";

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
  windGustsKts: int("windGustsKts"), // knots (wind gusts)
  // Temperature data (NEW)
  waterTempF: decimal("waterTempF", { precision: 4, scale: 1 }), // Fahrenheit
  airTempF: decimal("airTempF", { precision: 4, scale: 1 }), // Fahrenheit
  source: mysqlEnum("source", ["ww3", "gfs", "hrrr", "openmeteo"]).default("ww3").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ForecastPoint = typeof forecastPoints.$inferSelect;
export type InsertForecastPoint = typeof forecastPoints.$inferInsert;

// Stormglass Verification Table (ECMWF model sense-check data)
export const stormglassVerification = mysqlTable(
  "stormglass_verification",
  {
    id: int("id").autoincrement().primaryKey(),
    spotId: int("spotId").notNull(), // FK to surf_spots.id
    forecastTimestamp: timestamp("forecastTimestamp").notNull(), // UTC timestamp (hour-aligned)
    waveHeightFt: decimal("waveHeightFt", { precision: 4, scale: 1 }), // ECMWF wave height in feet
    swellHeightFt: decimal("swellHeightFt", { precision: 4, scale: 1 }), // Optional: primary swell height in feet
    swellPeriodS: int("swellPeriodS"), // Swell period in seconds
    swellDirectionDeg: int("swellDirectionDeg"), // Swell direction in degrees
    source: varchar("source", { length: 16 }).notNull().default("ecmwf"), // Data source (default: 'ecmwf')
    fetchedAt: timestamp("fetchedAt").defaultNow().notNull(), // When this verification data was fetched
  },
  (table) => ({
    uniqueSpotTimestamp: unique("unique_spot_timestamp").on(table.spotId, table.forecastTimestamp),
  })
);

export type StormglassVerification = typeof stormglassVerification.$inferSelect;
export type InsertStormglassVerification = typeof stormglassVerification.$inferInsert;
