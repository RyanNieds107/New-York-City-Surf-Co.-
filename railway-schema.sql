-- Railway MySQL Schema
-- Run each statement individually in Railway's Query tab

-- 1. Users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Surf spots table
CREATE TABLE surf_spots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  latitude VARCHAR(32) NOT NULL,
  longitude VARCHAR(32) NOT NULL,
  buoyId VARCHAR(16) NOT NULL,
  tideStationId VARCHAR(16) NOT NULL,
  bathymetryFactor INT NOT NULL DEFAULT 5,
  idealSwellDirMin INT NOT NULL DEFAULT 90,
  idealSwellDirMax INT NOT NULL DEFAULT 180,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Buoy readings table
CREATE TABLE buoy_readings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  buoyId VARCHAR(16) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  waveHeightCm INT,
  dominantPeriodDs INT,
  swellDirectionDeg INT,
  windSpeedCmps INT,
  windDirectionDeg INT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Forecasts table
CREATE TABLE forecasts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  spotId INT NOT NULL,
  forecastTime TIMESTAMP NOT NULL,
  probabilityScore INT NOT NULL,
  qualityScore INT,
  waveHeightTenthsFt INT NOT NULL,
  confidenceBand VARCHAR(16) NOT NULL,
  usabilityIntermediate INT NOT NULL,
  usabilityAdvanced INT NOT NULL,
  windSpeedMph INT,
  windDirectionDeg INT,
  windType VARCHAR(16),
  tideHeightFt INT,
  tidePhase VARCHAR(16),
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Forecast points table
CREATE TABLE forecast_points (
  id INT AUTO_INCREMENT PRIMARY KEY,
  spotId INT NOT NULL,
  forecastTimestamp TIMESTAMP NOT NULL,
  modelRunTime TIMESTAMP NOT NULL,
  hoursOut INT NOT NULL,
  waveHeightFt INT,
  wavePeriodSec INT,
  waveDirectionDeg INT,
  secondarySwellHeightFt DECIMAL(4,1),
  secondarySwellPeriodS INT,
  secondarySwellDirectionDeg INT,
  tertiarySwellHeightFt DECIMAL(4,1),
  tertiarySwellPeriodS INT,
  tertiarySwellDirectionDeg INT,
  windWaveHeightFt DECIMAL(4,1),
  windWavePeriodS INT,
  windWaveDirectionDeg INT,
  windSpeedKts INT,
  windDirectionDeg INT,
  waterTempF DECIMAL(4,1),
  airTempF DECIMAL(4,1),
  source ENUM('ww3', 'gfs', 'hrrr', 'openmeteo') NOT NULL DEFAULT 'ww3',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Crowd reports table
CREATE TABLE crowd_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  spotId INT NOT NULL,
  userId INT NOT NULL,
  reportTime TIMESTAMP NOT NULL,
  crowdLevel INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Conditions log table
CREATE TABLE conditions_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  bestSpotName VARCHAR(64),
  qualityScore INT,
  waveHeightFt DECIMAL(4,1),
  wavePeriodSec INT,
  waveDirectionDeg INT,
  windSpeedMph INT,
  windDirectionDeg INT,
  windType VARCHAR(16),
  buoyWaveHeightFt DECIMAL(4,1),
  buoyPeriodSec INT,
  buoyDirectionDeg INT,
  isSurfable INT NOT NULL DEFAULT 0,
  unsurfableReason VARCHAR(32),
  dayOfWeek INT,
  hourOfDay INT,
  month INT,
  tideHeightFt DECIMAL(4,1),
  tidePhase VARCHAR(16),
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Drizzle migrations tracking table
CREATE TABLE __drizzle_migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hash TEXT NOT NULL,
  created_at BIGINT
);
