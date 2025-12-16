/**
 * Combined Forecast Output Generator
 * 
 * Combines breaking wave height prediction and quality rating into a
 * single forecast output structure.
 */

import type { ForecastPoint } from '../../drizzle/schema';
import { getSpotProfile, type SpotProfile } from './spotProfiles';
import {
  calculateBreakingWaveHeight,
  formatWaveHeight,
  getDominantSwell,
} from './waveHeight';
import {
  calculateQualityScoreWithProfile,
  type QualityScoreResult,
} from './qualityRating';

export interface ForecastOutput {
  timestamp: string; // ISO 8601 local time string
  breaking_wave_height: string; // "3-4ft"
  quality_rating: string; // "Good", "Actually Fun", etc.
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
 * @returns Complete forecast output
 */
export function generateForecastOutput(
  forecastPoint: ForecastPoint,
  spotId: string,
  tideFt: number
): ForecastOutput {
  console.log('🎯 [generateForecastOutput] START for spot:', spotId);
  
  // Get spot profile
  const profile = getSpotProfile(spotId);
  if (!profile) {
    throw new Error(`No profile found for spot: ${spotId}`);
  }

  // Get dominant swell (highest energy)
  const dominantSwell = getDominantSwell(forecastPoint);
  
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
      forecastPoint.waveDirectionDeg
    );
    const breakingWaveHeight = formatWaveHeight(breakingHeightFt);
    
    // Return with minimal data
    return {
      timestamp: forecastPoint.forecastTimestamp.toISOString(),
      breaking_wave_height: breakingWaveHeight,
      quality_rating: "Flat",
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
  const swellHeightFt = dominantSwell.height_ft;
  const periodS = dominantSwell.period_s;
  const swellDirectionDeg = dominantSwell.direction_deg;

  console.log('🌊 Calling calculateBreakingWaveHeight with:', {
    height: swellHeightFt,
    period: periodS,
    direction: swellDirectionDeg,
    spot: profile.name
  });

  // Calculate breaking wave height (pass swell direction for east swell adjustment)
  const breakingHeightFt = calculateBreakingWaveHeight(
    swellHeightFt,
    periodS,
    profile,
    swellDirectionDeg
  );
  const breakingWaveHeight = formatWaveHeight(breakingHeightFt);
  
  console.log('📏 Breaking wave height result:', breakingHeightFt);
  console.log('📝 Formatted:', breakingWaveHeight);

  // Create a modified forecast point with dominant swell data for quality scoring
  // Quality scoring expects primary swell fields, so we map dominant swell to those
  const modifiedForecastPoint = {
    ...forecastPoint,
    waveHeightFt: Math.round(swellHeightFt * 10), // Convert back to tenths for compatibility
    wavePeriodSec: periodS,
    waveDirectionDeg: swellDirectionDeg,
  };

  // Calculate quality score (pass profile to avoid circular dependency)
  const qualityResult: QualityScoreResult = calculateQualityScoreWithProfile(
    modifiedForecastPoint,
    spotId,
    tideFt,
    profile
  );

  // Format timestamp (ISO 8601 local time)
  const timestamp = forecastPoint.forecastTimestamp.toISOString();

  return {
    timestamp,
    breaking_wave_height: breakingWaveHeight,
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

