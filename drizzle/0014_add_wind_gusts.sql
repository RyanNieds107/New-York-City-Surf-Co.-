ALTER TABLE `forecast_points` ADD COLUMN `windGustsKts` int COMMENT 'Wind gusts in knots' AFTER `windDirectionDeg`;
--> statement-breakpoint
