-- Create forecast_views table (tracks when users view forecasts)
CREATE TABLE IF NOT EXISTS `forecast_views` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `spotId` INT NOT NULL,
  `viewedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `forecastTime` TIMESTAMP NOT NULL,
  `promptSent` TINYINT NOT NULL DEFAULT 0,
  `promptSentAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_spot` (`userId`, `spotId`),
  INDEX `idx_viewed_at` (`viewedAt`),
  INDEX `idx_prompt_pending` (`promptSent`, `viewedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--> statement-breakpoint

-- Create surf_reports table (user-submitted session reports)
CREATE TABLE IF NOT EXISTS `surf_reports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `spotId` INT NOT NULL,
  `sessionDate` TIMESTAMP NOT NULL,
  `starRating` INT NOT NULL,
  `crowdLevel` INT NULL,
  `photoUrl` VARCHAR(512) NULL,
  `quickNote` VARCHAR(128) NULL,
  `freeformNote` TEXT NULL,
  `waveHeightActual` INT NULL,
  `forecastViewId` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user` (`userId`),
  INDEX `idx_spot` (`spotId`),
  INDEX `idx_session_date` (`sessionDate`),
  INDEX `idx_spot_date` (`spotId`, `sessionDate` DESC),
  INDEX `idx_created_at` (`createdAt` DESC),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`spotId`) REFERENCES `surf_spots`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`forecastViewId`) REFERENCES `forecast_views`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
