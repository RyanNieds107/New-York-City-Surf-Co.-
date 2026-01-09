-- Add new columns to swell_alerts table for real-time updates
ALTER TABLE `swell_alerts`
  ADD COLUMN `smsEnabled` int DEFAULT 0 COMMENT '0/1 boolean for text/SMS notifications',
  ADD COLUMN `daysAdvanceNotice` int COMMENT 'Alert X days before swell arrives (alternative to hours)',
  ADD COLUMN `notificationFrequency` varchar(32) DEFAULT 'immediate' COMMENT '"immediate" | "daily_digest" | "weekly_digest" | "per_swell"',
  ADD COLUMN `includeConfidenceIntervals` int DEFAULT 1 COMMENT '0/1 boolean',
  ADD COLUMN `includeExplanation` int DEFAULT 1 COMMENT '0/1 boolean (why they should target)';

-- Add SMS tracking to swell_alert_logs table
ALTER TABLE `swell_alert_logs`
  ADD COLUMN `smsSent` int DEFAULT 0 COMMENT '0/1 boolean',
  ADD COLUMN `smsSentAt` timestamp NULL;

