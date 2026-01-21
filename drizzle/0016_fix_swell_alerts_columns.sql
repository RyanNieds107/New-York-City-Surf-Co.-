-- Fix missing columns in swell_alerts table
-- Run this migration to add columns that exist in schema but not in database

-- Add smsEnabled column
ALTER TABLE `swell_alerts` ADD COLUMN IF NOT EXISTS `smsEnabled` int DEFAULT 0;

-- Add daysAdvanceNotice column
ALTER TABLE `swell_alerts` ADD COLUMN IF NOT EXISTS `daysAdvanceNotice` int;

-- Add notificationFrequency column
ALTER TABLE `swell_alerts` ADD COLUMN IF NOT EXISTS `notificationFrequency` varchar(32) DEFAULT 'immediate';

-- Add includeConfidenceIntervals column
ALTER TABLE `swell_alerts` ADD COLUMN IF NOT EXISTS `includeConfidenceIntervals` int DEFAULT 1;

-- Add includeExplanation column
ALTER TABLE `swell_alerts` ADD COLUMN IF NOT EXISTS `includeExplanation` int DEFAULT 1;

-- Add lastNotifiedScore column
ALTER TABLE `swell_alerts` ADD COLUMN IF NOT EXISTS `lastNotifiedScore` int;

-- Add smsSent and smsSentAt to swell_alert_logs if missing
ALTER TABLE `swell_alert_logs` ADD COLUMN IF NOT EXISTS `smsSent` int DEFAULT 0;
ALTER TABLE `swell_alert_logs` ADD COLUMN IF NOT EXISTS `smsSentAt` timestamp NULL;
