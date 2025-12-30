/**
 * Combined Forecast Output Generator
 * 
 * Combines breaking wave height prediction and quality rating into a
 * single forecast output structure.
 */

import type { ForecastPoint } from '../../drizzle/schema';
import { getSpotProfile, type SpotProfile, calculateSpotMultiplier, getSpotKey } from './spotProfiles';
import {
  calculateBreakingWaveHeight,
  getDominantSwell,
} from './waveHeight';
import {
  calculateQualityScoreWithProfile,
  type QualityScoreResult,
} from './qualityRating';

export interface ForecastOutput {
  timestamp: string; // ISO 8601 local time string
  breakingWaveHeightFt: number; // Predicted breaking wave face height in feet (numeric)
  quality_rating: string; // "Don't Bother", "Worth a Look", "Go Surf", "Firing", "All-Time"
  quality_score: number; // 0-100 (internal)
  raw_data: {
    swell_height_ft: number;
    swell_period_s: number;
    tide_ft: number;
    wind_speed_kt: number | null;
    wind_direction_deg: number | null;
  };
  breakdown: {
    swell_quality: number;
    direction: number;
    tide: number;
    wind: number;
  };
  reason: string; // Human-readable explanation
}

/**
 * Generate complete forecast output from forecast point
 * 
 * Combines breaking wave height prediction and quality rating.
 * 
 * @param forecastPoint - Forecast point data from database
 * @param spotId - Spot identifier (name or key like "lido", "long-beach", "rockaway")
 * @param tideFt - Tide height in decimal feet
 * @param tidePhase - Tide phase: 'high', 'low', 'rising', 'falling', or null
 * @returns Complete forecast output
 */
export function generateForecastOutput(
  forecastPoint: ForecastPoint,
  spotId: string,
  tideFt: number,
  tidePhase?: string | null
): ForecastOutput {
  console.log('🎯 [generateForecastOutput] START for spot:', spotId);
  
  // Get spot profile
  const profile = getSpotProfile(spotId);
  if (!profile) {
    throw new Error(`No profile found for spot: ${spotId}`);
  }

  // Get dominant swell using H² × T energy formula
  // Penalties (directional kill switch, wrap penalty) are applied AFTER selection
  const dominantSwell = getDominantSwell(forecastPoint, profile, tidePhase);

  if (!dominantSwell) {
    console.log('❌ No dominant swell - returning default output');
    // Fallback to primary swell if no dominant swell found
    const swellHeightFt = forecastPoint.waveHeightFt !== null 
      ? forecastPoint.waveHeightFt / 10 
      : 0;
    const periodS = forecastPoint.wavePeriodSec ?? 0;
    
    const breakingHeightFt = calculateBreakingWaveHeight(
      swellHeightFt,
      periodS,
      profile,
      forecastPoint.waveDirectionDeg,
      tidePhase
    );
    
    // Return with minimal data
    return {
      timestamp: forecastPoint.forecastTimestamp.toISOString(),
      breakingWaveHeightFt: breakingHeightFt,
      quality_rating: "Don't Bother",
      quality_score: 0,
      raw_data: {
        swell_height_ft: swellHeightFt,
        swell_period_s: periodS,
        tide_ft: tideFt,
        wind_speed_kt: forecastPoint.windSpeedKts ?? null,
        wind_direction_deg: forecastPoint.waveDirectionDeg ?? null,
      },
      breakdown: {
        swell_quality: 0,
        direction: 0,
        tide: 0,
        wind: 0,
      },
      reason: "No valid swell data",
    };
  }

  // Use dominant swell for calculations
  // breaking_height is already calculated in getDominantSwell with all penalties applied
  const swellHeightFt = dominantSwell.height_ft;
  const periodS = dominantSwell.period_s;
  const swellDirectionDeg = dominantSwell.direction_deg;
  const breakingHeightFt = dominantSwell.breaking_height;

  // Calculate spot multiplier for logging
  const spotKey = getSpotKey(profile.name) || spotId;
  const spotMultiplier = calculateSpotMultiplier(spotKey, swellHeightFt, periodS);

  console.log('🌊 Using dominant swell (selected by H²×T energy, displayed with H×T/10×mult):', {
    height: swellHeightFt,
    period: periodS,
    direction: swellDirectionDeg,
    energy: dominantSwell.energy?.toFixed(1),
    breaking_height: breakingHeightFt,
    formula: `${swellHeightFt.toFixed(1)} × ${(periodS/10).toFixed(2)} × ${spotMultiplier} = ${(swellHeightFt * (periodS/10) * spotMultiplier).toFixed(1)}ft (before penalties)`,
    spot: profile.name,
    spotMultiplier
  });

  // Create a modified forecast point with dominant swell data for quality scoring
  // Quality scoring expects primary swell fields, so we map dominant swell to those
  // IMPORTANT: Preserve wind data from original forecastPoint for quality scoring
  const modifiedForecastPoint = {
    ...forecastPoint,
    waveHeightFt: Math.round(swellHeightFt * 10), // Convert back to tenths for compatibility
    wavePeriodSec: periodS,
    waveDirectionDeg: swellDirectionDeg,
    // Preserve wind data - critical for quality scoring
    windSpeedKts: forecastPoint.windSpeedKts ?? null,
    windDirectionDeg: forecastPoint.windDirectionDeg ?? null,
  };

  // Calculate quality score (pass profile to avoid circular dependency)
  const qualityResult: QualityScoreResult = calculateQualityScoreWithProfile(
    modifiedForecastPoint,
    spotId,
    tideFt,
    profile,
    tidePhase ?? null
  );

  // Debug logging for quality score breakdown
  console.log('📊 Quality Score Breakdown:', {
    spot: profile.name,
    timestamp: forecastPoint.forecastTimestamp.toISOString(),
    swell_height_ft: swellHeightFt,
    period_s: periodS,
    direction_deg: swellDirectionDeg,
    tide_ft: tideFt,
    wind_speed_kt: forecastPoint.windSpeedKts,
    wind_direction_deg: forecastPoint.windDirectionDeg,
    breakdown: qualityResult.breakdown,
    raw_score: qualityResult.breakdown.swell_quality + qualityResult.breakdown.direction + qualityResult.breakdown.tide + qualityResult.breakdown.wind,
    final_score: qualityResult.score,
    rating: qualityResult.rating,
  });

  // Format timestamp (ISO 8601 local time)
  const timestamp = forecastPoint.forecastTimestamp.toISOString();

  return {
    timestamp,
    breakingWaveHeightFt: breakingHeightFt,
    quality_rating: qualityResult.rating,
    quality_score: qualityResult.score,
    raw_data: {
      swell_height_ft: swellHeightFt,
      swell_period_s: periodS,
      tide_ft: tideFt,
      wind_speed_kt: forecastPoint.windSpeedKts ?? null,
      wind_direction_deg: forecastPoint.windDirectionDeg ?? null,
    },
    breakdown: qualityResult.breakdown,
    reason: qualityResult.reason,
  };
}

