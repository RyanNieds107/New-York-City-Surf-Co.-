ALTER TABLE `stormglass_verification` ADD `swellPeriodS` int;--> statement-breakpoint
ALTER TABLE `stormglass_verification` ADD `swellDirectionDeg` int;--> statement-breakpoint
ALTER TABLE `swell_alerts` ADD `allowedDays` varchar(20) DEFAULT '0,1,2,3,4,5,6';