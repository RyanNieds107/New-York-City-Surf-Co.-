import type { BuoyReading, SurfSpot } from "../../drizzle/schema";
import type { CurrentTideInfo } from "./tides";

/**
 * Forecasting Model Service
 * Implements a heuristic-based scoring algorithm for the MVP.
 */

export interface ForecastResult {
  probabilityScore: number; // 0-100
  waveHeightTenthsFt: number; // wave height in tenths of feet
  confidenceBand: "Low" | "Medium" | "High";
  usabilityIntermediate: number; // 0-100
  usabilityAdvanced: number; // 0-100
}

interface ForecastInput {
  spot: SurfSpot;
  buoyReading: BuoyReading | null;
  tideInfo: CurrentTideInfo | null;
  avgCrowdLevel: number | null; // 1-5 scale, null if no reports
}

/**
 * Generates a forecast for a given spot based on current conditions.
 */
export function generateForecast(input: ForecastInput): ForecastResult {
  const { spot, buoyReading, tideInfo, avgCrowdLevel } = input;

  // Default values if no data
  if (!buoyReading) {
    return {
      probabilityScore: 0,
      waveHeightTenthsFt: 0,
      confidenceBand: "Low",
      usabilityIntermediate: 0,
      usabilityAdvanced: 0,
    };
  }

  // Calculate wave height in feet (from cm)
  const waveHeightFt = buoyReading.waveHeightCm ? buoyReading.waveHeightCm / 30.48 : 0;
  const waveHeightTenthsFt = Math.round(waveHeightFt * 10);

  // Calculate individual scores (0-100 each)
  const swellScore = calculateSwellScore(buoyReading, spot);
  const periodScore = calculatePeriodScore(buoyReading);
  const windScore = calculateWindScore(buoyReading, spot);
  const tideScore = calculateTideScore(tideInfo);

  // Weighted combination for probability score
  // Swell is most important, then period, then wind, then tide
  const rawScore = swellScore * 0.35 + periodScore * 0.30 + windScore * 0.20 + tideScore * 0.15;

  // Apply bathymetry factor (1-10 scale, normalized to 0.5-1.5 multiplier)
  const bathymetryMultiplier = 0.5 + (spot.bathymetryFactor / 10);
  const probabilityScore = Math.min(100, Math.round(rawScore * bathymetryMultiplier));

  // Calculate confidence band based on data freshness
  const dataAge = Date.now() - buoyReading.timestamp.getTime();
  const hoursOld = dataAge / (1000 * 60 * 60);
  let confidenceBand: "Low" | "Medium" | "High" = "High";
  if (hoursOld > 3) {
    confidenceBand = "Low";
  } else if (hoursOld > 1) {
    confidenceBand = "Medium";
  }

  // Calculate usability scores
  const { usabilityIntermediate, usabilityAdvanced } = calculateUsabilityScores(
    probabilityScore,
    waveHeightFt,
    avgCrowdLevel
  );

  return {
    probabilityScore,
    waveHeightTenthsFt,
    confidenceBand,
    usabilityIntermediate,
    usabilityAdvanced,
  };
}

/**
 * Scores the swell based on height and direction.
 */
function calculateSwellScore(reading: BuoyReading, spot: SurfSpot): number {
  let score = 0;

  // Wave height scoring (ideal: 3-8 ft, which is ~90-240 cm)
  const heightCm = reading.waveHeightCm || 0;
  if (heightCm < 30) {
    score = 0; // Too small (< 1ft)
  } else if (heightCm < 90) {
    score = (heightCm / 90) * 50; // Ramp up to 50 for small waves
  } else if (heightCm <= 240) {
    score = 50 + ((heightCm - 90) / 150) * 50; // 50-100 for ideal range
  } else if (heightCm <= 360) {
    score = 100 - ((heightCm - 240) / 120) * 30; // Decrease for big waves
  } else {
    score = 70 - ((heightCm - 360) / 200) * 40; // Further decrease for very big
  }

  // Swell direction scoring
  const swellDir = reading.swellDirectionDeg;
  if (swellDir !== null) {
    const idealMin = spot.idealSwellDirMin;
    const idealMax = spot.idealSwellDirMax;

    // Check if swell direction is within ideal window
    let directionScore = 0;
    if (swellDir >= idealMin && swellDir <= idealMax) {
      // Perfect direction
      const center = (idealMin + idealMax) / 2;
      const distFromCenter = Math.abs(swellDir - center);
      const maxDist = (idealMax - idealMin) / 2;
      directionScore = 100 - (distFromCenter / maxDist) * 20;
    } else {
      // Outside ideal window - calculate penalty
      const distToWindow = Math.min(
        Math.abs(swellDir - idealMin),
        Math.abs(swellDir - idealMax)
      );
      directionScore = Math.max(0, 60 - distToWindow * 0.5);
    }

    // Blend height and direction scores
    score = score * 0.6 + directionScore * 0.4;
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Scores the swell period. Longer periods = more powerful waves.
 */
function calculatePeriodScore(reading: BuoyReading): number {
  const periodDs = reading.dominantPeriodDs || 0;
  const periodS = periodDs / 10;

  // Ideal period: 10-16 seconds
  if (periodS < 5) return 10;
  if (periodS < 8) return 30 + (periodS - 5) * 10;
  if (periodS < 10) return 60 + (periodS - 8) * 15;
  if (periodS <= 16) return 90 + (periodS - 10) * 1.5;
  return 100; // 16+ seconds is excellent
}

/**
 * Scores wind conditions. Offshore is best, onshore is worst.
 */
function calculateWindScore(reading: BuoyReading, spot: SurfSpot): number {
  const windSpeed = reading.windSpeedCmps ? reading.windSpeedCmps / 100 : 0; // m/s
  const windDir = reading.windDirectionDeg;

  // Light wind is always good
  if (windSpeed < 3) return 90;

  // For Long Island, offshore is roughly from the north (315-45 degrees)
  // Onshore is from the south (135-225 degrees)
  if (windDir === null) return 50;

  let directionScore = 50;
  if ((windDir >= 315 || windDir <= 45)) {
    // Offshore - excellent
    directionScore = 100;
  } else if (windDir >= 45 && windDir <= 135) {
    // Cross-shore from east - okay
    directionScore = 70;
  } else if (windDir >= 225 && windDir <= 315) {
    // Cross-shore from west - okay
    directionScore = 70;
  } else {
    // Onshore - bad
    directionScore = 30;
  }

  // Penalize strong winds
  const speedPenalty = Math.min(40, (windSpeed - 3) * 5);
  return Math.max(0, directionScore - speedPenalty);
}

/**
 * Scores tide conditions.
 */
function calculateTideScore(tideInfo: CurrentTideInfo | null): number {
  if (!tideInfo) return 50; // Neutral if no data

  // Most Long Island beach breaks work best on mid-tide
  // Penalize extreme high or low tides
  const height = tideInfo.currentHeightFt;

  // Assuming typical tidal range of 0-6 ft, mid-tide is ~3 ft
  if (height >= 2 && height <= 4) {
    return 90; // Ideal mid-tide
  } else if (height >= 1 && height <= 5) {
    return 70; // Acceptable
  } else {
    return 40; // Extreme tide
  }
}

/**
 * Calculates usability scores for different skill levels.
 */
function calculateUsabilityScores(
  probabilityScore: number,
  waveHeightFt: number,
  avgCrowdLevel: number | null
): { usabilityIntermediate: number; usabilityAdvanced: number } {
  // Start with probability score as base
  let usabilityAdvanced = probabilityScore;
  let usabilityIntermediate = probabilityScore;

  // Advanced surfers prefer bigger waves
  if (waveHeightFt >= 4 && waveHeightFt <= 8) {
    usabilityAdvanced = Math.min(100, usabilityAdvanced + 10);
  } else if (waveHeightFt > 8) {
    usabilityAdvanced = Math.min(100, usabilityAdvanced + 5);
    usabilityIntermediate = Math.max(0, usabilityIntermediate - 30);
  }

  // Intermediate surfers prefer smaller waves
  if (waveHeightFt >= 2 && waveHeightFt <= 4) {
    usabilityIntermediate = Math.min(100, usabilityIntermediate + 10);
  } else if (waveHeightFt > 6) {
    usabilityIntermediate = Math.max(0, usabilityIntermediate - 20);
  }

  // Crowd adjustment
  if (avgCrowdLevel !== null) {
    // 1 = empty (bonus), 5 = packed (penalty)
    const crowdPenalty = (avgCrowdLevel - 1) * 5;
    usabilityAdvanced = Math.max(0, usabilityAdvanced - crowdPenalty);
    usabilityIntermediate = Math.max(0, usabilityIntermediate - crowdPenalty * 1.5); // Intermediates more affected
  }

  return {
    usabilityIntermediate: Math.round(usabilityIntermediate),
    usabilityAdvanced: Math.round(usabilityAdvanced),
  };
}
