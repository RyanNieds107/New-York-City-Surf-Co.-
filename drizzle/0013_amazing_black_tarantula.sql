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
	`smsSent` int DEFAULT 0,
	`pushSent` int DEFAULT 0,
	`emailSentAt` timestamp,
	`smsSentAt` timestamp,
	`pushSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `swell_alert_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `swell_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`spotId` int,
	`minWaveHeightFt` decimal(4,1),
	`minQualityScore` int,
	`minPeriodSec` int,
	`idealWindOnly` int DEFAULT 0,
	`emailEnabled` int DEFAULT 1,
	`smsEnabled` int DEFAULT 0,
	`pushEnabled` int DEFAULT 0,
	`hoursAdvanceNotice` int DEFAULT 24,
	`daysAdvanceNotice` int,
	`notificationFrequency` varchar(32) DEFAULT 'immediate',
	`includeConfidenceIntervals` int DEFAULT 1,
	`includeExplanation` int DEFAULT 1,
	`isActive` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `swell_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);