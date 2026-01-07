/**
 * Breaking Wave Height Calculator
 *
 * Uses quadratic Energy-based formula (H² × T) for swell comparison,
 * then applies spot multipliers and directional penalties
 * AFTER selecting the dominant swell.
 */

import type { SpotProfile } from './spotProfiles';
import type { ForecastPoint } from '../../drizzle/schema';
import { calculateSpotMultiplier, getSpotKey } from './spotProfiles';

/**
 * Get period-based label for a swell component
 *
 * @param periodS - Swell period in seconds
 * @returns Label based on period: "Wind Swell", "Swell", or "Groundswell"
 */
export function getSwellLabel(periodS: number): string {
  if (periodS < 7) {
    return "Wind Swell";
  } else if (periodS <= 12) {
    return "Swell";
  } else {
    return "Groundswell";
  }
}

/**
 * Swell component interface with energy-based metrics
 */
export interface SwellComponent {
  height_ft: number;
  period_s: number;
  direction_deg: number | null;
  energy: number; // Raw energy = H² × T (used for comparison)
  breaking_height: number; // Predicted breaking wave height in feet (after penalties)
  type: 'primary' | 'secondary' | 'wind';
  label?: string; // Period-based label for display: "Wind Swell", "Swell", or "Groundswell"
}

/**
 * Calculate swell energy using quadratic H² × T formula
 *
 * This is the PRIMARY metric for comparing swells.
 * Higher energy = more powerful waves that will produce larger surf.
 *
 * Example:
 * - 6.6ft wind swell @ 5s: Energy = 6.6² × 5 = 217.8
 * - 2.4ft primary swell @ 10s: Energy = 2.4² × 10 = 57.6
 * - The wind swell has ~4x more energy and will dominate
 *
 * @param heightFt - Swell height in feet (must be in feet for correct scale)
 * @param periodS - Swell period in seconds
 * @returns Energy value (dimensionless, for comparison only)
 */
export function calculateSwellEnergy(heightFt: number, periodS: number): number {
  // Ensure height is positive
  if (heightFt <= 0 || periodS <= 0) return 0;
  return heightFt * heightFt * periodS;
}

/**
 * Convert energy back to base height for breaking wave calculation
 *
 * Formula: baseHeight = sqrt(Energy / period) = sqrt(H² × T / T) = H
 * This recovers the original swell height from the energy value.
 *
 * @param energy - Energy value (H² × T)
 * @param periodS - Swell period in seconds
 * @returns Base height in feet
 */
export function energyToBaseHeight(energy: number, periodS: number): number {
  if (energy <= 0 || periodS <= 0) return 0;
  return Math.sqrt(energy / periodS);
}

/**
 * Check if a swell direction is blocked by the Western Long Island landmass
 *
 * West swells (250-310°) cannot reach Western LI beaches due to NJ/land shadow.
 * This is a "kill switch" that returns true if the swell should be blocked.
 *
 * @param directionDeg - Swell direction in degrees (0-360) or null
 * @returns true if the swell is blocked, false otherwise
 */
export function isDirectionBlocked(directionDeg: number | null): boolean {
  if (directionDeg === null || directionDeg === undefined) return false;
  return directionDeg >= 250 && directionDeg <= 310;
}

/**
 * Get directional penalty multiplier for a swell
 *
 * East swells (< 105°) wrap around and lose energy, receiving a 0.7x penalty.
 * All other directions receive no penalty (1.0x).
 *
 * @param directionDeg - Swell direction in degrees (0-360) or null
 * @returns Penalty multiplier (0.7 for east swells, 1.0 otherwise)
 */
export function getDirectionalPenalty(directionDeg: number | null): number {
  if (directionDeg === null || directionDeg === undefined) return 1.0;
  if (directionDeg < 105) {
    return 0.7; // East swell wrap penalty
  }
  return 1.0;
}

/**
 * Get tide multiplier based on tide height
 *
 * High tide reduces breaking wave height (waves break in deeper water, sandbars submerged,
 * inlet/canyon effects dampened). Low tide increases it (shallow water, sandbars exposed).
 *
 * @param tideHeightFt - Tide height in decimal feet (e.g., 3.5, not 35) or null
 * @returns Multiplier to apply to breaking height (0.7 for high, 1.2 for low, interpolated between)
 */
export function getTideMultiplier(tideHeightFt: number | null): number {
  // If no tide data, return neutral multiplier
  if (tideHeightFt === null || tideHeightFt === undefined) return 1.0;

  // High tide (≥3.5ft): 30% reduction
  if (tideHeightFt >= 3.5) {
    return 0.7;
  }

  // Low tide (≤1.5ft): 20% boost
  if (tideHeightFt <= 1.5) {
    return 1.2;
  }

  // Mid-tide (1.5-3.5ft): Linear interpolation from 1.2 to 0.7
  // At 2.5ft (midpoint): returns 0.95x
  const range = 3.5 - 1.5; // 2.0ft range
  const position = (tideHeightFt - 1.5) / range; // 0 to 1
  return 1.2 - (position * 0.5); // Interpolate from 1.2 to 0.7
}

/**
 * Get the dominant swell from forecast point based on RAW ENERGY (H² × T)
 *
 * CRITICAL: Blocked directions (250-310° west) are filtered OUT before energy comparison.
 * This prevents selecting a blocked west swell that would return 0ft, falling back to
 * valid swells instead.
 *
 * Directional wrap penalties are applied AFTER selection, when calculating the
 * final breaking_height for display.
 *
 * @param forecastPoint - Forecast point with all swell components
 * @param profile - Spot profile with multiplier for breaking height calculation
 * @param tideHeightFt - Tide height in decimal feet (e.g., 3.5, not 35) or null
 * @param tidePhase - Tide phase: 'high', 'low', 'rising', 'falling', or null
 * @returns Dominant swell component with breaking_height calculated, or null if no valid data
 */
export function getDominantSwell(
  forecastPoint: ForecastPoint,
  profile: SpotProfile,
  tideHeightFt?: number | null,
  tidePhase?: string | null
): SwellComponent | null {
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

  interface SwellCandidate {
    height_ft: number;
    period_s: number;
    direction_deg: number | null;
    energy: number;
    type: 'primary' | 'secondary' | 'wind';
  }

  const candidates: SwellCandidate[] = [];

  // Primary swell (from waveHeightFt - stored as integer tenths of feet)
  if (forecastPoint.waveHeightFt !== null && forecastPoint.wavePeriodSec !== null) {
    const heightFt = forecastPoint.waveHeightFt / 10; // Convert from tenths to feet
    if (heightFt > 0) {
      const energy = calculateSwellEnergy(heightFt, forecastPoint.wavePeriodSec);
      candidates.push({
        height_ft: heightFt,
        period_s: forecastPoint.wavePeriodSec,
        direction_deg: forecastPoint.waveDirectionDeg,
        energy,
        type: 'primary',
      });
    }
  }

  // Secondary swell (stored as decimal string)
  if (forecastPoint.secondarySwellHeightFt !== null && forecastPoint.secondarySwellPeriodS !== null) {
    const heightFt = typeof forecastPoint.secondarySwellHeightFt === 'string'
      ? parseFloat(forecastPoint.secondarySwellHeightFt)
      : forecastPoint.secondarySwellHeightFt;
    if (!isNaN(heightFt) && heightFt > 0) {
      const energy = calculateSwellEnergy(heightFt, forecastPoint.secondarySwellPeriodS);
      candidates.push({
        height_ft: heightFt,
        period_s: forecastPoint.secondarySwellPeriodS,
        direction_deg: forecastPoint.secondarySwellDirectionDeg,
        energy,
        type: 'secondary',
      });
    }
  }

  // Wind waves (stored as decimal string)
  if (forecastPoint.windWaveHeightFt !== null && forecastPoint.windWavePeriodS !== null) {
    const heightFt = typeof forecastPoint.windWaveHeightFt === 'string'
      ? parseFloat(forecastPoint.windWaveHeightFt)
      : forecastPoint.windWaveHeightFt;
    if (!isNaN(heightFt) && heightFt > 0) {
      const energy = calculateSwellEnergy(heightFt, forecastPoint.windWavePeriodS);
      candidates.push({
        height_ft: heightFt,
        period_s: forecastPoint.windWavePeriodS,
        direction_deg: forecastPoint.windWaveDirectionDeg,
        energy,
        type: 'wind',
      });
    }
  }

  if (candidates.length === 0) {
    console.log('❌ [getDominantSwell] No valid swells found!');
    return null;
  }

  // CRITICAL FIX: Filter out blocked directions BEFORE selecting dominant swell
  // This prevents selecting a west swell (250-310°) that would be killed, resulting in 0ft
  const validCandidates = candidates.filter(c => !isDirectionBlocked(c.direction_deg));
  
  if (validCandidates.length === 0) {
    console.log('❌ [getDominantSwell] All swells are blocked by land (250-310° west)!');
    return null;
  }

  // Log energy comparison for valid (non-blocked) candidates
  console.log('📊 [getDominantSwell] Energy comparison (H²×T) - valid swells only:', validCandidates.map(c => ({
    type: c.type,
    height: c.height_ft.toFixed(1),
    period: c.period_s,
    energy: c.energy.toFixed(1),
    direction: c.direction_deg,
  })));

  // Sort by RAW ENERGY (H² × T) - highest energy wins
  // Only considering non-blocked directions
  const sorted = [...validCandidates].sort((a, b) => b.energy - a.energy);
  const winner = sorted[0];

  // NOW calculate breaking height for the winner, applying tide and directional penalties
  const breakingHeight = calculateBreakingWaveHeight(
    winner.height_ft,
    winner.period_s,
    profile,
    winner.direction_deg,
    tideHeightFt ?? null,
    tidePhase
  );

  const dominant: SwellComponent = {
    height_ft: winner.height_ft,
    period_s: winner.period_s,
    direction_deg: winner.direction_deg,
    energy: winner.energy,
    breaking_height: breakingHeight,
    type: winner.type,
    label: getSwellLabel(winner.period_s),
  };

  console.log('✅ [getDominantSwell] Selected dominant swell (by H²×T energy):', {
    type: dominant.type,
    label: dominant.label,
    height: dominant.height_ft.toFixed(1),
    period: dominant.period_s,
    direction: dominant.direction_deg,
    energy: dominant.energy.toFixed(1),
    breaking_height: dominant.breaking_height.toFixed(1),
  });

  return dominant;
}


/**
 * Calculate predicted breaking wave face height
 *
 * This function is called AFTER the dominant swell is selected by energy (H² × T).
 * It calculates the display height using period-based wave shoaling physics,
 * then applies tide adjustments and directional penalties.
 *
 * SELECTION vs DISPLAY:
 * - SELECTION: Uses H² × T energy formula (in getDominantSwell)
 * - DISPLAY: Uses H × (T/10) × spotMultiplier × tideMultiplier (this function)
 *
 * Formula (in order):
 * 1. Period-adjusted base height: H × (T / 10) - reflects wave shoaling physics
 * 2. Apply spot multiplier (Lido: 1.5x, Long Beach: 1.3x, Rockaway: 1.1x)
 * 3. Apply tide multiplier (high tide: 0.7x, low tide: 1.2x, interpolated between)
 * 4. Apply directional kill switch (250-310° West) → 0
 * 5. Apply directional wrap penalty (< 110° East) → 0.7x
 * 6. Round to nearest 0.1ft - ONLY at the very end
 * 7. Apply minimum floor of 0.1ft (if calculated > 0)
 *
 * Example: 3ft swell @ 15s at Lido (1.5x) = 3 × 1.5 × 1.5 = 6.75ft → 7ft
 * Example: 3ft swell @ 5s at Lido (1.5x) = 3 × 0.5 × 1.5 = 2.25ft → 2ft
 *
 * @param swellHeightFt - Offshore swell height in decimal feet (MUST be in feet)
 * @param periodS - Swell period in seconds
 * @param profile - Spot profile with multiplier
 * @param swellDirectionDeg - Swell direction in degrees (0-360) or null
 * @param tideHeightFt - Tide height in decimal feet (e.g., 3.5, not 35) or null
 * @param tidePhase - Tide phase: 'high', 'low', 'rising', 'falling', or null
 * @returns Predicted breaking wave face height in feet (rounded to 0.5ft)
 */
export function calculateBreakingWaveHeight(
  swellHeightFt: number,
  periodS: number,
  profile: SpotProfile,
  swellDirectionDeg?: number | null,
  tideHeightFt?: number | null,
  tidePhase?: string | null
): number {
  // Validate inputs are in correct units (feet, seconds)
  if (swellHeightFt < 0 || periodS <= 0) {
    console.log('⚠️ [calculateBreakingWaveHeight] Invalid input:', { swellHeightFt, periodS });
    return 0;
  }

  // Get spot key for multiplier calculation
  const spotKey = getSpotKey(profile.name) || profile.name.toLowerCase().replace(/\s+/g, '-');
  
  // Calculate physically accurate spot multiplier based on swell height and period
  const spotMultiplier = calculateSpotMultiplier(spotKey, swellHeightFt, periodS);

  console.log('🌊 [calculateBreakingWaveHeight] INPUT:', {
    swellHeightFt,
    periodS,
    swellDirectionDeg,
    tideHeightFt,
    tidePhase,
    spotName: profile.name,
    spotKey,
    spotMultiplier,
  });

  // STEP 1: Calculate period-adjusted base height
  // Formula: H × (T / 10) - reflects wave shoaling physics
  // A 15s groundswell breaks larger than a 5s wind swell of the same offshore height
  const periodFactor = periodS / 10;
  const periodAdjustedHeight = swellHeightFt * periodFactor;
  console.log('📊 [Period-Adjusted Height]:', periodAdjustedHeight.toFixed(2),
    `ft (${swellHeightFt.toFixed(1)} × ${periodFactor.toFixed(2)})`);

  // STEP 2: Apply Spot Multiplier
  // Each spot has different bathymetry that amplifies waves
  // Uses physically accurate period-based tier system with small swell damping
  let adjustedHeight = periodAdjustedHeight * spotMultiplier;
  console.log('🏖️ [Spot Multiplier]:', adjustedHeight.toFixed(2),
    `ft (${periodAdjustedHeight.toFixed(2)} × ${spotMultiplier})`);

  // STEP 3: Apply Tide Multiplier
  // High tide reduces breaking height (deeper water, submerged sandbars)
  // Low tide increases breaking height (shallow water, exposed sandbars)
  const tideMultiplier = getTideMultiplier(tideHeightFt ?? null);
  adjustedHeight = adjustedHeight * tideMultiplier;
  console.log('🌊 [Tide Multiplier]:', adjustedHeight.toFixed(2),
    `ft (tide: ${tideHeightFt?.toFixed(1) ?? 'N/A'}ft → ${tideMultiplier.toFixed(2)}x)`);

  // STEP 4: Check Directional Kill Switch (250° - 310°)
  // Western Long Island is shadowed by NJ/land - no surf from west
  // Applied AFTER period & multiplier so we can see the "potential" height in logs
  if (isDirectionBlocked(swellDirectionDeg ?? null)) {
    console.log('❌ [DIRECTIONAL KILL SWITCH]: West swell (250-310°) - returning 0');
    return 0;
  }

  // STEP 5: Apply Directional Wrap Penalty (< 110°)
  // East swells wrap around and lose energy
  const directionalPenalty = getDirectionalPenalty(swellDirectionDeg ?? null);
  if (directionalPenalty < 1.0) {
    adjustedHeight = adjustedHeight * directionalPenalty;
    console.log('🧭 [Directional Wrap Penalty]:', adjustedHeight.toFixed(2),
      `ft (East swell < 110° → ${directionalPenalty}x)`);
  }

  // STEP 6: Round to nearest 0.1ft - ONLY at the very end
  const rounded = Math.round(adjustedHeight * 10) / 10;
  console.log('✅ [FINAL Breaking Height]:', rounded, 'ft (rounded to 0.1ft)');

  // STEP 7: Apply minimum floor of 0.1ft (if calculated > 0)
  // Prevents 0.0ft display for very small but non-zero waves
  if (rounded > 0 && rounded < 0.1) {
    return 0.1;
  }

  return Math.max(0, rounded); // Ensure non-negative
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
