CREATE TABLE `forecast_points` (
	`id` int AUTO_INCREMENT NOT NULL,
	`spotId` int NOT NULL,
	`forecastTimestamp` timestamp NOT NULL,
	`modelRunTime` timestamp NOT NULL,
	`hoursOut` int NOT NULL,
	`waveHeightFt` int,
	`wavePeriodSec` int,
	`waveDirectionDeg` int,
	`windSpeedKts` int,
	`windDirectionDeg` int,
	`source` enum('ww3','gfs','hrrr') NOT NULL DEFAULT 'ww3',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forecast_points_id` PRIMARY KEY(`id`)
);
