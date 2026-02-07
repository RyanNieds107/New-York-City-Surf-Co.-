-- Add sessionDuration field to track engagement time
ALTER TABLE `forecast_views`
ADD COLUMN `sessionDuration` INT NULL COMMENT 'Duration user spent on page in seconds';

--> statement-breakpoint

-- Clean up existing duplicates before adding unique constraint
-- Strategy: Keep the FIRST view per user/spot/day (lowest id)
DELETE fv1 FROM forecast_views fv1
INNER JOIN (
  SELECT
    userId,
    spotId,
    DATE(viewedAt) as viewDate,
    MIN(id) as keepId
  FROM forecast_views
  GROUP BY userId, spotId, DATE(viewedAt)
  HAVING COUNT(*) > 1
) fv2
ON fv1.userId = fv2.userId
AND fv1.spotId = fv2.spotId
AND DATE(fv1.viewedAt) = fv2.viewDate
AND fv1.id != fv2.keepId;

--> statement-breakpoint

-- Add generated date column for unique constraint
-- MySQL 5.7+ supports generated columns
ALTER TABLE `forecast_views`
ADD COLUMN `viewedDate` DATE GENERATED ALWAYS AS (DATE(viewedAt)) STORED;

--> statement-breakpoint

-- Add unique constraint on userId + spotId + viewedDate
ALTER TABLE `forecast_views`
ADD UNIQUE KEY `unique_user_spot_date` (`userId`, `spotId`, `viewedDate`);

--> statement-breakpoint

-- Add index on sessionDuration for email job filtering
CREATE INDEX `idx_session_duration` ON `forecast_views` (`sessionDuration`);
