CREATE TABLE `conditions_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` timestamp NOT NULL,
	`bestSpotName` varchar(64),
	`qualityScore` int,
	`waveHeightFt` decimal(4,1),
	`wavePeriodSec` int,
	`waveDirectionDeg` int,
	`windSpeedMph` int,
	`windDirectionDeg` int,
	`windType` varchar(16),
	`buoyWaveHeightFt` decimal(4,1),
	`buoyPeriodSec` int,
	`buoyDirectionDeg` int,
	`isSurfable` int NOT NULL DEFAULT 0,
	`unsurfableReason` varchar(32),
	`dayOfWeek` int,
	`hourOfDay` int,
	`month` int,
	`tideHeightFt` decimal(4,1),
	`tidePhase` varchar(16),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conditions_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `forecast_points` ADD `tertiarySwellHeightFt` decimal(4,1);--> statement-breakpoint
ALTER TABLE `forecast_points` ADD `tertiarySwellPeriodS` int;--> statement-breakpoint
ALTER TABLE `forecast_points` ADD `tertiarySwellDirectionDeg` int;