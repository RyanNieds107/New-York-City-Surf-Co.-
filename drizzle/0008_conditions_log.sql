-- Conditions Log Table for historical pattern matching
-- Records condition states at regular intervals for ML/pattern analysis

CREATE TABLE `conditions_log` (
  `id` int AUTO_INCREMENT NOT NULL,
  `timestamp` timestamp NOT NULL,
  -- Best spot data at this moment
  `bestSpotName` varchar(64),
  `qualityScore` int,
  -- Wave conditions
  `waveHeightFt` decimal(4,1),
  `wavePeriodSec` int,
  `waveDirectionDeg` int,
  -- Wind conditions
  `windSpeedMph` int,
  `windDirectionDeg` int,
  `windType` varchar(16),
  -- Buoy data (raw from NOAA 44065)
  `buoyWaveHeightFt` decimal(4,1),
  `buoyPeriodSec` int,
  `buoyDirectionDeg` int,
  -- Condition classification
  `isSurfable` int NOT NULL DEFAULT 0,
  `unsurfableReason` varchar(32),
  -- Metadata for pattern matching
  `dayOfWeek` int,
  `hourOfDay` int,
  `month` int,
  -- Tide data
  `tideHeightFt` decimal(4,1),
  `tidePhase` varchar(16),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `conditions_log_id` PRIMARY KEY(`id`)
);

-- Index for efficient pattern matching queries
CREATE INDEX `conditions_log_timestamp_idx` ON `conditions_log` (`timestamp`);
CREATE INDEX `conditions_log_pattern_idx` ON `conditions_log` (`month`, `dayOfWeek`, `hourOfDay`);
CREATE INDEX `conditions_log_reason_idx` ON `conditions_log` (`unsurfableReason`);
