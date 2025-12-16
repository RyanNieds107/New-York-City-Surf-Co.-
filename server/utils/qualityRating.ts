/**
 * Quality Rating Scorer
 * 
 * Calculates quality rating (0-100 score) from swell, direction, tide, and wind data.
 * Converts score to human-readable rating categories.
 */

import type { SpotProfile } from './spotProfiles';
import type { ForecastPoint } from '../../drizzle/schema';

export interface QualityBreakdown {
  swell_quality: number; // 0-40 points
  direction: number; // 0-20 points
  tide: number; // 0-20 points
  wind: number; // -40 to +20 points
}

export interface QualityScoreResult {
  score: number; // 0-100 (after clamps)
  rating: string; // "Flat", "Don't Bother", "Worth a Look", etc.
  breakdown: QualityBreakdown;
  reason: string; // Human-readable explanation
}

/**
 * Calculate wave energy from swell height and period
 * 
 * Energy formula: swell_height_ft * period_s^1.5
 * 
 * @param swellHeightFt - Swell height in decimal feet
 * @param periodS - Swell period in seconds
 * @returns Energy value
 */
export function calculateEnergy(swellHeightFt: number, periodS: number): number {
  return swellHeightFt * Math.pow(periodS, 1.5);
}

/**
 * Score swell quality based on energy
 * 
 * Maps energy to 0-40 points using buckets:
 * - < 10: 5 points (tiny/weak)
 * - 10-20: 15 points (small but rideable)
 * - 20-35: 25 points (decent size)
 * - 35-60: 32 points (good size)
 * - >= 60: 40 points (pumping)
 * 
 * @param energy - Wave energy value
 * @returns Score from 0-40
 */
export function scoreSwellQuality(energy: number): number {
  if (energy < 10) {
    return 5; // tiny/weak
  } else if (energy < 20) {
    return 15; // small but rideable
  } else if (energy < 35) {
    return 25; // decent size
  } else if (energy < 60) {
    return 32; // good size
  } else {
    return 40; // pumping
  }
}

/**
 * Calculate shortest angular distance between two degrees (handles 360° wrap)
 * 
 * @param deg1 - First angle in degrees (0-360)
 * @param deg2 - Second angle in degrees (0-360)
 * @returns Shortest angular distance in degrees (0-180)
 */
export function calculateAngularDistance(deg1: number, deg2: number): number {
  let diff = Math.abs(deg1 - deg2);
  // Handle 360° wrap
  if (diff > 180) {
    diff = 360 - diff;
  }
  return diff;
}

/**
 * Score swell direction fit
 * 
 * Returns 0-20 points based on how well swell direction matches spot's ideal direction.
 * - Within tolerance: 20 points
 * - 1.5x tolerance: 12 points
 * - 2x tolerance: 6 points
 * - Beyond 2x tolerance: 2 points
 * - null direction: 10 points (neutral)
 * 
 * @param swellDirectionDeg - Swell direction in degrees (0-360) or null
 * @param profile - Spot profile with target and tolerance
 * @returns Score from 0-20
 */
export function scoreDirection(
  swellDirectionDeg: number | null,
  profile: SpotProfile
): number {
  if (swellDirectionDeg === null) {
    return 10; // neutral when no direction data
  }

  const target = profile.swell_target_deg;
  const tolerance = profile.swell_tolerance_deg;
  const distance = calculateAngularDistance(swellDirectionDeg, target);

  let baseScore: number;
  if (distance <= tolerance) {
    baseScore = 20; // within tolerance
  } else if (distance <= tolerance * 1.5) {
    baseScore = 14; // 1.5x tolerance
  } else if (distance <= tolerance * 2) {
    baseScore = 8; // 2x tolerance
  } else if (distance <= tolerance * 2.5) {
    baseScore = 4; // 2.5x tolerance
  } else {
    baseScore = 2; // beyond 2.5x tolerance
  }

  // West swells (W, WSW, WNW: ~247.5-292.5°) produce minimal surf at Western Long Island
  // These directions are blocked by landmass and don't generate real surf
  const isWestSwell = swellDirectionDeg >= 247.5 && swellDirectionDeg <= 292.5;
  if (isWestSwell) {
    return 2; // Minimal score - West swells don't produce real surf
  }

  // East swells (90-110°) get modest penalty due to inconsistency
  // Not because they're bad quality, but because they're less reliable
  // and tend to underperform predictions
  const isEastSwell = swellDirectionDeg >= 90 && swellDirectionDeg <= 110;
  if (isEastSwell) {
    baseScore = Math.max(2, baseScore - 4); // Reduce by 4 points (modest penalty)
  }

  return baseScore;
}

/**
 * Score tide quality
 * 
 * Returns 0-20 points based on tide position:
 * - In optimal range: 20 points
 * - Slightly outside (±0.5ft): 12 points
 * - Poor tide: 4 points
 * 
 * @param tideFt - Tide height in feet
 * @param profile - Spot profile with optimal tide range
 * @returns Score from 0-20
 */
export function scoreTide(tideFt: number, profile: SpotProfile): number {
  const { tide_best_min_ft, tide_best_max_ft } = profile;

  if (tideFt >= tide_best_min_ft && tideFt <= tide_best_max_ft) {
    return 20; // in optimal range
  } else if (
    (tideFt >= tide_best_min_ft - 0.5 && tideFt < tide_best_min_ft) ||
    (tideFt > tide_best_max_ft && tideFt <= tide_best_max_ft + 0.5)
  ) {
    return 12; // slightly outside
  } else {
    return 4; // poor tide
  }
}

/**
 * Score wind quality for Long Island south shore beaches
 * 
 * Long Island south shore beaches (Lido, Long Beach, Rockaway) face approximately 180° (South).
 * 
 * Wind classifications:
 * - Offshore (good): Winds from N, NW, NE (315-45°) = +10 to +20 points
 * - Cross-shore/Sideshore (marginal): Winds from E or W (60-120°, 240-300°) = -5 to -15 points
 * - Onshore (bad): Winds from S, SE, SW (120-240°) = -20 to -40 points
 * 
 * @param windSpeedKt - Wind speed in knots or null
 * @param windDirectionDeg - Wind direction in degrees (0-360) or null
 * @param profile - Spot profile (not used for wind, but kept for interface consistency)
 * @returns Score from -40 to +20
 */
export function scoreWind(
  windSpeedKt: number | null,
  windDirectionDeg: number | null,
  profile: SpotProfile
): number {
  if (windSpeedKt === null || windDirectionDeg === null) {
    return 0; // neutral when no wind data
  }

  // Long Island south shore faces ~180° (south)
  // Offshore = winds from north (315-45°)
  // Onshore = winds from south (135-225°)
  
  // Normalize wind direction to 0-360
  const normalized = ((windDirectionDeg % 360) + 360) % 360;
  
  // Calculate if wind is offshore, onshore, or cross
  // Offshore: 315-45° (northern quadrant)
  // Onshore: 135-225° (southern quadrant)
  
  const isOffshore = normalized >= 315 || normalized <= 45;
  const isOnshore = normalized >= 135 && normalized <= 225;
  
  if (isOffshore) {
    // Offshore winds = GOOD
    // Lighter is better (5-12kt ideal), strong offshore can be difficult
    if (windSpeedKt <= 12) {
      return 20; // Perfect offshore
    } else if (windSpeedKt <= 18) {
      return 15; // Good offshore
    } else {
      return 10; // Strong offshore (harder to paddle)
    }
  } else if (isOnshore) {
    // Onshore winds = BAD
    // Stronger is worse
    if (windSpeedKt <= 8) {
      return -10; // Light onshore (tolerable)
    } else if (windSpeedKt <= 15) {
      return -25; // Moderate onshore (choppy)
    } else {
      return -40; // Strong onshore (blown out)
    }
  } else {
    // Cross-shore/sideshore = MARGINAL
    // Stronger is worse
    if (windSpeedKt <= 10) {
      return -5; // Light cross (acceptable)
    } else if (windSpeedKt <= 18) {
      return -12; // Moderate cross (drifty)
    } else {
      return -20; // Strong cross (very drifty)
    }
  }
}

/**
 * Convert quality score to rating string
 * 
 * @param score - Quality score (0-100)
 * @returns Rating string
 */
export function scoreToRating(score: number): string {
  if (score <= 20) {
    return 'Flat';
  } else if (score <= 40) {
    return "Don't Bother";
  } else if (score <= 60) {
    return 'Worth a Look';
  } else if (score <= 75) {
    return 'Actually Fun';
  } else if (score <= 90) {
    return 'Clear the Calendar';
  } else {
    return 'All-Time';
  }
}

/**
 * Generate human-readable reason for quality score
 * 
 * @param breakdown - Score breakdown
 * @param swellHeightFt - Swell height
 * @param periodS - Swell period
 * @returns Human-readable reason string
 */
function generateReason(
  breakdown: QualityBreakdown,
  swellHeightFt: number,
  periodS: number
): string {
  const reasons: string[] = [];

  // Period check
  if (periodS < 5) {
    reasons.push('junk period');
  }

  // Size check
  if (swellHeightFt < 2 && periodS < 6) {
    reasons.push('too small and weak');
  }

  // Swell quality
  if (breakdown.swell_quality >= 32) {
    reasons.push('good swell');
  } else if (breakdown.swell_quality <= 5) {
    reasons.push('weak swell');
  }

  // Direction
  if (breakdown.direction >= 18) {
    reasons.push('ideal direction');
  } else if (breakdown.direction <= 6) {
    reasons.push('poor direction');
  }

  // Tide
  if (breakdown.tide >= 18) {
    reasons.push('optimal tide');
  } else if (breakdown.tide <= 4) {
    reasons.push('poor tide');
  } else {
    reasons.push('tide OK');
  }

  // Wind
  if (breakdown.wind >= 15) {
    reasons.push('offshore winds');
  } else if (breakdown.wind <= -20) {
    reasons.push('onshore winds');
  } else if (breakdown.wind < 0) {
    reasons.push('wind issues');
  } else if (breakdown.wind > 0) {
    reasons.push('favorable winds');
  }

  return reasons.length > 0 ? reasons.join(', ') : 'marginal conditions';
}

/**
 * Calculate quality score from forecast point
 * 
 * Combines all scoring components, applies mandatory clamps, and returns
 * complete quality assessment.
 * 
 * @param forecastPoint - Forecast point data
 * @param spotId - Spot identifier (name or key)
 * @param tideFt - Tide height in feet
 * @param profile - Spot profile (to avoid circular dependency)
 * @returns Quality score result with breakdown and reason
 */
export function calculateQualityScoreWithProfile(
  forecastPoint: ForecastPoint,
  spotId: string,
  tideFt: number,
  profile: SpotProfile
): QualityScoreResult {

  // Convert waveHeightFt from integer*10 to decimal feet
  const swellHeightFt = forecastPoint.waveHeightFt !== null 
    ? forecastPoint.waveHeightFt / 10 
    : 0;
  const periodS = forecastPoint.wavePeriodSec ?? 0;

  // Calculate component scores
  const energy = calculateEnergy(swellHeightFt, periodS);
  const swellQuality = scoreSwellQuality(energy);
  const direction = scoreDirection(forecastPoint.waveDirectionDeg, profile);
  const tide = scoreTide(tideFt, profile);
  const wind = scoreWind(
    forecastPoint.windSpeedKts ?? null,
    forecastPoint.windDirectionDeg ?? null,
    profile
  );

  // Calculate raw score (sum of components)
  let rawScore = swellQuality + direction + tide + wind;

  // Apply mandatory clamps
  if (periodS < 5) {
    rawScore = Math.min(rawScore, 20); // cap at 20 for junk period
  }
  if (swellHeightFt < 2 && periodS < 6) {
    rawScore = Math.min(rawScore, 15); // cap at 15 for too small and weak
  }

  // Clamp final score to 0-100
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  const breakdown: QualityBreakdown = {
    swell_quality: swellQuality,
    direction,
    tide,
    wind,
  };

  const rating = scoreToRating(score);
  const reason = generateReason(breakdown, swellHeightFt, periodS);

  return {
    score,
    rating,
    breakdown,
    reason,
  };
}

/**
 * Calculate quality score from forecast point (with automatic profile lookup)
 * 
 * @param forecastPoint - Forecast point data
 * @param spotId - Spot identifier (name or key)
 * @param tideFt - Tide height in feet
 * @returns Quality score result with breakdown and reason
 */
export async function calculateQualityScore(
  forecastPoint: ForecastPoint,
  spotId: string,
  tideFt: number
): Promise<QualityScoreResult> {
  // Dynamic import to avoid circular dependency issues
  // Note: This function is provided for convenience, but calculateQualityScoreWithProfile
  // should be used directly when you already have the profile
  const { getSpotProfile } = await import('./spotProfiles');
  const profile = getSpotProfile(spotId);
  
  if (!profile) {
    throw new Error(`No profile found for spot: ${spotId}`);
  }
  
  return calculateQualityScoreWithProfile(forecastPoint, spotId, tideFt, profile);
}

