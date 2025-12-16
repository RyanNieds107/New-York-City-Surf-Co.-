/**
 * Breaking Wave Height Calculator
 * 
 * Calculates predicted breaking wave face height from offshore swell data
 * using spot-specific amplification factors and period multipliers.
 */

import type { SpotProfile } from './spotProfiles';
import type { ForecastPoint } from '../../drizzle/schema';

/**
 * Calculate energy for a swell component
 * Energy = height * period^1.5
 */
function calculateEnergy(heightFt: number, periodS: number): number {
  return heightFt * Math.pow(periodS, 1.5);
}

/**
 * Swell component interface
 */
export interface SwellComponent {
  height_ft: number;
  period_s: number;
  direction_deg: number | null;
  energy: number;
  type: 'primary' | 'secondary' | 'wind';
}

/**
 * Get the dominant (most energetic) swell from forecast point
 * 
 * Compares primary swell, secondary swell, and wind waves,
 * returns the one with highest energy.
 * 
 * @param forecastPoint - Forecast point with all swell components
 * @returns Dominant swell component, or null if no valid swell data
 */
export function getDominantSwell(forecastPoint: ForecastPoint): SwellComponent | null {
  console.log('🔍 [getDominantSwell] Checking forecast point:', {
    primary: {
      height: forecastPoint.waveHeightFt ? forecastPoint.waveHeightFt / 10 : null,
      period: forecastPoint.wavePeriodSec,
      direction: forecastPoint.waveDirectionDeg
    },
    secondary: {
      height: forecastPoint.secondarySwellHeightFt,
      period: forecastPoint.secondarySwellPeriodS,
      direction: forecastPoint.secondarySwellDirectionDeg
    },
    wind: {
      height: forecastPoint.windWaveHeightFt,
      period: forecastPoint.windWavePeriodS,
      direction: forecastPoint.windWaveDirectionDeg
    }
  });
  
  const swells: SwellComponent[] = [];
  
  // Primary swell (from waveHeightFt - stored as integer tenths of feet)
  if (forecastPoint.waveHeightFt !== null && forecastPoint.wavePeriodSec !== null) {
    const heightFt = forecastPoint.waveHeightFt / 10; // Convert from tenths to feet
    swells.push({
      height_ft: heightFt,
      period_s: forecastPoint.wavePeriodSec,
      direction_deg: forecastPoint.waveDirectionDeg,
      energy: calculateEnergy(heightFt, forecastPoint.wavePeriodSec),
      type: 'primary',
    });
  }
  
  // Secondary swell (stored as decimal string)
  if (forecastPoint.secondarySwellHeightFt !== null && forecastPoint.secondarySwellPeriodS !== null) {
    const heightFt = typeof forecastPoint.secondarySwellHeightFt === 'string' 
      ? parseFloat(forecastPoint.secondarySwellHeightFt)
      : forecastPoint.secondarySwellHeightFt;
    if (!isNaN(heightFt)) {
      swells.push({
        height_ft: heightFt,
        period_s: forecastPoint.secondarySwellPeriodS,
        direction_deg: forecastPoint.secondarySwellDirectionDeg,
        energy: calculateEnergy(heightFt, forecastPoint.secondarySwellPeriodS),
        type: 'secondary',
      });
    }
  }
  
  // Wind waves (stored as decimal string)
  if (forecastPoint.windWaveHeightFt !== null && forecastPoint.windWavePeriodS !== null) {
    const heightFt = typeof forecastPoint.windWaveHeightFt === 'string'
      ? parseFloat(forecastPoint.windWaveHeightFt)
      : forecastPoint.windWaveHeightFt;
    if (!isNaN(heightFt)) {
      swells.push({
        height_ft: heightFt,
        period_s: forecastPoint.windWavePeriodS,
        direction_deg: forecastPoint.windWaveDirectionDeg,
        energy: calculateEnergy(heightFt, forecastPoint.windWavePeriodS),
        type: 'wind',
      });
    }
  }
  
  // Return the swell with highest energy
  if (swells.length === 0) {
    console.log('❌ [getDominantSwell] No valid swells found!');
    return null;
  }
  
  const dominant = swells.sort((a, b) => b.energy - a.energy)[0];
  
  console.log('✅ [getDominantSwell] Dominant swell:', {
    type: dominant.type,
    height: dominant.height_ft,
    period: dominant.period_s,
    direction: dominant.direction_deg,
    energy: dominant.energy
  });
  
  return dominant;
}

/**
 * Get period multiplier based on swell period
 * 
 * Period multiplier accounts for wave energy:
 * - Short periods (< 5s): wind chop, weak energy
 * - Medium periods (5-7s): some energy loss
 * - Optimal periods (8-10s): best for Long Island
 * - Long periods (11-13s): extra push
 * - Very long periods (14s+): powerful groundswell
 * 
 * @param periodS - Swell period in seconds
 * @returns Period multiplier (0.6 to 1.15)
 */
export function getPeriodMultiplier(periodS: number): number {
  if (periodS < 5) {
    return 0.6; // wind chop, weak energy
  } else if (periodS >= 5 && periodS < 8) {
    return 0.8; // short period, some energy loss
  } else if (periodS >= 8 && periodS <= 10) {
    return 1.0; // optimal period for Long Island
  } else if (periodS >= 11 && periodS <= 13) {
    return 1.1; // long period, extra push
  } else {
    return 1.15; // powerful groundswell (14s+)
  }
}

/**
 * Calculate predicted breaking wave face height
 * 
 * Formula: swell_height_ft * amplification_factor * period_multiplier * direction_factor
 * 
 * @param swellHeightFt - Offshore swell height in decimal feet
 * @param periodS - Swell period in seconds
 * @param profile - Spot profile with amplification factor
 * @param swellDirectionDeg - Swell direction in degrees (0-360) or null
 * @returns Predicted breaking wave face height in feet
 */
export function calculateBreakingWaveHeight(
  swellHeightFt: number,
  periodS: number,
  profile: SpotProfile,
  swellDirectionDeg?: number | null
): number {
  console.log('🌊 [calculateBreakingWaveHeight] INPUT:', {
    swellHeightFt,
    periodS,
    swellDirectionDeg,
    spotName: profile.name,
    baseAmplification: profile.amplification_factor
  });
  
  const periodMultiplier = getPeriodMultiplier(periodS);
  let amplification = profile.amplification_factor;
  
  // Log period multiplier
  console.log('📊 [Period Multiplier]:', periodMultiplier);
  
  // Direction-based amplification adjustments for Long Island
  if (swellDirectionDeg !== null && swellDirectionDeg !== undefined) {
    console.log('🧭 [Direction Check]:', {
      direction: swellDirectionDeg,
      isWest: (swellDirectionDeg >= 247.5 && swellDirectionDeg <= 292.5),
      isEast: (swellDirectionDeg >= 90 && swellDirectionDeg <= 110)
    });
    
    // West swells (W, WSW, WNW: ~247.5-292.5°) produce minimal surf at Western Long Island
    // These directions are blocked by the landmass and don't generate real surf
    if (swellDirectionDeg >= 247.5 && swellDirectionDeg <= 292.5) {
      // West quadrant (WSW, W, WNW): 90% reduction - minimal surf height
      const originalAmplification = amplification;
      amplification = amplification * 0.1;
      console.log('⚠️ [WEST SWELL PENALTY APPLIED]:', {
        original: originalAmplification,
        reduced: amplification,
        reduction: '90%'
      });
    }
    // East swells (90-110°) break significantly smaller at Long Island
    // due to swell shadow and refraction around the island
    // Gradual reduction: more severe for due east, less severe approaching ESE
    else if (swellDirectionDeg >= 90 && swellDirectionDeg < 100) {
      // Due east (90-100°): 50% reduction
      amplification = amplification * 0.5;
      console.log('⚠️ [EAST SWELL PENALTY]: 50% reduction');
    } else if (swellDirectionDeg >= 100 && swellDirectionDeg <= 110) {
      // ESE (100-110°): 35% reduction (transitioning toward SE which works better)
      amplification = amplification * 0.65;
      console.log('⚠️ [ESE SWELL PENALTY]: 35% reduction');
    }
  } else {
    console.log('⚠️ [NO DIRECTION DATA]: Using full amplification');
  }
  
  const breakingHeight = swellHeightFt * amplification * periodMultiplier;
  
  console.log('✅ [FINAL CALCULATION]:', {
    formula: `${swellHeightFt} × ${amplification} × ${periodMultiplier}`,
    result: breakingHeight,
    formatted: formatWaveHeight(breakingHeight)
  });
  
  return breakingHeight;
}

/**
 * Format wave height as a range string
 * 
 * Shows ±0.5ft range, rounds intelligently.
 * Examples:
 * - 2.8ft → "3ft" or "2-3ft"
 * - 4.2ft → "4ft" or "4-5ft"
 * - 5.7ft → "5-6ft" or "6ft"
 * 
 * @param heightFt - Breaking wave height in feet
 * @returns Formatted string like "3-4ft" or "2ft"
 */
export function formatWaveHeight(heightFt: number): string {
  // For very small values (< 0.5ft), show as "Flat" or "<1ft"
  if (heightFt < 0.5) {
    return "<1ft";
  }
  
  // Round to nearest 0.5ft
  const rounded = Math.round(heightFt * 2) / 2;
  
  // Determine if we show a range or single value
  // If the value is close to a whole number (within 0.2ft), show single value
  const wholeNumber = Math.round(rounded);
  const diff = Math.abs(rounded - wholeNumber);
  
  if (diff < 0.2) {
    // Close to whole number, show single value
    return `${wholeNumber}ft`;
  } else {
    // Show range (±0.5ft)
    const lower = Math.floor(rounded);
    const upper = Math.ceil(rounded);
    return `${lower}-${upper}ft`;
  }
}


