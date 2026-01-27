-- Add missing swell period and direction columns to stormglass_verification table
-- These columns exist in the schema but were missing from the initial migration

ALTER TABLE `stormglass_verification` ADD COLUMN `swellPeriodS` int;
ALTER TABLE `stormglass_verification` ADD COLUMN `swellDirectionDeg` int;
