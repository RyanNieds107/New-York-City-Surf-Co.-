ALTER TABLE `forecast_points` ADD `secondarySwellHeightFt` decimal(4,1);--> statement-breakpoint
ALTER TABLE `forecast_points` ADD `secondarySwellPeriodS` int;--> statement-breakpoint
ALTER TABLE `forecast_points` ADD `secondarySwellDirectionDeg` int;--> statement-breakpoint
ALTER TABLE `forecast_points` ADD `windWaveHeightFt` decimal(4,1);--> statement-breakpoint
ALTER TABLE `forecast_points` ADD `windWavePeriodS` int;--> statement-breakpoint
ALTER TABLE `forecast_points` ADD `windWaveDirectionDeg` int;