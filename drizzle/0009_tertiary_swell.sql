-- Add tertiary swell columns to forecast_points table
ALTER TABLE `forecast_points` ADD COLUMN `tertiarySwellHeightFt` decimal(4,1);
ALTER TABLE `forecast_points` ADD COLUMN `tertiarySwellPeriodS` int;
ALTER TABLE `forecast_points` ADD COLUMN `tertiarySwellDirectionDeg` int;
