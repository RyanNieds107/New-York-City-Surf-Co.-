CREATE TABLE `surf_report_validation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`conditionsLogId` int,
	`userId` int NOT NULL,
	`spotId` int NOT NULL,
	`sessionDate` timestamp NOT NULL,
	`reportedWaveHeightTenths` int,
	`reportedStarRating` int NOT NULL,
	`reportedCrowdLevel` int,
	`observedWaveHeightTenths` int,
	`observedQualityScore` int,
	`observedWindSpeedMph` int,
	`observedWindType` varchar(16),
	`observedIsSurfable` int,
	`waveHeightDeltaTenths` int,
	`absoluteWaveHeightErrorTenths` int,
	`waveHeightErrorPct` int,
	`starRatingVsQuality` int,
	`satisfactionMatchesConditions` int,
	`validationTimestamp` timestamp NOT NULL DEFAULT (now()),
	`matchWindowMinutes` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `surf_report_validation_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_report` ON `surf_report_validation` (`reportId`);--> statement-breakpoint
CREATE INDEX `idx_user` ON `surf_report_validation` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_spot_session` ON `surf_report_validation` (`spotId`,`sessionDate`);--> statement-breakpoint
CREATE INDEX `idx_error_analysis` ON `surf_report_validation` (`spotId`,`absoluteWaveHeightErrorTenths`);--> statement-breakpoint
CREATE INDEX `idx_satisfaction` ON `surf_report_validation` (`reportedStarRating`,`observedQualityScore`);