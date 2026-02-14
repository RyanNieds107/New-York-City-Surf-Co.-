import { date, index, int, mysqlEnum, mysqlTable, text, timestamp, unique, varchar } from "drizzle-orm/mysql-core";
import { sql, SQL } from "drizzle-orm";

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
  smsOptIn: int("smsOptIn").default(0), // 0 = false, 1 = true
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

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

// Forecast Views Table (track when users view forecasts for report prompts)
export const forecastViews = mysqlTable(
  "forecast_views",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    spotId: int("spotId").notNull(),
    viewedAt: timestamp("viewedAt").notNull().defaultNow(),
    viewedDate: date("viewedDate")
      .generatedAlwaysAs((): SQL => sql`DATE(${forecastViews.viewedAt})`, { mode: "stored" })
      .notNull(),
    forecastTime: timestamp("forecastTime").notNull(), // Time user was viewing forecast for
    promptSent: int("promptSent").notNull().default(0), // 0 = not sent, 1 = sent
    promptSentAt: timestamp("promptSentAt"),
    sessionDuration: int("sessionDuration"), // Seconds user spent on page (nullable)
    surfPlanPopupShown: int("surfPlanPopupShown").notNull().default(0), // 0 = not shown, 1 = shown
    surfPlanPopupShownAt: timestamp("surfPlanPopupShownAt"),
    surfPlanResponse: varchar("surfPlanResponse", { length: 20 }), // 'yes', 'no', 'dismissed', null
    surfPlanRespondedAt: timestamp("surfPlanRespondedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    idx_user_spot: index("idx_user_spot").on(table.userId, table.spotId),
    idx_viewed_at: index("idx_viewed_at").on(table.viewedAt),
    idx_prompt_pending: index("idx_prompt_pending").on(table.promptSent, table.viewedAt),
    idx_session_duration: index("idx_session_duration").on(table.sessionDuration),
    idx_surf_plan_popup: index("idx_surf_plan_popup").on(
      table.userId,
      table.spotId,
      table.surfPlanPopupShownAt
    ),
    idx_surf_plan_response: index("idx_surf_plan_response").on(
      table.userId,
      table.surfPlanResponse,
      table.surfPlanRespondedAt
    ),
    unique_user_spot_date: unique("unique_user_spot_date").on(
      table.userId,
      table.spotId,
      table.viewedDate
    ),
  })
);

export type ForecastView = typeof forecastViews.$inferSelect;
export type InsertForecastView = typeof forecastViews.$inferInsert;

// Surf Reports Table (user-submitted session reports)
export const surfReports = mysqlTable("surf_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  spotId: int("spotId").notNull(),
  sessionDate: timestamp("sessionDate").notNull(), // When they surfed
  starRating: int("starRating").notNull(), // 1-5
  crowdLevel: int("crowdLevel"), // 1-5 (nullable)
  photoUrl: varchar("photoUrl", { length: 512 }),
  quickNote: varchar("quickNote", { length: 128 }),
  freeformNote: text("freeformNote"), // Phase 2
  waveHeightActual: int("waveHeightActual"), // Phase 2 - tenths of feet
  forecastViewId: int("forecastViewId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SurfReport = typeof surfReports.$inferSelect;
export type InsertSurfReport = typeof surfReports.$inferInsert;

// Surf Report Validation Table - compares user reports vs actual conditions
export const surfReportValidation = mysqlTable("surf_report_validation", {
  id: int("id").autoincrement().primaryKey(),

  // Links to source data
  reportId: int("reportId").notNull(), // FK to surf_reports
  conditionsLogId: int("conditionsLogId"), // FK to conditions_log (nullable if no match found)

  // Identifiers
  userId: int("userId").notNull(),
  spotId: int("spotId").notNull(),
  sessionDate: timestamp("sessionDate").notNull(),

  // User-reported data (from surf_reports)
  reportedWaveHeightTenths: int("reportedWaveHeightTenths"), // User said X feet
  reportedStarRating: int("reportedStarRating").notNull(), // 1-5 satisfaction
  reportedCrowdLevel: int("reportedCrowdLevel"), // 1-5

  // System-observed data (from conditions_log at same time)
  observedWaveHeightTenths: int("observedWaveHeightTenths"), // System measured Y feet
  observedQualityScore: int("observedQualityScore"), // 0-100
  observedWindSpeedMph: int("observedWindSpeedMph"),
  observedWindType: varchar("observedWindType", { length: 16 }), // offshore, onshore, cross
  observedIsSurfable: int("observedIsSurfable"), // 0/1

  // Validation metrics (calculated)
  waveHeightDeltaTenths: int("waveHeightDeltaTenths"), // reported - observed (signed)
  absoluteWaveHeightErrorTenths: int("absoluteWaveHeightErrorTenths"), // abs(delta)
  waveHeightErrorPct: int("waveHeightErrorPct"), // percentage error

  // Correlation insights
  starRatingVsQuality: int("starRatingVsQuality"), // (starRating*20) - qualityScore
  satisfactionMatchesConditions: int("satisfactionMatchesConditions"), // 0=mismatch, 1=match

  // Metadata
  validationTimestamp: timestamp("validationTimestamp").defaultNow().notNull(),
  matchWindowMinutes: int("matchWindowMinutes"), // How far apart timestamp vs sessionDate were

  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  idx_report: index("idx_report").on(table.reportId),
  idx_user: index("idx_user").on(table.userId),
  idx_spot_session: index("idx_spot_session").on(table.spotId, table.sessionDate),
  idx_error_analysis: index("idx_error_analysis").on(table.spotId, table.absoluteWaveHeightErrorTenths),
  idx_satisfaction: index("idx_satisfaction").on(table.reportedStarRating, table.observedQualityScore),
}));

export type SurfReportValidation = typeof surfReportValidation.$inferSelect;
export type InsertSurfReportValidation = typeof surfReportValidation.$inferInsert;

// Verification Tokens Table (for magic link authentication)
export const verificationTokens = mysqlTable("verification_tokens", {
  id: int("id").autoincrement().primaryKey(),
  identifier: varchar("identifier", { length: 320 }).notNull(), // email address
  token: varchar("token", { length: 64 }).notNull().unique(), // unique hash token
  expires: timestamp("expires").notNull(), // when the token expires
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type InsertVerificationToken = typeof verificationTokens.$inferInsert;
