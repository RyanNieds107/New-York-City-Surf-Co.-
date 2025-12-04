CREATE TABLE `buoy_readings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buoyId` varchar(16) NOT NULL,
	`timestamp` timestamp NOT NULL,
	`waveHeightCm` int,
	`dominantPeriodDs` int,
	`swellDirectionDeg` int,
	`windSpeedCmps` int,
	`windDirectionDeg` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `buoy_readings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crowd_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`spotId` int NOT NULL,
	`userId` int NOT NULL,
	`reportTime` timestamp NOT NULL,
	`crowdLevel` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crowd_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `forecasts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`spotId` int NOT NULL,
	`forecastTime` timestamp NOT NULL,
	`probabilityScore` int NOT NULL,
	`waveHeightTenthsFt` int NOT NULL,
	`confidenceBand` varchar(16) NOT NULL,
	`usabilityIntermediate` int NOT NULL,
	`usabilityAdvanced` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forecasts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `surf_spots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`latitude` varchar(32) NOT NULL,
	`longitude` varchar(32) NOT NULL,
	`buoyId` varchar(16) NOT NULL,
	`tideStationId` varchar(16) NOT NULL,
	`bathymetryFactor` int NOT NULL DEFAULT 5,
	`idealSwellDirMin` int NOT NULL DEFAULT 90,
	`idealSwellDirMax` int NOT NULL DEFAULT 180,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `surf_spots_id` PRIMARY KEY(`id`)
);
