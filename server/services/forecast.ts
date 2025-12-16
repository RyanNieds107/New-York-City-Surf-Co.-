import type { BuoyReading, SurfSpot, ForecastPoint } from "../../drizzle/schema";
import type { CurrentTideInfo, TidePrediction } from "./tides";
import { fetchTidePredictions } from "./tides";
import axios from "axios";
import { generateForecastOutput } from "../utils/forecastOutput";
import { getSpotKey } from "../utils/spotProfiles";

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
  // Wind data
  windSpeedMph: number | null;
  windDirectionDeg: number | null;
  windType: "offshore" | "onshore" | "cross" | null;
  // Tide data
  tideHeightFt: number | null; // in tenths of feet
  tidePhase: "rising" | "falling" | "high" | "low" | null;
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
      windSpeedMph: null,
      windDirectionDeg: null,
      windType: null,
      tideHeightFt: null,
      tidePhase: null,
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

  // Calculate wind data
  const windSpeedMph = buoyReading.windSpeedCmps
    ? Math.round((buoyReading.windSpeedCmps / 100) * 2.237) // m/s to mph
    : null;
  const windDirectionDeg = buoyReading.windDirectionDeg ?? null;
  const windType = calculateWindType(buoyReading.windDirectionDeg);

  // Calculate tide data
  const tideHeightFt = tideInfo ? Math.round(tideInfo.currentHeightFt * 10) : null;
  const tidePhase = tideInfo?.tidePhase ?? null;

  return {
    probabilityScore,
    waveHeightTenthsFt,
    confidenceBand,
    usabilityIntermediate,
    usabilityAdvanced,
    windSpeedMph,
    windDirectionDeg,
    windType,
    tideHeightFt,
    tidePhase,
  };
}

/**
 * Determines wind type based on direction for Long Island.
 * North (315-45) = offshore, South (135-225) = onshore, else = cross
 */
function calculateWindType(windDir: number | null): "offshore" | "onshore" | "cross" | null {
  if (windDir === null) return null;
  
  if (windDir >= 315 || windDir <= 45) {
    return "offshore";
  } else if (windDir >= 135 && windDir <= 225) {
    return "onshore";
  } else {
    return "cross";
  }
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

// ==================== TIMELINE FORECAST GENERATION ====================

export interface ForecastTimelineResult {
  forecastTimestamp: Date;
  hoursOut: number;
  probabilityScore: number; // 0-100 (legacy score)
  waveHeightTenthsFt: number; // wave height in tenths of feet (legacy)
  confidenceBand: "Low" | "Medium" | "High";
  usabilityIntermediate: number; // 0-100
  usabilityAdvanced: number; // 0-100
  // Day 1 MVP outputs
  breaking_wave_height: string | null; // "3-4ft" (predicted breaking wave face height)
  quality_rating: string | null; // "Flat", "Don't Bother", "Worth a Look", etc.
  quality_score: number | null; // 0-100 (Day 1 MVP quality score)
  // Wave data (primary swell)
  waveHeightFt: number | null;
  wavePeriodSec: number | null;
  waveDirectionDeg: number | null;
  // Secondary swell
  secondarySwellHeightFt: number | null;
  secondarySwellPeriodS: number | null;
  secondarySwellDirectionDeg: number | null;
  // Wind waves
  windWaveHeightFt: number | null;
  windWavePeriodS: number | null;
  windWaveDirectionDeg: number | null;
  // Wind data
  windSpeedMph: number | null;
  windDirectionDeg: number | null;
  windType: "offshore" | "onshore" | "cross" | null;
  // Tide data
  tideHeightFt: number | null; // in tenths of feet
  tidePhase: "rising" | "falling" | "high" | "low" | null;
}

interface ForecastTimelineInput {
  forecastPoints: ForecastPoint[];
  spot: SurfSpot;
  tideStationId: string;
  avgCrowdLevel: number | null; // 1-5 scale, null if no reports
}

/**
 * Generates quality scores for a time-series forecast.
 * Takes forecast points from NOMADS and generates probability scores for each timestamp.
 */
export async function generateForecastTimeline(
  input: ForecastTimelineInput
): Promise<ForecastTimelineResult[]> {
  const { forecastPoints, spot, tideStationId, avgCrowdLevel } = input;

  if (forecastPoints.length === 0) {
    return [];
  }

  // Fetch tide predictions for the forecast period
  // Get predictions for the full range (first point to last point + buffer)
  const firstTimestamp = forecastPoints[0].forecastTimestamp;
  const lastTimestamp = forecastPoints[forecastPoints.length - 1].forecastTimestamp;
  const endDate = new Date(lastTimestamp);
  endDate.setHours(endDate.getHours() + 24); // Add buffer for tide predictions

  // Fetch tide predictions for the date range
  const tidePredictions = await fetchTidePredictionsForRange(
    tideStationId,
    firstTimestamp,
    endDate
  );
  
  const results: ForecastTimelineResult[] = [];

  // Get spot profile key for Day 1 MVP algorithm
  const spotKey = getSpotKey(spot.name);

  for (const point of forecastPoints) {
    // Convert database values to usable format
    const waveHeightFt = point.waveHeightFt !== null ? point.waveHeightFt / 10 : null; // tenths to feet
    const wavePeriodSec = point.wavePeriodSec !== null ? point.wavePeriodSec : null;
    const waveDirectionDeg = point.waveDirectionDeg !== null ? point.waveDirectionDeg : null;
    
    // Secondary swell (stored as decimal string)
    const secondarySwellHeightFt = point.secondarySwellHeightFt !== null 
      ? (typeof point.secondarySwellHeightFt === 'string' ? parseFloat(point.secondarySwellHeightFt) : point.secondarySwellHeightFt)
      : null;
    const secondarySwellPeriodS = point.secondarySwellPeriodS !== null ? point.secondarySwellPeriodS : null;
    const secondarySwellDirectionDeg = point.secondarySwellDirectionDeg !== null ? point.secondarySwellDirectionDeg : null;
    
    // Wind waves (stored as decimal string)
    const windWaveHeightFt = point.windWaveHeightFt !== null
      ? (typeof point.windWaveHeightFt === 'string' ? parseFloat(point.windWaveHeightFt) : point.windWaveHeightFt)
      : null;
    const windWavePeriodS = point.windWavePeriodS !== null ? point.windWavePeriodS : null;
    const windWaveDirectionDeg = point.windWaveDirectionDeg !== null ? point.windWaveDirectionDeg : null;

    // Calculate scores using adapted functions
    const swellScore = calculateSwellScoreFromForecastPoint(point, spot);
    const periodScore = calculatePeriodScoreFromForecastPoint(point);
    const windScore = 50; // Placeholder - will use GFS wind data later
    const tideScore = calculateTideScoreForTimestamp(point.forecastTimestamp, tidePredictions);

    // Weighted combination for probability score
    const rawScore = swellScore * 0.35 + periodScore * 0.30 + windScore * 0.20 + tideScore * 0.15;

    // Apply bathymetry factor
    const bathymetryMultiplier = 0.5 + (spot.bathymetryFactor / 10);
    const probabilityScore = Math.min(100, Math.round(rawScore * bathymetryMultiplier));

    // Calculate confidence band based on hours out
    // <12hr = High, <48hr = Medium, else Low
    let confidenceBand: "Low" | "Medium" | "High" = "High";
    if (point.hoursOut >= 48) {
      confidenceBand = "Low";
    } else if (point.hoursOut >= 12) {
      confidenceBand = "Medium";
    }

    // Calculate usability scores
    const { usabilityIntermediate, usabilityAdvanced } = calculateUsabilityScores(
      probabilityScore,
      waveHeightFt || 0,
      avgCrowdLevel
    );

    // Get tide info for this timestamp
    const tideInfo = getTideInfoForTimestamp(point.forecastTimestamp, tidePredictions);

    // Wind data from ForecastPoint
    // Convert knots to mph (1 knot = 1.15078 mph)
    const windSpeedMph = point.windSpeedKts !== null 
      ? Math.round(point.windSpeedKts * 1.15078)
      : null;
    const windDirectionDeg = point.windDirectionDeg !== null 
      ? point.windDirectionDeg 
      : null;
    
    // Calculate wind type based on direction (simplified - would need spot-specific logic for accurate offshore/onshore)
    const windType = windDirectionDeg !== null 
      ? calculateWindType(windDirectionDeg)
      : null;
    
    // Log wind and tide data for first point
    if (results.length === 0) {
      console.log('🌬️ Wind data for first timeline point:', {
        windSpeedKts: point.windSpeedKts,
        windSpeedMph,
        windDirectionDeg: point.windDirectionDeg,
        windType,
      });
      console.log('🌊 Tide data for first timeline point:', {
        tideInfo: tideInfo ? { heightFt: tideInfo.heightFt, phase: tideInfo.phase } : null,
        timestamp: point.forecastTimestamp,
      });
      console.log('📊 Forecast Point Raw Data:', {
        waveHeightFt: point.waveHeightFt,
        wavePeriodSec: point.wavePeriodSec,
        waveDirectionDeg: point.waveDirectionDeg,
        secondarySwellHeightFt: point.secondarySwellHeightFt,
        secondarySwellDirectionDeg: point.secondarySwellDirectionDeg,
        windWaveHeightFt: point.windWaveHeightFt,
        windWaveDirectionDeg: point.windWaveDirectionDeg
      });
    }

    // Generate Day 1 MVP forecast output (if spot profile exists)
    let breaking_wave_height: string | null = null;
    let quality_rating: string | null = null;
    let quality_score: number | null = null;

    if (spotKey && tideInfo) {
      try {
        const mvpOutput = generateForecastOutput(point, spotKey, tideInfo.heightFt);
        breaking_wave_height = mvpOutput.breaking_wave_height;
        quality_rating = mvpOutput.quality_rating;
        quality_score = mvpOutput.quality_score;
        
        // Log breaking wave height for debugging West swells
        if (point.waveDirectionDeg !== null && point.waveDirectionDeg >= 247.5 && point.waveDirectionDeg <= 292.5) {
          console.log(`[Forecast] West swell detected (${point.waveDirectionDeg}°): breaking_wave_height=${breaking_wave_height}, raw swell=${waveHeightFt}ft @ ${wavePeriodSec}s`);
        }
      } catch (error) {
        // If Day 1 MVP algorithm fails, continue with legacy data
        console.warn(`[Forecast] Day 1 MVP algorithm failed for spot ${spot.name}:`, error);
      }
    } else {
      // Log why breaking_wave_height isn't being calculated
      if (results.length === 0) {
        console.log(`[Forecast] breaking_wave_height not calculated: spotKey=${spotKey}, tideInfo=${!!tideInfo}`);
      }
    }

    results.push({
      forecastTimestamp: point.forecastTimestamp,
      hoursOut: point.hoursOut,
      probabilityScore,
      waveHeightTenthsFt: waveHeightFt !== null ? Math.round(waveHeightFt * 10) : 0,
      confidenceBand,
      usabilityIntermediate,
      usabilityAdvanced,
      // Day 1 MVP outputs
      breaking_wave_height,
      quality_rating,
      quality_score,
      // Wave data (primary swell)
      waveHeightFt,
      wavePeriodSec,
      waveDirectionDeg,
      // Secondary swell
      secondarySwellHeightFt: isNaN(secondarySwellHeightFt || 0) ? null : secondarySwellHeightFt,
      secondarySwellPeriodS,
      secondarySwellDirectionDeg,
      // Wind waves
      windWaveHeightFt: isNaN(windWaveHeightFt || 0) ? null : windWaveHeightFt,
      windWavePeriodS,
      windWaveDirectionDeg,
      // Wind data
      windSpeedMph,
      windDirectionDeg,
      windType,
      // Tide data
      tideHeightFt: tideInfo ? Math.round(tideInfo.heightFt * 10) : null,
      tidePhase: tideInfo?.phase ?? null,
    });
  }

  return results;
}

/**
 * Calculates swell score from forecast point data.
 * Adapted from calculateSwellScore to work with ForecastPoint.
 */
function calculateSwellScoreFromForecastPoint(
  point: ForecastPoint,
  spot: SurfSpot
): number {
  let score = 0;

  // Wave height scoring (ideal: 3-8 ft)
  const heightFt = point.waveHeightFt !== null ? point.waveHeightFt / 10 : 0;
  const heightCm = heightFt * 30.48; // Convert to cm for consistency with existing logic

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
  const swellDir = point.waveDirectionDeg;
  if (swellDir !== null) {
    const idealMin = spot.idealSwellDirMin;
    const idealMax = spot.idealSwellDirMax;

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
 * Calculates period score from forecast point data.
 * Adapted from calculatePeriodScore to work with ForecastPoint.
 */
function calculatePeriodScoreFromForecastPoint(point: ForecastPoint): number {
  const periodSec = point.wavePeriodSec || 0;

  // Ideal period: 10-16 seconds
  if (periodSec < 5) return 10;
  if (periodSec < 8) return 30 + (periodSec - 5) * 10;
  if (periodSec < 10) return 60 + (periodSec - 8) * 15;
  if (periodSec <= 16) return 90 + (periodSec - 10) * 1.5;
  return 100; // 16+ seconds is excellent
}

/**
 * Calculates tide score for a specific timestamp by interpolating from tide predictions.
 */
function calculateTideScoreForTimestamp(
  timestamp: Date,
  tidePredictions: TidePrediction[]
): number {
  if (tidePredictions.length < 2) return 50; // Neutral if no data

  // Find surrounding tide events
  const prevTide = tidePredictions
    .filter(p => p.time <= timestamp)
    .sort((a, b) => b.time.getTime() - a.time.getTime())[0];
  const nextTide = tidePredictions
    .filter(p => p.time > timestamp)
    .sort((a, b) => a.time.getTime() - b.time.getTime())[0];

  if (!prevTide || !nextTide) return 50;

  // Interpolate tide height
  const totalTime = nextTide.time.getTime() - prevTide.time.getTime();
  const elapsedTime = timestamp.getTime() - prevTide.time.getTime();
  const progress = elapsedTime / totalTime;
  const heightFt = prevTide.heightFt + (nextTide.heightFt - prevTide.heightFt) * progress;

  // Score based on height (same logic as calculateTideScore)
  if (heightFt >= 2 && heightFt <= 4) {
    return 90; // Ideal mid-tide
  } else if (heightFt >= 1 && heightFt <= 5) {
    return 70; // Acceptable
  } else {
    return 40; // Extreme tide
  }
}

/**
 * Gets tide information (height and phase) for a specific timestamp.
 */
function getTideInfoForTimestamp(
  timestamp: Date,
  tidePredictions: TidePrediction[]
): { heightFt: number; phase: "rising" | "falling" | "high" | "low" } | null {
  if (tidePredictions.length < 2) return null;

  // Find surrounding tide events
  const prevTide = tidePredictions
    .filter(p => p.time <= timestamp)
    .sort((a, b) => b.time.getTime() - a.time.getTime())[0];
  const nextTide = tidePredictions
    .filter(p => p.time > timestamp)
    .sort((a, b) => a.time.getTime() - b.time.getTime())[0];

  if (!prevTide || !nextTide) return null;

  // Interpolate tide height
  const totalTime = nextTide.time.getTime() - prevTide.time.getTime();
  const elapsedTime = timestamp.getTime() - prevTide.time.getTime();
  const progress = elapsedTime / totalTime;
  const heightFt = prevTide.heightFt + (nextTide.heightFt - prevTide.heightFt) * progress;

  // Determine phase
  let phase: "rising" | "falling" | "high" | "low";
  if (nextTide.type === "H") {
    phase = "rising";
  } else {
    phase = "falling";
  }

  // Check if we're very close to a high/low tide
  const timeToNext = nextTide.time.getTime() - timestamp.getTime();
  const timeFromPrev = timestamp.getTime() - prevTide.time.getTime();
  const minTime = Math.min(timeToNext, timeFromPrev);
  
  // If within 30 minutes of a tide event, mark as high/low
  if (minTime < 30 * 60 * 1000) {
    if (nextTide.type === "H") {
      phase = "high";
    } else {
      phase = "low";
    }
  }

  return {
    heightFt: Math.round(heightFt * 10) / 10,
    phase,
  };
}

/**
 * Fetches tide predictions for a date range.
 * NOAA API allows up to 31 days, so we fetch in chunks if needed.
 */
async function fetchTidePredictionsForRange(
  stationId: string,
  startDate: Date,
  endDate: Date
): Promise<TidePrediction[]> {
  const allPredictions: TidePrediction[] = [];
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  
  // NOAA allows up to 31 days per request
  const maxDaysPerRequest = 31;
  const numRequests = Math.ceil(daysDiff / maxDaysPerRequest);
  
  for (let i = 0; i < numRequests; i++) {
    const requestStart = new Date(startDate);
    requestStart.setDate(requestStart.getDate() + i * maxDaysPerRequest);
    
    const requestEnd = new Date(requestStart);
    requestEnd.setDate(requestEnd.getDate() + Math.min(maxDaysPerRequest, daysDiff - i * maxDaysPerRequest));
    
    // Format dates for NOAA API (YYYYMMDD)
    const formatDate = (date: Date): string => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const day = String(date.getUTCDate()).padStart(2, "0");
      return `${year}${month}${day}`;
    };
    
    const beginDate = formatDate(requestStart);
    const endDateStr = formatDate(requestEnd);
    
    const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter`;
    const params = {
      begin_date: beginDate,
      end_date: endDateStr,
      station: stationId,
      product: "predictions",
      datum: "MLLW",
      units: "english",
      time_zone: "gmt",
      application: "LongIslandSurfForecast",
      format: "json",
      interval: "hilo", // High/Low only
    };
    
    try {
      const response = await axios.get(url, { params, timeout: 10000 });
      
      if (response.data.predictions) {
        const predictions = response.data.predictions.map((p: { t: string; v: string; type: string }) => ({
          time: new Date(p.t + "Z"),
          heightFt: parseFloat(p.v),
          type: p.type as "H" | "L",
        }));
        
        // Add predictions, avoiding duplicates
        predictions.forEach((p: TidePrediction) => {
          if (!allPredictions.find(tp => tp.time.getTime() === p.time.getTime())) {
            allPredictions.push(p);
          }
        });
      }
    } catch (error) {
      console.warn(`[Tides] Failed to fetch predictions for ${beginDate}-${endDateStr}:`, error);
    }
  }
  
  // Sort by time
  allPredictions.sort((a, b) => a.time.getTime() - b.time.getTime());
  return allPredictions;
}
