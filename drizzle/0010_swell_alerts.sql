-- Swell Alerts Tables for user swell notifications
-- Allows users to set up alerts for upcoming swells matching their criteria

CREATE TABLE `swell_alerts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `spotId` int,
  `minWaveHeightFt` decimal(4,1),
  `minQualityScore` int,
  `minPeriodSec` int,
  `idealWindOnly` int DEFAULT 0,
  `emailEnabled` int DEFAULT 1,
  `pushEnabled` int DEFAULT 0,
  `hoursAdvanceNotice` int DEFAULT 24,
  `isActive` int DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `swell_alerts_id` PRIMARY KEY(`id`)
);

CREATE TABLE `swell_alert_logs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `alertId` int NOT NULL,
  `userId` int NOT NULL,
  `spotId` int NOT NULL,
  `swellStartTime` timestamp NOT NULL,
  `swellEndTime` timestamp NOT NULL,
  `peakWaveHeightFt` decimal(4,1),
  `peakQualityScore` int,
  `avgPeriodSec` int,
  `emailSent` int DEFAULT 0,
  `pushSent` int DEFAULT 0,
  `emailSentAt` timestamp,
  `pushSentAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `swell_alert_logs_id` PRIMARY KEY(`id`)
);

-- Indexes for efficient queries
CREATE INDEX `swell_alerts_userId_idx` ON `swell_alerts` (`userId`);
CREATE INDEX `swell_alerts_spotId_idx` ON `swell_alerts` (`spotId`);
CREATE INDEX `swell_alerts_isActive_idx` ON `swell_alerts` (`isActive`);
CREATE INDEX `swell_alert_logs_alertId_idx` ON `swell_alert_logs` (`alertId`);
CREATE INDEX `swell_alert_logs_userId_idx` ON `swell_alert_logs` (`userId`);
CREATE INDEX `swell_alert_logs_swellStartTime_idx` ON `swell_alert_logs` (`swellStartTime`);

