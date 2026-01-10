-- Add wind gusts column to forecast_points table
ALTER TABLE `forecast_points` ADD COLUMN `windGustsKts` int COMMENT 'Wind gusts in knots' AFTER `windDirectionDeg`;
