ALTER TABLE `forecast_views` ADD `viewedDate` date GENERATED ALWAYS AS (DATE(`forecast_views`.`viewedAt`)) STORED NOT NULL;--> statement-breakpoint
ALTER TABLE `forecast_views` ADD `sessionDuration` int;--> statement-breakpoint
ALTER TABLE `forecast_views` ADD `surfPlanPopupShown` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `forecast_views` ADD `surfPlanPopupShownAt` timestamp;--> statement-breakpoint
ALTER TABLE `forecast_views` ADD `surfPlanResponse` varchar(20);--> statement-breakpoint
ALTER TABLE `forecast_views` ADD `surfPlanRespondedAt` timestamp;--> statement-breakpoint
ALTER TABLE `forecast_views` ADD CONSTRAINT `unique_user_spot_date` UNIQUE(`userId`,`spotId`,`viewedDate`);--> statement-breakpoint
CREATE INDEX `idx_fp_spot_hours` ON `forecast_points` (`spotId`,`hoursOut`);--> statement-breakpoint
CREATE INDEX `idx_fp_spot_modelrun` ON `forecast_points` (`spotId`,`modelRunTime`);--> statement-breakpoint
CREATE INDEX `idx_user_spot` ON `forecast_views` (`userId`,`spotId`);--> statement-breakpoint
CREATE INDEX `idx_viewed_at` ON `forecast_views` (`viewedAt`);--> statement-breakpoint
CREATE INDEX `idx_prompt_pending` ON `forecast_views` (`promptSent`,`viewedAt`);--> statement-breakpoint
CREATE INDEX `idx_session_duration` ON `forecast_views` (`sessionDuration`);--> statement-breakpoint
CREATE INDEX `idx_surf_plan_popup` ON `forecast_views` (`userId`,`spotId`,`surfPlanPopupShownAt`);--> statement-breakpoint
CREATE INDEX `idx_surf_plan_response` ON `forecast_views` (`userId`,`surfPlanResponse`,`surfPlanRespondedAt`);--> statement-breakpoint
ALTER TABLE `forecast_points` DROP COLUMN `tertiarySwellHeightFt`;--> statement-breakpoint
ALTER TABLE `forecast_points` DROP COLUMN `tertiarySwellPeriodS`;--> statement-breakpoint
ALTER TABLE `forecast_points` DROP COLUMN `tertiarySwellDirectionDeg`;