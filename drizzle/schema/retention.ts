import { decimal, int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

// Swell Alerts Table (user alert preferences)
export const swellAlerts = mysqlTable("swell_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK to users.id
  spotId: int("spotId"), // FK to surf_spots.id (NULL = all spots)
  // Alert criteria
  minWaveHeightFt: decimal("minWaveHeightFt", { precision: 4, scale: 1 }), // e.g., 3.0ft
  minQualityScore: int("minQualityScore"), // e.g., 60 (Go Surf or better)
  minPeriodSec: int("minPeriodSec"), // e.g., 8s minimum period
  idealWindOnly: int("idealWindOnly").default(0), // 0 = any wind, 1 = offshore/side-offshore only (DEPRECATED)
  allowedDays: varchar("allowedDays", { length: 20 }).default("0,1,2,3,4,5,6"), // CSV of allowed days (0=Sun, 6=Sat). Default = all days
  // Notification preferences
  emailEnabled: int("emailEnabled").default(1), // 0/1 boolean
  smsEnabled: int("smsEnabled").default(0), // 0/1 boolean for text/SMS notifications
  pushEnabled: int("pushEnabled").default(0), // 0/1 boolean (future: web push)
  // Alert timing
  hoursAdvanceNotice: int("hoursAdvanceNotice").default(24), // Alert X hours before swell arrives
  daysAdvanceNotice: int("daysAdvanceNotice"), // Alert X days before swell arrives (alternative to hours, more user-friendly)
  notificationFrequency: varchar("notificationFrequency", { length: 32 }).default("immediate"), // "immediate" | "daily_digest" | "weekly_digest" | "per_swell"
  // Content preferences
  includeConfidenceIntervals: int("includeConfidenceIntervals").default(1), // 0/1 boolean
  includeExplanation: int("includeExplanation").default(1), // 0/1 boolean (why they should target)
  // Status
  isActive: int("isActive").default(1), // 0/1 boolean
  // Threshold tracking - stores last score to detect when threshold is crossed
  lastNotifiedScore: int("lastNotifiedScore"), // Track last score for threshold-only notifications
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
  smsSent: int("smsSent").default(0), // 0/1 boolean
  pushSent: int("pushSent").default(0), // 0/1 boolean
  emailSentAt: timestamp("emailSentAt"),
  smsSentAt: timestamp("smsSentAt"),
  pushSentAt: timestamp("pushSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SwellAlertLog = typeof swellAlertLogs.$inferSelect;
export type InsertSwellAlertLog = typeof swellAlertLogs.$inferInsert;
