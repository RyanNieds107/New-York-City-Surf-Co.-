-- Add surf plan popup tracking fields to forecast_views table
ALTER TABLE `forecast_views`
ADD COLUMN `surfPlanPopupShown` int NOT NULL DEFAULT 0,
ADD COLUMN `surfPlanPopupShownAt` timestamp,
ADD COLUMN `surfPlanResponse` varchar(20),
ADD COLUMN `surfPlanRespondedAt` timestamp;

-- Add indexes for efficient querying
CREATE INDEX `idx_surf_plan_popup` ON `forecast_views` (`userId`,`spotId`,`surfPlanPopupShownAt`);
CREATE INDEX `idx_surf_plan_response` ON `forecast_views` (`userId`,`surfPlanResponse`,`surfPlanRespondedAt`);
