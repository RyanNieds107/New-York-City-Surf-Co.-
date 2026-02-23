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
 * Get period-quality factor for swell energy calculation
 *
 * SURF FORECASTER'S RULE: Period determines wave quality, not just size.
 * Short period "waves" are wind chop that creates messy conditions but
 * does NOT produce rideable surf on beach breaks.
 *
 * Period thresholds based on real-world surfability:
 * - < 5s: Pure wind chop - creates texture on water but not surfable waves
 * - 5-6s: Marginal wind swell - barely rideable, usually junky
 * - ≥ 7s: Actual swell - organized waves that break properly
 *
 * Example: 3ft @ 4s is NOT 3ft surf - it's choppy, disorganized slop.
 * Meanwhile, 1ft @ 9s is clean, organized, and actually rideable.
 *
 * @param periodS - Swell period in seconds
 * @returns Quality factor (0.0 for < 5s, 0.3 for 5-6s, 1.0 for >= 7s)
 */
export function getPeriodQualityFactor(periodS: number): number {
  if (periodS < 5) return 0.0;   // Pure wind chop - NOT surfable, exclude from selection
  if (periodS < 7) return 0.3;   // Marginal wind swell - heavily discounted
  return 1.0;                     // Actual swell - full weight
}

/**
 * Calculate swell energy using quadratic H² × T formula with period-quality penalty
 *
 * This is the PRIMARY metric for comparing swells.
 * Higher energy = more powerful waves that will produce larger surf.
 *
 * SURF FORECASTER'S RULE: Period is everything.
 * A 3ft @ 4s wind chop reading is NOT 3ft surf - it's unsurfable slop.
 * We apply aggressive period-quality factors to filter out wind chop
 * and ensure the displayed wave height reflects ACTUAL SURFABLE CONDITIONS.
 *
 * Real-world examples with updated quality factors:
 * - 3.3ft wind chop @ 4s: Energy = 3.3² × 4 × 0.0 = 0 (excluded - not surfable)
 * - 2.0ft wind swell @ 6s: Energy = 2.0² × 6 × 0.3 = 7.2 (discounted - marginal)
 * - 0.7ft actual swell @ 9s: Energy = 0.7² × 9 × 1.0 = 4.4 (full weight - clean swell)
 *
 * In this case, the 0.7ft @ 9s swell wins because it's actual organized swell,
 * not wind-generated chop that the model sees but surfers can't ride.
 *
 * @param heightFt - Swell height in feet (must be in feet for correct scale)
 * @param periodS - Swell period in seconds
 * @returns Energy value (dimensionless, for comparison only)
 */
export function calculateSwellEnergy(heightFt: number, periodS: number): number {
  // Ensure height is positive
  if (heightFt <= 0 || periodS <= 0) return 0;

  // Apply period-quality factor to exclude unsurfable wind chop
  const qualityFactor = getPeriodQualityFactor(periodS);
  return heightFt * heightFt * periodS * qualityFactor;
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
  // Block W → NW → N → NE (250° to 70°, wraps around 0°/360°)
  // Long Island south shore can only receive swells from E → SE → S (70° to 250°)
  return directionDeg >= 250 || directionDeg <= 70;
}

/**
 * Get directional penalty multiplier for a swell (east wrap)
 *
 * East swells (< 105°) wrap around and lose energy. Penalty is gradual by direction:
 * - 100-105°: 5% drop (0.95x)
 * - 95-99°: 10% drop (0.90x)
 * - 90-94°: 20% drop (0.80x)
 * - < 90°: 30% drop (0.70x)
 * - ≥ 105°: no penalty (1.0x)
 *
 * @param directionDeg - Swell direction in degrees (0-360) or null
 * @returns Penalty multiplier
 */
export function getDirectionalPenalty(directionDeg: number | null): number {
  if (directionDeg === null || directionDeg === undefined) return 1.0;
  if (directionDeg >= 105) return 1.0;
  if (directionDeg >= 100) return 0.95;  // 5% drop
  if (directionDeg >= 95) return 0.90;   // 10% drop
  if (directionDeg >= 90) return 0.80;   // 20% drop
  return 0.70;                          // 30% drop (< 90°)
}

/**
 * Get tide multiplier based on tide height and phase
 *
 * High tide reduces breaking wave height (waves break in deeper water, sandbars submerged,
 * inlet/canyon effects dampened). Low tide increases it (shallow water, sandbars exposed).
 * 
 * SPECIAL RULE FOR LIDO, LONG BEACH & ROCKAWAY:
 * - Rising tide between 1ft-2.1ft: 1.2x multiplier (20% boost)
 * - This is NOT a generic low tide multiplier, but specifically for rising tide conditions
 *
 * TIDE RANGES:
 * - <1.0ft: No boost (1.0x multiplier)
 * - Rising tide window (Lido, Long Beach & Rockaway): 1.0-2.1ft during rising tide: 1.2x boost
 * - Mid-tide (2.1-3.2ft): Linear interpolation from 1.2x to 0.85x
 * - High tide (>3.2ft): 0.7x penalty
 *
 * @param tideHeightFt - Tide height in decimal feet (e.g., 3.5, not 35) or null
 * @param tidePhase - Tide phase: 'high', 'low', 'rising', 'falling', or null
 * @param spotName - Spot name (e.g., "Lido Beach", "Long Beach", "Rockaway Beach")
 * @returns Multiplier to apply to breaking height
 */
export function getTideMultiplier(
  tideHeightFt: number | null,
  tidePhase?: string | null,
  spotName?: string | null
): number {
  // If no tide data, return neutral multiplier
  if (tideHeightFt === null || tideHeightFt === undefined) return 1.0;

  // SPECIAL RULE: Rising tide boost for Lido Beach, Long Beach, and Rockaway Beach
  // Only applies during rising tide between 1ft-2.1ft
  if (
    (spotName === "Lido Beach" || spotName === "Long Beach" || spotName === "Rockaway Beach") &&
    tidePhase === "rising" &&
    tideHeightFt >= 1.0 &&
    tideHeightFt <= 2.1
  ) {
    return 1.2; // 20% boost for rising tide conditions
  }

  // High tide (>3.2ft): spot-specific (Rockaway none, Lido 10%, Long Beach 20%, others none)
  if (tideHeightFt > 3.2) {
    if (spotName === "Rockaway Beach") return 1.0;   // No high-tide penalty
    if (spotName === "Lido Beach") return 0.9;      // 10% reduction
    if (spotName === "Long Beach") return 0.8;     // 20% reduction
    return 1.0;                                    // No penalty for any other spot
  }

  // Mid-tide (2.1-3.2ft): Linear interpolation from 1.2 to 0.85
  // This ensures mid-tide doesn't have the same penalty as high tide
  if (tideHeightFt >= 2.1 && tideHeightFt <= 3.2) {
    const range = 3.2 - 2.1; // 1.1ft range
    const position = (tideHeightFt - 2.1) / range; // 0 to 1 (0 at 2.1ft, 1 at 3.2ft)
    // Interpolate from 1.2 at 2.1ft to 0.85 at 3.2ft (not all the way to 0.7)
    // This leaves room for high tide (>3.2ft) to have the 0.7x penalty
    return 1.2 - (position * 0.35); // 1.2 - 0.35 = 0.85 at 3.2ft
  }

  // Below 2.1ft (but not in special rising tide window): 
  // Interpolate from neutral (1.0x) at very low tide to 1.2x at 2.1ft
  if (tideHeightFt < 2.1) {
    if (tideHeightFt < 1.0) {
      // Very low tide (<1.0ft): No boost
      return 1.0;
    }
    // 1.0-2.1ft range (but not special rising tide case): 
    // Interpolate from 1.0x at 1.0ft to 1.2x at 2.1ft
    const range = 2.1 - 1.0; // 1.1ft range
    const position = (tideHeightFt - 1.0) / range; // 0 to 1
    return 1.0 + (position * 0.2); // Interpolate from 1.0 to 1.2
  }

  // Default fallback (shouldn't reach here)
  return 1.0;
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
 * DYNAMIC PERIOD SELECTION: If buoyPeriodS is provided (from NOAA buoy), it will be
 * passed to calculateBreakingWaveHeight for more accurate period-based amplification.
 *
 * @param forecastPoint - Forecast point with all swell components
 * @param profile - Spot profile with multiplier for breaking height calculation
 * @param tideHeightFt - Tide height in decimal feet (e.g., 3.5, not 35) or null
 * @param tidePhase - Tide phase: 'high', 'low', 'rising', 'falling', or null
 * @param buoyPeriodS - Optional: NOAA buoy dominant period in seconds (for Dynamic Period Selection)
 * @returns Dominant swell component with breaking_height calculated, or null if no valid data
 */
export function getDominantSwell(
  forecastPoint: ForecastPoint,
  profile: SpotProfile,
  tideHeightFt?: number | null,
  tidePhase?: string | null,
  buoyPeriodS?: number | null
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

  // NEW: Classify swells as groundswell (period ≥ 7s) vs wind swell (period < 7s)
  // Prefer groundswell when it's ≥ 1.0ft offshore height
  const groundswells = validCandidates.filter(c => c.period_s >= 7 && c.height_ft >= 1.0);

  let winner: SwellCandidate;

  if (groundswells.length > 0) {
    // Select highest energy groundswell (prefer quality swell over wind chop)
    const sortedGroundswells = [...groundswells].sort((a, b) => b.energy - a.energy);
    winner = sortedGroundswells[0];

    console.log('🌊 [getDominantSwell] GROUNDSWELL PREFERENCE: Found qualifying groundswells (period ≥7s, height ≥1.0ft):', groundswells.map(c => ({
      type: c.type,
      height: c.height_ft.toFixed(1),
      period: c.period_s,
      energy: c.energy.toFixed(1),
    })));
    console.log('✅ [getDominantSwell] Selected groundswell:', {
      type: winner.type,
      height: winner.height_ft.toFixed(1),
      period: winner.period_s,
      energy: winner.energy.toFixed(1),
    });
  } else {
    // Fall back to energy-based selection among all valid swells
    const sorted = [...validCandidates].sort((a, b) => b.energy - a.energy);
    winner = sorted[0];

    // Log energy comparison for valid (non-blocked) candidates
    // Energy now includes period-quality factor: H² × T × quality_factor
    console.log('📊 [getDominantSwell] Energy comparison (H²×T×quality) - valid swells only (no qualifying groundswells):', validCandidates.map(c => ({
      type: c.type,
      height: c.height_ft.toFixed(1),
      period: c.period_s,
      qualityFactor: getPeriodQualityFactor(c.period_s),
      energy: c.energy.toFixed(1),
      direction: c.direction_deg,
    })));
  }

  // NOW calculate breaking height for the winner, applying tide and directional penalties
  // Pass through buoyPeriodS for Dynamic Period Selection if available
  const breakingHeight = calculateBreakingWaveHeight(
    winner.height_ft,
    winner.period_s,
    profile,
    winner.direction_deg,
    tideHeightFt ?? null,
    tidePhase,
    buoyPeriodS
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
 * - DISPLAY: Uses H × (T/9)^0.5 × directionMultiplier × spotMultiplier × tideMultiplier (this function)
 *
 * DYNAMIC PERIOD SELECTION:
 * If buoyPeriodS is provided (from NOAA buoy), it will be used instead of periodS
 * for the breaking height calculation. This allows using more accurate real-time
 * period data from the buoy while still using Open-Meteo for wave height.
 *
 * Formula (in order):
 * 1. Period-adjusted base height: H × (T / 7)^0.5 - power function with 7s baseline
 * 2. Apply spot multiplier (Lido: 1.1x + 0.1 for >10s, Long Beach: 1.05x + 0.1 for >10s, Rockaway: 1.1x + 0.1 for >10s)
 * 3. Apply tide multiplier (special: Lido/Long Beach/Rockaway rising tide 1-2.1ft: 1.2x, mid-tide 2.1-3.2ft: interpolated 1.2x-0.85x, high tide >3.2ft: 0.7x)
 * 4. Apply directional kill switch (250-310° West) → 0
 * 5. Apply directional wrap penalty (< 110° East) → 0.7x
 * 6. Round to nearest 0.1ft - ONLY at the very end
 * 7. Apply minimum floor of 0.1ft (if calculated > 0)
 *
 * Example: 2.5ft @ 8s at Lido (1.2x) = 2.5 × (8/9)^0.5 × 1.2 = 2.5 × 0.94 × 1.2 = 2.82ft
 * Example: 3ft @ 14s at Lido (1.5x) = 3 × (14/9)^0.5 × 1.5 = 3 × 1.25 × 1.5 = 5.63ft
 *
 * @param swellHeightFt - Offshore swell height in decimal feet (MUST be in feet)
 * @param periodS - Swell period in seconds (from Open-Meteo or forecast data)
 * @param profile - Spot profile with multiplier
 * @param swellDirectionDeg - Swell direction in degrees (0-360) or null
 * @param tideHeightFt - Tide height in decimal feet (e.g., 3.5, not 35) or null
 * @param tidePhase - Tide phase: 'high', 'low', 'rising', 'falling', or null
 * @param buoyPeriodS - Optional: NOAA buoy dominant period in seconds (takes precedence over periodS if provided)
 * @returns Predicted breaking wave face height in feet (rounded to 0.1ft)
 */
export function calculateBreakingWaveHeight(
  swellHeightFt: number,
  periodS: number,
  profile: SpotProfile,
  swellDirectionDeg?: number | null,
  tideHeightFt?: number | null,
  tidePhase?: string | null,
  buoyPeriodS?: number | null
): number {
  // DYNAMIC PERIOD SELECTION: Use NOAA buoy period if available
  // The buoy provides more accurate real-time period data than Open-Meteo's modeled period
  const effectivePeriod = buoyPeriodS != null && buoyPeriodS > 0 ? buoyPeriodS : periodS;
  
  if (buoyPeriodS != null && buoyPeriodS > 0 && buoyPeriodS !== periodS) {
    console.log(`🔄 [Dynamic Period Selection] Using NOAA buoy period ${buoyPeriodS}s instead of Open-Meteo ${periodS}s`);
  }
  
  // Validate inputs are in correct units (feet, seconds)
  if (swellHeightFt < 0 || effectivePeriod <= 0) {
    console.log('⚠️ [calculateBreakingWaveHeight] Invalid input:', { swellHeightFt, effectivePeriod, originalPeriodS: periodS, buoyPeriodS });
    return 0;
  }

  // SURF FORECASTER'S RULE: Period < 5s is NOT surfable
  // Even if the model reports 3ft @ 4s, that's choppy wind slop, not rideable waves.
  // We cap the height contribution from short-period chop to prevent misleading forecasts.
  if (effectivePeriod < 5) {
    console.log(`⚠️ [calculateBreakingWaveHeight] Period ${effectivePeriod}s < 5s is wind chop, not surfable waves. Returning 0.`);
    return 0;
  }

  // Get spot key for multiplier calculation
  const spotKey = getSpotKey(profile.name) || profile.name.toLowerCase().replace(/\s+/g, '-');
  
  // Calculate physically accurate spot multiplier based on swell height and period
  // Uses effectivePeriod (NOAA buoy period if available) for groundswell bonus calculation
  const spotMultiplier = calculateSpotMultiplier(spotKey, swellHeightFt, effectivePeriod);

  console.log('🌊 [calculateBreakingWaveHeight] INPUT:', {
    swellHeightFt,
    periodS,
    effectivePeriod,
    buoyPeriodS: buoyPeriodS ?? 'N/A',
    swellDirectionDeg,
    tideHeightFt,
    tidePhase,
    spotName: profile.name,
    spotKey,
    spotMultiplier,
  });

  // STEP 1: Calculate period-adjusted base height using power function
  // Formula: H × (T / 7)^0.5 - power function with 7s baseline
  // A 7s swell has multiplier of 1.0; 8s is ~1.07x, 14s is ~1.41x (longer period = bigger break)
  // Uses effectivePeriod (NOAA buoy period if available) for more accurate amplification
  const periodBaseline = 7;
  const periodFactor = Math.pow(effectivePeriod / periodBaseline, 0.5);
  const periodAdjustedHeight = swellHeightFt * periodFactor;
  
  console.log('📊 [Period-Adjusted Height]:', periodAdjustedHeight.toFixed(2),
    `ft (${swellHeightFt.toFixed(1)} × (${effectivePeriod}/${periodBaseline})^0.5 = ${periodFactor.toFixed(3)})`);

  // Test cases for verification
  if ((Math.abs(swellHeightFt - 2.5) < 0.1 && Math.abs(effectivePeriod - 8) < 0.1) ||
      (Math.abs(swellHeightFt - 3.0) < 0.1 && Math.abs(effectivePeriod - 6) < 0.1)) {
    console.log('🧪 [TEST CASE]', {
      input: `${swellHeightFt.toFixed(1)}ft @ ${effectivePeriod}s`,
      periodFactor: periodFactor.toFixed(3),
      periodAdjustedHeight: periodAdjustedHeight.toFixed(2),
      expected: effectivePeriod === 8 ? '~2.35-2.5ft' : '~2.4ft'
    });
  }

  // STEP 2: Apply Spot Multiplier
  // Each spot has different bathymetry that amplifies waves
  // Uses physically accurate period-based tier system with small swell damping
  let adjustedHeight = periodAdjustedHeight * spotMultiplier;
  console.log('🏖️ [Spot Multiplier]:', adjustedHeight.toFixed(2),
    `ft (${periodAdjustedHeight.toFixed(2)} × ${spotMultiplier})`);

  // STEP 3: Apply Tide Multiplier
  // High tide reduces breaking height (deeper water, submerged sandbars)
  // Low tide increases breaking height (shallow water, exposed sandbars)
  // SPECIAL: Lido, Long Beach & Rockaway get 1.2x boost during rising tide (1ft-2.1ft only)
  const tideMultiplier = getTideMultiplier(
    tideHeightFt ?? null,
    tidePhase ?? null,
    profile.name
  );
  // Suppress tide penalty on big surf (>3ft): high tide won't flatten it at Lido/Long Beach
  const effectiveTideMultiplier = adjustedHeight > 3.0 ? Math.max(1.0, tideMultiplier) : tideMultiplier;
  adjustedHeight = adjustedHeight * effectiveTideMultiplier;
  console.log('🌊 [Tide Multiplier]:', adjustedHeight.toFixed(2),
    `ft (tide: ${tideHeightFt?.toFixed(1) ?? 'N/A'}ft ${tidePhase ?? ''} → effective: ${effectiveTideMultiplier.toFixed(2)}x${adjustedHeight > 3.0 && tideMultiplier < 1.0 ? ' [penalty suppressed: big surf]' : ''})`);

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
 * Calculate breaking wave height from NOAA buoy data
 *
 * Uses a simpler shoaling-based formula for real buoy observations,
 * NOT the model correction formula used for Open-Meteo forecasts.
 *
 * Formula: Breaking_Height = Buoy_Height × Ks × Groundswell_Factor × Direction × Tide
 *
 * @param buoyHeightFt - Buoy swell height in feet (from NOAA 44065)
 * @param periodS - Swell period in seconds
 * @param spotName - Spot name for tide adjustments
 * @param swellDirectionDeg - Swell direction in degrees (0-360) or null
 * @param tideHeightFt - Tide height in decimal feet or null
 * @param tidePhase - Tide phase: 'rising', 'falling', etc. or null
 * @returns Predicted breaking wave height in feet
 */
export function calculateBuoyBreakingWaveHeight(
  buoyHeightFt: number,
  periodS: number,
  spotName?: string,
  swellDirectionDeg?: number | null,
  tideHeightFt?: number | null,
  tidePhase?: string | null
): number {
  // STEP 1: Check directional kill switch (250-310° West)
  if (isDirectionBlocked(swellDirectionDeg ?? null)) {
    return 0;
  }

  // STEP 2: Shoaling coefficient for 44065 buoy (15 NM offshore)
  // Accounts for energy loss over continental shelf (NY Bight effect)
  const Ks = 0.75;

  // STEP 3: Period-based groundswell factor
  let groundswellFactor = 1.0;
  if (periodS > 12) {
    groundswellFactor = 1.0 + Math.min((periodS - 12) / 20, 0.15);
  }

  let breakingHeight = buoyHeightFt * Ks * groundswellFactor;

  // STEP 4: Apply directional wrap penalty (<110° East)
  const directionalPenalty = getDirectionalPenalty(swellDirectionDeg ?? null);
  breakingHeight = breakingHeight * directionalPenalty;

  // STEP 5: Apply tide multiplier for Lido and Long Beach ONLY
  // Rockaway excluded: its bathymetry handles high tide better (no penalty) and doesn't need low tide boost
  if (spotName === "Lido Beach" || spotName === "Long Beach") {
    const tideMultiplier = getTideMultiplier(tideHeightFt ?? null, tidePhase, spotName);
    // Suppress tide penalty on big surf (>3ft): high tide won't flatten it
    const effectiveTideMultiplier = breakingHeight > 3.0 ? Math.max(1.0, tideMultiplier) : tideMultiplier;
    breakingHeight = breakingHeight * effectiveTideMultiplier;
  }

  return Math.round(breakingHeight * 10) / 10;
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
