/**
 * Quality Rating Scorer
 * 
 * Calculates quality rating (0-100 score) from swell, direction, tide, and wind data.
 * Converts score to human-readable rating categories.
 */

import type { SpotProfile } from './spotProfiles';
import type { ForecastPoint } from '../../drizzle/schema';
import { calculateBreakingWaveHeight } from './waveHeight';

export interface QualityBreakdown {
  swell_quality: number; // 0-60 points
  direction: number; // -20 to 0 points (penalty-only model)
  tide: number; // -20 to 20 points
  wind: number; // -60 to +20 points (harsh penalties for onshore winds)
}

export interface QualityScoreResult {
  score: number; // 0-100 (after clamps)
  rating: string; // "Don't Bother", "Worth a Look", "Go Surf", "Firing", "All-Time"
  breakdown: QualityBreakdown;
  reason: string; // Human-readable explanation
}

/**
 * Score swell quality based on predicted breaking wave height
 * 
 * Maps breaking height to 0-60 points using buckets (boosted to compensate for penalty-only direction):
 * - < 1.0ft: 5 points (flat)
 * - 1.0-1.9ft: 20 points (small but rideable)
 * - 2.0-2.9ft: 35 points (fun size)
 * - 3.0-4.9ft: 50 points (good size)
 * - >= 5.0ft: 60 points (pumping)
 * 
 * @param breakingHeightFt - Predicted breaking wave height in feet
 * @returns Score from 0-60
 */
function scoreSwellQualityByBreakingHeight(breakingHeightFt: number): number {
  if (breakingHeightFt < 1.0) {
    return 5; // flat
  } else if (breakingHeightFt < 2.0) {
    return 20; // small but rideable
  } else if (breakingHeightFt < 3.0) {
    return 35; // fun size
  } else if (breakingHeightFt < 5.0) {
    return 50; // good size
  } else {
    return 60; // pumping
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
 * Calculate direction score using penalty-only "Waterfall" model
 * 
 * Returns -20 to 0 points (penalty-only system):
 * - Start with 0 (no penalty)
 * - Hard blocks (deal breakers) return maximum penalties
 * - Tolerance check applies standard drift penalty if outside tolerance
 * 
 * Logic:
 * 1. Check hard blocks first (deal breakers):
 *    - West Block (247.5° to 292.5°): Return -20 (Max Penalty)
 *    - East Wrap: Gradual penalty by band (matches breaking-height bands)
 *      - 100-104°: -5, 95-99°: -8, 90-94°: -12, <90°: -15
 * 2. Check tolerance (only if not in east wrap band):
 *    - If distance <= tolerance: Return 0 (No Penalty)
 *    - If distance > tolerance: Return -10 (Standard Drift Penalty)
 * 3. Null direction: Return 0 (neutral, no penalty)
 * 
 * @param swellDirectionDeg - Swell direction in degrees (0-360) or null
 * @param profile - Spot profile with target and tolerance
 * @returns Score from -20 to 0 (penalty-only)
 */
export function scoreDirection(
  swellDirectionDeg: number | null,
  profile: SpotProfile
): number {
  // Start with 0 (no penalty)
  // Null direction = neutral, no penalty
  if (swellDirectionDeg === null) {
    return 0; // neutral when no direction data
  }

  // CHECK HARD BLOCKS FIRST (The "Deal Breakers")
  // NOTE: Most blocked directions (250-70°) are filtered out by isDirectionBlocked()
  // in getDominantSwell() before reaching this scoring function. These penalties serve
  // as backup validation and documentation of why certain directions are problematic.

  // West Block (247.5° to 292.5°): Blocked by landmass, no real surf
  const isWestSwell = swellDirectionDeg >= 247.5 && swellDirectionDeg <= 292.5;
  if (isWestSwell) {
    return -20; // Max Penalty - West swells don't produce real surf
  }

  // NW Block (292.5° to 330°): Coming from behind/blocked on south-facing beaches
  // These are typically wind-generated local chop, not real groundswell
  const isNWSwell = swellDirectionDeg > 292.5 && swellDirectionDeg <= 330;
  if (isNWSwell) {
    return -18; // Major Penalty - NW swells don't wrap properly to south-facing beaches
  }

  // East Wrap: Gradual penalty by direction band (matches breaking-height bands)
  if (swellDirectionDeg < 105) {
    if (swellDirectionDeg >= 100) return -5;   // 100-104°
    if (swellDirectionDeg >= 95) return -8;   // 95-99°
    if (swellDirectionDeg >= 90) return -12;  // 90-94°
    return -15;                               // < 90°
  }

  // CHECK TOLERANCE (only if not in east wrap band)
  const target = profile.swell_target_deg;
  const tolerance = profile.swell_tolerance_deg;
  const distance = calculateAngularDistance(swellDirectionDeg, target);

  if (distance <= tolerance) {
    return 0; // No Penalty - within ideal tolerance
  } else {
    return -10; // Standard Drift Penalty - outside tolerance
  }
  }

/**
 * Calculate Tide Push multiplier for overall quality score
 * 
 * A "Tide Push" occurs when the tide is rising AND the current tide height is between 0 ft and 3 ft.
 * If a Tide Push is active AND breakingHeightFt >= 3.0 ft, apply a multiplier to the score.
 * 
 * - Standard Push: For swells between 3.0 ft and 5.0 ft, apply a 1.15x multiplier
 * - Heavy Push: For swells strictly greater than 5.0 ft, apply a 1.25x multiplier
 *   (the incoming tide adds significantly more power to larger swells)
 * 
 * @param tidePhase - Tide phase: 'rising', 'falling', 'high', 'low', or null
 * @param tideFt - Tide height in feet
 * @param breakingHeightFt - Predicted breaking wave height in feet
 * @returns Multiplier (1.0, 1.15, or 1.25)
 */
export function calculateTidePushMultiplier(
  tidePhase: string | null,
  tideFt: number,
  breakingHeightFt: number
): number {
  // Check if Tide Push is active: tide is rising AND tide height is between 0-3ft
  const isTidePush = tidePhase === 'rising' && tideFt > 0 && tideFt <= 3.0;

  // If Tide Push is active AND breaking height is sufficient
  if (isTidePush && breakingHeightFt >= 3.0) {
    if (breakingHeightFt > 5.0) {
      return 1.25; // Heavy Push (swells >5ft get more power from incoming tide)
    } else {
      return 1.15; // Standard Push (swells 3.0-5.0ft)
    }
  }

  // No Tide Push multiplier
  return 1.0;
}

/**
 * Score tide quality for Western Long Island beaches
 *
 * Uses breakingHeightFt-aware scoring with spot-specific logic:
 * - Tide > 5.0ft, Any: -20 (Shorebreak - Universal penalty)
 * - Tide 4.0-5.0ft, ≥4.0ft: 10 (Marginal - Too high even for big swells)
 * - Tide 4.0-5.0ft, <4.0ft: 4 (Mushy - Too deep for small waves)
 * - Tide 3.5-4.0ft: Spot-specific
 *   - Lido/Long Beach: <3.0ft waves get -10 penalty, ≥4.0ft get +15
 *   - Rockaway: ≥4.0ft get +15, <4.0ft get +4
 * - Tide 2.5-3.5ft, ≥4.0ft: 20 (Optimal - Perfect for big swells)
 * - Tide 2.5-3.5ft, <4.0ft: 15 (Good - Acceptable for small waves)
 * - Tide ≤2.5ft, ≥4.0ft: 15 (Good - Acceptable for big swells)
 * - Tide ≤2.5ft, <4.0ft: 20 (Optimal - Perfect for small/medium waves)
 *
 * @param tideFt - Tide height in feet
 * @param breakingHeightFt - Predicted breaking wave height in feet
 * @param spotName - Optional spot name for spot-specific logic
 * @returns Score from -20 to 20
 */
export function scoreTide(tideFt: number, breakingHeightFt: number, spotName?: string): number {
  // Universal shore-break penalty: too deep, waves break on shore
  if (tideFt > 5.0) {
    return -20; // Shorebreak (Universal penalty)
  }

  // Tide 4.0-5.0ft: Generally too high
  if (tideFt > 4.0) {
    if (breakingHeightFt >= 4.0) {
      return 10; // Marginal (Too high even for big swells)
    } else {
      return 4; // Mushy (Too deep for small waves)
    }
  }

  // Tide 3.5-4.0ft: SPOT-SPECIFIC logic
  if (tideFt > 3.5) {
    // Lido Beach & Long Beach: Penalize small waves at high tide
    if (spotName === "Lido Beach" || spotName === "Long Beach") {
      if (breakingHeightFt < 3.0) {
        return -10; // Negative penalty for small waves at high tide
      } else if (breakingHeightFt >= 4.0) {
        return 15; // Acceptable (Upper range for big swells)
      } else {
        return 4; // Mushy (3-4ft range)
      }
    }
    // Rockaway Beach: Keep original logic
    else {
      if (breakingHeightFt >= 4.0) {
        return 15; // Acceptable (Upper range for big swells)
      } else {
        return 4; // Mushy (Too deep for small waves)
      }
    }
  }

  // Tide 2.5-3.5ft: Optimal for BIG swells (≥4ft), good for small swells
  if (tideFt > 2.5) {
    if (breakingHeightFt >= 4.0) {
      return 20; // Optimal (Perfect for big swells)
    } else {
      return 15; // Good (Acceptable for small waves)
    }
  }

  // Tide ≤2.5ft: Optimal for SMALL swells (<4ft), good for big swells
  if (breakingHeightFt >= 4.0) {
    return 15; // Good (Acceptable for big swells)
  } else {
    return 20; // Optimal (Perfect for small/medium waves)
  }
}

// ============================================================================
// WIND DIRECTION TIER HELPER FUNCTIONS (8-Tier System)
// Shared by all spot scoring functions and capping logic.
// All south-facing Long Island beaches (Lido, Long Beach, Rockaway) face ~180°.
// ============================================================================

/**
 * Tier 1 — Premium Offshore (330–20°): N, NNW, NN
 * E (core)
 * Best possible wind for south-facing beaches.
 */
function isPremiumOffshore(windDir: number): boolean {
  const normalized = ((windDir % 360) + 360) % 360;
  return normalized >= 330 || normalized <= 20;
}

/**
 * Tier 2 — Solid Offshore NW (310–329°, plus 21–34° NNE transition): NW + NNE fringe
 * Very good offshore, slightly off the ideal N axis.
 */
function isSolidOffshoreNW(windDir: number): boolean {
  const normalized = ((windDir % 360) + 360) % 360;
  return (normalized >= 310 && normalized < 330) || (normalized >= 21 && normalized <= 34);
}

/**
 * Tier 3 — Okay Offshore NE (35–50°): NE
 * Decent offshore but notably weaker than NW, especially on small swells (<4ft).
 */
function isOkayOffshoreNE(windDir: number): boolean {
  const normalized = ((windDir % 360) + 360) % 360;
  return normalized >= 35 && normalized <= 50;
}

/**
 * Any offshore direction (Tiers 1–3, 310–50°): for bonus/cap logic
 */
function isAnyOffshore(windDir: number): boolean {
  const normalized = ((windDir % 360) + 360) % 360;
  return normalized >= 310 || normalized <= 50;
}

/**
 * Tier 4 — Solid Side-Offshore WNW (290–309°): WNW
 * Best non-offshore wind for Rockaway; acceptable for Lido/Long Beach at low speeds.
 */
function isSolidSideOffshoreWNW(windDir: number): boolean {
  const normalized = ((windDir % 360) + 360) % 360;
  return normalized >= 290 && normalized < 310;
}

/**
 * Tier 5 — BAD Side-Offshore ENE (51–70°): ENE
 * Poor for all south-facing beaches — angle creates chop with no cleanup benefit.
 */
function isBadSideOffshoreENE(windDir: number): boolean {
  const normalized = ((windDir % 360) + 360) % 360;
  return normalized > 50 && normalized <= 70;
}

/**
 * Tier 6 — Not-great Side-Shore E (71–110°): E
 * Cross-shore from the east; adds chop, no offshore component.
 */
function isNotGreatSideShoreE(windDir: number): boolean {
  const normalized = ((windDir % 360) + 360) % 360;
  return normalized > 70 && normalized <= 110;
}

/**
 * Tier 7 — Better Side-Shore W (260–289°): W
 * Cross-shore from the west; less problematic than E, best side-shore for Rockaway.
 */
function isBetterSideShoreW(windDir: number): boolean {
  const normalized = ((windDir % 360) + 360) % 360;
  return normalized >= 260 && normalized < 290;
}

// Tier 8 — Onshore ALL BAD (111–259°): ESE through WSW
// No helper needed — it's the else/fallthrough case in scoring functions.
// Range expanded from old 135–225° to include ESE (110°) and WSW (225–259°).

/**
 * Lido Beach-specific wind scoring — 8-Tier System
 *
 * Hierarchy for south-facing beach (best to worst):
 * 1. Premium Offshore (330–34°): N, NNE, NNW — best
 * 2. Solid Offshore NW (310–329°): NW
 * 3. Okay Offshore NE (35–50°): NE — weaker, wave-size dependent
 * 4. Solid Side-Offshore WNW (290–309°): WNW
 * 5. BAD Side-Offshore ENE (51–70°): ENE
 * 6. Not-great Side-Shore E (71–110°): E
 * 7. Better Side-Shore W (260–289°): W
 * 8. Onshore ALL BAD (111–259°): ESE through WSW
 *
 * TIER 1 — Premium Offshore (330–34°): +20 | +15 | +10 | +5 (>25kts)
 * TIER 2 — Solid Offshore NW (310–329°): +18 | +12 | +8
 * TIER 3 — Okay Offshore NE (35–50°): wave-size dependent
 *   ≥4ft: +8 | +4 | 0    <4ft: +3 | 0 | -5
 * TIER 4 — Solid Side-Offshore WNW (290–309°): +5 | 0 | -15 | -30
 * TIER 5 — BAD Side-Offshore ENE (51–70°): -5 | -20 | -40 | -55
 * TIER 6 — Not-great Side-Shore E (71–110°): -12 | -25 | -45
 * TIER 7 — Better Side-Shore W (260–289°): -8 | -20 | -40
 * TIER 8 — Onshore ALL BAD (111–259°): -10 | -45 | -60
 *
 * @param windSpeedKt - Wind speed in knots
 * @param windDirectionDeg - Wind direction in degrees (0-360)
 * @param breakingHeightFt - Breaking wave height in feet (for NE wave-size logic)
 * @returns Score from -60 to +20
 */
function getWindQualityForLido(windSpeedKt: number, windDirectionDeg: number, breakingHeightFt: number = 0): number {
  const normalized = ((windDirectionDeg % 360) + 360) % 360;

  console.log('🔍 [getWindQualityForLido] Lido wind scoring:', {
    windSpeedKt: windSpeedKt.toFixed(1),
    windDirectionDeg,
    normalized: normalized.toFixed(1),
    breakingHeightFt: breakingHeightFt.toFixed(2),
  });

  // TIER 1 — Premium Offshore (330–34°): N, NNE, NNW
  if (isPremiumOffshore(normalized)) {
    let score: number;
    if (windSpeedKt <= 12) score = 20;
    else if (windSpeedKt <= 18) score = 15;
    else if (windSpeedKt <= 25) score = 10;
    else score = 5;
    console.log('🔍 [getWindQualityForLido] TIER 1 Premium Offshore:', score);
    return score;
  }

  // TIER 2 — Solid Offshore NW (310–329°): NW
  if (isSolidOffshoreNW(normalized)) {
    let score: number;
    if (windSpeedKt <= 12) score = 18;
    else if (windSpeedKt <= 18) score = 12;
    else score = 8;
    console.log('🔍 [getWindQualityForLido] TIER 2 Solid Offshore NW:', score);
    return score;
  }

  // TIER 3 — Okay Offshore NE (35–50°): wave-size dependent
  if (isOkayOffshoreNE(normalized)) {
    const isBigWave = breakingHeightFt >= 4.0;
    let score: number;
    if (isBigWave) {
      if (windSpeedKt <= 12) score = 8;
      else if (windSpeedKt <= 18) score = 4;
      else score = 0;
    } else {
      if (windSpeedKt <= 12) score = 3;
      else if (windSpeedKt <= 18) score = 0;
      else score = -5;
    }
    console.log('🔍 [getWindQualityForLido] TIER 3 Okay Offshore NE:', score, `(wave: ${isBigWave ? '≥4ft' : '<4ft'})`);
    return score;
  }

  // TIER 4 — Solid Side-Offshore WNW (290–309°)
  if (isSolidSideOffshoreWNW(normalized)) {
    let score: number;
    if (windSpeedKt <= 10) score = 5;
    else if (windSpeedKt < 15) score = 0;
    else if (windSpeedKt < 20) score = -15;
    else score = -30;
    console.log('🔍 [getWindQualityForLido] TIER 4 Solid Side-Offshore WNW:', score);
    return score;
  }

  // TIER 5 — BAD Side-Offshore ENE (51–70°)
  if (isBadSideOffshoreENE(normalized)) {
    let score: number;
    if (windSpeedKt <= 10) score = -5;
    else if (windSpeedKt < 15) score = -20;
    else if (windSpeedKt < 20) score = -40;
    else score = -55;
    console.log('🔍 [getWindQualityForLido] TIER 5 BAD Side-Offshore ENE:', score);
    return score;
  }

  // TIER 6 — Not-great Side-Shore E (71–110°)
  if (isNotGreatSideShoreE(normalized)) {
    let score: number;
    if (windSpeedKt <= 10) score = -12;
    else if (windSpeedKt <= 18) score = -25;
    else score = -45;
    console.log('🔍 [getWindQualityForLido] TIER 6 Not-great Side-Shore E:', score);
    return score;
  }

  // TIER 7 — Better Side-Shore W (260–289°)
  if (isBetterSideShoreW(normalized)) {
    let score: number;
    if (windSpeedKt <= 10) score = -8;
    else if (windSpeedKt < 15) score = -20;
    else score = -40;
    console.log('🔍 [getWindQualityForLido] TIER 7 Better Side-Shore W:', score);
    return score;
  }

  // TIER 8 — Onshore ALL BAD (111–259°): ESE through WSW
  let score: number;
  if (windSpeedKt <= 6) score = -10;
  else if (windSpeedKt <= 10) score = -45;
  else score = -60;
  console.log('🔍 [getWindQualityForLido] TIER 8 Onshore ALL BAD:', score);
  return score;
}

/**
 * Calculate offshore small wave bonus for Lido Beach
 *
 * Applies bonus when:
 * - Breaking height < 2.5ft (small waves)
 * - Wind is offshore
 * - Period >= 8s (quality swell)
 *
 * Bonus values:
 * - Premium offshore (330-30°) + period ≥ 8s: +15 points
 * - Good offshore (310-50°) + period ≥ 8s: +10 points
 * - Any other offshore + period ≥ 8s: +5 points
 *
 * @param breakingHeightFt - Predicted breaking wave height in feet
 * @param windDirectionDeg - Wind direction in degrees (0-360)
 * @param windSpeedKt - Wind speed in knots
 * @param periodS - Swell period in seconds
 * @returns Bonus points (0 to +15)
 */
function getOffshoreSmallWaveBonus(
  breakingHeightFt: number,
  windDirectionDeg: number | null,
  windSpeedKt: number | null,
  periodS: number
): number {
  // Only applies when breaking height < 2.5ft
  if (breakingHeightFt >= 2.5) {
    return 0;
  }

  // Need valid wind data
  if (windDirectionDeg === null || windSpeedKt === null) {
    return 0;
  }

  // Period must be >= 8s for quality swell
  if (periodS < 8) {
    return 0;
  }

  const normalized = ((windDirectionDeg % 360) + 360) % 360;

  // Premium offshore (330-30°) + period ≥ 8s: +15 points
  if (isPremiumOffshore(normalized)) {
    console.log('🔍 [getOffshoreSmallWaveBonus] Premium offshore small wave bonus: +15');
    return 15;
  }

  // Solid Offshore NW (310–329°) + period ≥ 8s: +10 points
  if (isSolidOffshoreNW(normalized)) {
    console.log('🔍 [getOffshoreSmallWaveBonus] Solid Offshore NW small wave bonus: +10');
    return 10;
  }

  // Okay Offshore NE (35–50°) + period ≥ 8s: +5 points (NE less effective on small days)
  if (isOkayOffshoreNE(normalized)) {
    console.log('🔍 [getOffshoreSmallWaveBonus] Okay Offshore NE small wave bonus: +5');
    return 5;
  }

  // Solid Side-Offshore WNW (290–309°) + period ≥ 8s: +3 points
  if (isSolidSideOffshoreWNW(normalized)) {
    console.log('🔍 [getOffshoreSmallWaveBonus] Solid Side-Offshore WNW small wave bonus: +3');
    return 3;
  }

  return 0;
}

/**
 * Score wind quality for Long Island south shore beaches (Long Beach, Rockaway)
 *
 * Uses the 8-tier wind direction system. Lido Beach is handled by getWindQualityForLido().
 *
 * TIER 1 — Premium Offshore (330–34°): +20 | +15 | +10
 * TIER 2 — Solid Offshore NW (310–329°): +18 | +12 | +8
 * TIER 3 — Okay Offshore NE (35–50°): wave-size dependent
 *   ≥4ft: +8 | +4 | 0    <4ft: +3 | 0 | -5
 * TIER 4 — Solid Side-Offshore WNW (290–309°):
 *   Rockaway: +12 | +6 | -8 | -20    General: +5 | 0 | -15 | -30
 * TIER 5 — BAD Side-Offshore ENE (51–70°): -5 | -20 | -40 | -55
 * TIER 6 — Not-great Side-Shore E (71–110°): -12 | -25 | -45
 * TIER 7 — Better Side-Shore W (260–289°):
 *   Rockaway: -3 | -12 | -30    General: -8 | -20 | -40
 * TIER 8 — Onshore ALL BAD (111–259°): -10 | -45 | -60
 *
 * @param windSpeedKt - Wind speed in knots or null
 * @param windDirectionDeg - Wind direction in degrees (0-360) or null
 * @param profile - Spot profile (used for Rockaway-specific logic)
 * @param breakingHeightFt - Breaking wave height in feet (for NE wave-size scoring)
 * @returns Score from -60 to +20
 */
export function scoreWind(
  windSpeedKt: number | null,
  windDirectionDeg: number | null,
  profile: SpotProfile,
  breakingHeightFt: number = 0
): number {
  if (windSpeedKt === null || windDirectionDeg === null) {
    console.log('🔍 [scoreWind] Missing wind data:', { windSpeedKt, windDirectionDeg });
    return 0;
  }

  // Use Lido-specific wind scoring for Lido Beach
  if (profile.name === "Lido Beach") {
    return getWindQualityForLido(windSpeedKt, windDirectionDeg, breakingHeightFt);
  }

  const isRockaway = profile.name === "Rockaway Beach";
  const normalized = ((windDirectionDeg % 360) + 360) % 360;

  console.log('🔍 [scoreWind] Wind calculation:', {
    windSpeedKt: windSpeedKt.toFixed(1),
    windDirectionDeg,
    normalized: normalized.toFixed(1),
    spot: profile.name,
  });

  // TIER 1 — Premium Offshore (330–34°): N, NNE, NNW
  if (isPremiumOffshore(normalized)) {
    if (windSpeedKt <= 12) return 20;
    if (windSpeedKt <= 18) return 15;
    return 10;
  }

  // TIER 2 — Solid Offshore NW (310–329°): NW
  if (isSolidOffshoreNW(normalized)) {
    if (windSpeedKt <= 12) return 18;
    if (windSpeedKt <= 18) return 12;
    return 8;
  }

  // TIER 3 — Okay Offshore NE (35–50°): wave-size dependent
  if (isOkayOffshoreNE(normalized)) {
    const isBigWave = breakingHeightFt >= 4.0;
    if (isBigWave) {
      if (windSpeedKt <= 12) return 8;
      if (windSpeedKt <= 18) return 4;
      return 0;
    } else {
      if (windSpeedKt <= 12) return 3;
      if (windSpeedKt <= 18) return 0;
      return -5;
    }
  }

  // TIER 4 — Solid Side-Offshore WNW (290–309°): Rockaway handles WNW much better
  if (isSolidSideOffshoreWNW(normalized)) {
    if (isRockaway) {
      if (windSpeedKt <= 10) return 12;
      if (windSpeedKt < 15) return 6;
      if (windSpeedKt < 20) return -8;
      return -20;
    } else {
      if (windSpeedKt <= 10) return 5;
      if (windSpeedKt < 15) return 0;
      if (windSpeedKt < 20) return -15;
      return -30;
    }
  }

  // TIER 5 — BAD Side-Offshore ENE (51–70°): poor for all spots
  if (isBadSideOffshoreENE(normalized)) {
    if (windSpeedKt <= 10) return -5;
    if (windSpeedKt < 15) return -20;
    if (windSpeedKt < 20) return -40;
    return -55;
  }

  // TIER 6 — Not-great Side-Shore E (71–110°)
  if (isNotGreatSideShoreE(normalized)) {
    if (windSpeedKt <= 10) return -12;
    if (windSpeedKt <= 18) return -25;
    return -45;
  }

  // TIER 7 — Better Side-Shore W (260–289°): Rockaway handles W better
  if (isBetterSideShoreW(normalized)) {
    if (isRockaway) {
      if (windSpeedKt <= 10) return -3;
      if (windSpeedKt < 15) return -12;
      return -30;
    } else {
      if (windSpeedKt <= 10) return -8;
      if (windSpeedKt < 15) return -20;
      return -40;
    }
  }

  // TIER 8 — Onshore ALL BAD (111–259°): ESE through WSW
  if (windSpeedKt <= 6) return -10;
  if (windSpeedKt <= 10) return -45;
  return -60;
}

/**
 * Calculate wind gust penalty
 *
 * Gusts are penalized more than sustained wind because:
 * 1. Gusts create unpredictable chop patterns
 * 2. Onshore gusts are especially problematic (sudden blown-out sections)
 *
 * Penalty applies when:
 * - Gusts exceed sustained wind by >5 kts AND
 * - Gusts are >15 kts AND
 * - Wind is onshore or cross-shore (offshore gusts can help clean up)
 *
 * @param windSpeedKts - Sustained wind speed in knots
 * @param windGustsKts - Wind gust speed in knots
 * @param windDirectionDeg - Wind direction in degrees
 * @returns Penalty from 0 to -20
 */
export function scoreWindGusts(
  windSpeedKts: number | null,
  windGustsKts: number | null,
  windDirectionDeg: number | null
): number {
  // No penalty if data is missing
  if (windSpeedKts === null || windGustsKts === null || windDirectionDeg === null) {
    return 0;
  }

  // Calculate gust differential
  const gustDiff = windGustsKts - windSpeedKts;

  // No penalty if gusts aren't significantly higher than sustained
  if (gustDiff <= 5 || windGustsKts <= 15) {
    return 0;
  }

  // Check if wind is offshore (315-45°) - offshore gusts can help clean up conditions
  const normalized = ((windDirectionDeg % 360) + 360) % 360;
  const isOffshore = normalized >= 315 || normalized <= 45;

  // Offshore gusts are less problematic
  if (isOffshore) {
    return 0;
  }

  // Check if onshore (135-225°) vs cross-shore
  const isOnshore = normalized >= 135 && normalized <= 225;

  // Calculate penalty based on gust strength
  // Onshore gusts get harsher penalties than cross-shore
  let penalty = 0;

  if (windGustsKts > 25) {
    penalty = isOnshore ? -20 : -10;  // Very strong gusts
  } else if (windGustsKts > 20) {
    penalty = isOnshore ? -15 : -8;   // Strong gusts
  } else if (windGustsKts > 15) {
    penalty = isOnshore ? -10 : -5;   // Moderate gusts
  }

  console.log('💨 [Gust Penalty]', {
    windSpeedKts: windSpeedKts.toFixed(1),
    windGustsKts: windGustsKts.toFixed(1),
    gustDiff: gustDiff.toFixed(1),
    windDirectionDeg,
    isOnshore,
    penalty,
  });

  return penalty;
}

/**
 * Convert quality score to rating string
 *
 * @param score - Quality score (0-100)
 * @returns Rating string
 */
export function scoreToRating(score: number): string {
  if (score <= 39) {
    return "Don't Bother";
  } else if (score <= 59) {
    return 'Worth a Look';
  } else if (score <= 75) {
    return 'Go Surf';
  } else if (score <= 90) {
    return 'Firing';
  } else {
    return 'All-Time';
  }
}

/**
 * Generate human-readable reason for quality score
 *
 * @param breakdown - Score breakdown
 * @param breakingHeightFt - Predicted breaking wave height
 * @param periodS - Swell period
 * @param tideFt - Tide height in feet
 * @returns Human-readable reason string
 */
function generateReason(
  breakdown: QualityBreakdown,
  breakingHeightFt: number,
  periodS: number,
  tideFt: number
): string {
  const reasons: string[] = [];

  // Period check
  if (periodS < 5) {
    reasons.push('junk period');
  }

  // Size check (based on breaking height at the beach)
  if (breakingHeightFt < 2 && periodS < 6) {
    reasons.push('too small and weak');
  }

  // Swell quality (now 0-60 range)
  if (breakdown.swell_quality >= 50) {
    reasons.push('good swell');
  } else if (breakdown.swell_quality <= 5) {
    reasons.push('weak swell');
  }

  // Direction (now penalty-only: -20 to 0)
  if (breakdown.direction === 0) {
    reasons.push('ideal direction');
  } else if (breakdown.direction <= -18) {
    reasons.push('blocked direction');
  } else if (breakdown.direction <= -15) {
    reasons.push('poor wrap');
  } else if (breakdown.direction < 0) {
    reasons.push('off-angle');
  }

  // Tide - context-aware messaging (updated to match new logic with 4.0ft threshold)
  if (tideFt > 5.0) {
    reasons.push('shore-break');
  } else if (tideFt > 4.0) {
    if (breakingHeightFt >= 4.0) {
      reasons.push('holdable tide');
    } else {
      reasons.push('mushy tide');
    }
  } else if (tideFt > 3.0) {
    if (breakingHeightFt >= 4.0) {
      reasons.push('optimal tide');
    } else {
      reasons.push('mushy tide');
    }
  } else if (breakdown.tide >= 18) {
    reasons.push('optimal tide');
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
 * Combines all scoring components, applies Tide Push multiplier if conditions are met,
 * applies mandatory clamps, and returns complete quality assessment.
 * 
 * @param forecastPoint - Forecast point data
 * @param spotId - Spot identifier (name or key)
 * @param tideFt - Tide height in feet
 * @param profile - Spot profile (to avoid circular dependency)
 * @param tidePhase - Tide phase: 'rising', 'falling', 'high', 'low', or null
 * @returns Quality score result with breakdown and reason
 */
export function calculateQualityScoreWithProfile(
  forecastPoint: ForecastPoint,
  spotId: string,
  tideFt: number,
  profile: SpotProfile,
  tidePhase?: string | null,
  breakingHeightOverride?: number | null
): QualityScoreResult {

  // Convert waveHeightFt from integer*10 to decimal feet
  const swellHeightFt = forecastPoint.waveHeightFt !== null
    ? forecastPoint.waveHeightFt / 10
    : 0;
  const periodS = forecastPoint.wavePeriodSec ?? 0;

  // Use override if provided (e.g., from buoy data), else calculate using Open-Meteo formula
  const breakingHeightFt = breakingHeightOverride != null
    ? breakingHeightOverride
    : calculateBreakingWaveHeight(
        swellHeightFt,
        periodS,
        profile,
        forecastPoint.waveDirectionDeg,
        tideFt,
        tidePhase ?? null
      );

  console.log('🔍 [Quality Score Debug] Breaking Height Calculation:', {
    inputSwellHeightFt: swellHeightFt.toFixed(2),
    periodS,
    spotName: profile.name,
    swellDirectionDeg: forecastPoint.waveDirectionDeg,
    calculatedBreakingHeightFt: breakingHeightFt.toFixed(2),
  });

  // Calculate component scores
  // Swell Quality: 0-60 points (boosted to compensate for penalty-only direction)
  const swellQuality = scoreSwellQualityByBreakingHeight(breakingHeightFt);
  // Direction: -20 to 0 points (penalty-only model)
  const direction = scoreDirection(forecastPoint.waveDirectionDeg, profile);
  // Tide: -20 to 20 points (spot-specific logic for Lido/Long Beach)
  const tide = scoreTide(tideFt, breakingHeightFt, profile.name);
  // Wind: -60 to +20 points
  const wind = scoreWind(
    forecastPoint.windSpeedKts ?? null,
    forecastPoint.windDirectionDeg ?? null,
    profile,
    breakingHeightFt
  );
  // Wind Gusts: 0 to -20 points (penalty only for strong onshore/cross-shore gusts)
  const gustPenalty = scoreWindGusts(
    forecastPoint.windSpeedKts ?? null,
    forecastPoint.windGustsKts ?? null,
    forecastPoint.windDirectionDeg ?? null
  );

  // Calculate raw score (sum of components)
  // FinalScore = SwellQuality (0-60) + DirectionScore (-20 to 0) + TideScore + WindScore + GustPenalty
  let rawScore = swellQuality + direction + tide + wind + gustPenalty;

  // Add offshore small wave bonus for Lido Beach only
  let offshoreBonus = 0;
  if (profile.name === "Lido Beach") {
    offshoreBonus = getOffshoreSmallWaveBonus(
      breakingHeightFt,
      forecastPoint.windDirectionDeg ?? null,
      forecastPoint.windSpeedKts ?? null,
      periodS
    );
    if (offshoreBonus > 0) {
      rawScore += offshoreBonus;
      console.log('🔍 [Quality Score Debug] Lido offshore small wave bonus applied:', offshoreBonus);
    }
  }

  // DEBUG: Log component scores for troubleshooting
  console.log('🔍 [Quality Score Debug] Component Breakdown:', {
    breakingHeightFt: breakingHeightFt.toFixed(2),
    swellQuality,
    direction,
    tide,
    wind,
    gustPenalty,
    offshoreBonus,
    windSpeedKts: forecastPoint.windSpeedKts,
    windGustsKts: forecastPoint.windGustsKts,
    windDirectionDeg: forecastPoint.windDirectionDeg,
    tideFt: tideFt.toFixed(2),
    tidePhase: tidePhase ?? null,
    rawSum: rawScore,
  });

  // Apply Tide Push multiplier if conditions are met
  // Tide Push: rising tide between 0-3ft with breaking height >= 3.0ft
  const tidePushMultiplier = calculateTidePushMultiplier(tidePhase ?? null, tideFt, breakingHeightFt);
  if (tidePushMultiplier > 1.0) {
    rawScore = rawScore * tidePushMultiplier;
    console.log('🔍 [Quality Score Debug] Tide Push applied:', tidePushMultiplier, '→ rawScore:', rawScore);
  }

  // ============================================================================
  // SECONDARY SWELL QUALITY BONUS
  // When there's organized groundswell (period >= 8s) underneath wind chop,
  // conditions have more potential. The secondary swell provides better wave shape
  // even if it's smaller than the dominant wind waves.
  // ============================================================================
  const secondaryHeightFt = forecastPoint.secondarySwellHeightFt !== null
    ? (typeof forecastPoint.secondarySwellHeightFt === 'string'
       ? parseFloat(forecastPoint.secondarySwellHeightFt)
       : forecastPoint.secondarySwellHeightFt)
    : null;
  const secondaryPeriodS = forecastPoint.secondarySwellPeriodS ?? null;
  const secondaryDirectionDeg = forecastPoint.secondarySwellDirectionDeg ?? null;

  // Check if dominant swell is short-period wind slop (< 7s) and secondary is organized (>= 8s)
  // Secondary must be at least 1.5ft to provide any real surfable waves
  const isDominantWindSlop = periodS < 7;
  const hasOrganizedSecondary = secondaryHeightFt !== null &&
                                 secondaryHeightFt >= 1.5 &&
                                 secondaryPeriodS !== null &&
                                 secondaryPeriodS >= 8;

  if (isDominantWindSlop && hasOrganizedSecondary) {
    // Secondary swell provides better wave quality even if smaller
    // Bonus scales with secondary period (longer = more organized)
    let secondaryBonus = 0;

    // Check direction - SE to S swells (110-200°) are ideal for Long Island
    const isGoodSecondaryDirection = secondaryDirectionDeg !== null &&
                                     secondaryDirectionDeg >= 110 &&
                                     secondaryDirectionDeg <= 200;

    if (secondaryPeriodS! >= 10) {
      // 10s+ period = true groundswell, significant quality improvement
      secondaryBonus = isGoodSecondaryDirection ? 15 : 8;
    } else if (secondaryPeriodS! >= 8) {
      // 8-10s period = organized swell, moderate quality improvement
      secondaryBonus = isGoodSecondaryDirection ? 10 : 5;
    }

    if (secondaryBonus > 0) {
      rawScore += secondaryBonus;
      console.log('🌊 [Quality Score Debug] Secondary swell bonus applied:', {
        secondaryHeightFt,
        secondaryPeriodS,
        secondaryDirectionDeg,
        isGoodSecondaryDirection,
        bonus: secondaryBonus,
        newRawScore: rawScore,
      });
    }
  }

  // ============================================================================
  // WIND SLOP PENALTY
  // When dominant swell period is short (<= 5s) and height is significant,
  // this is pure wind chop - apply additional penalty
  // Periods of 5s or less are not real surf - just choppy mess
  // ============================================================================
  if (periodS <= 5 && swellHeightFt >= 2) {
    const windSlopPenalty = -15;
    rawScore += windSlopPenalty;
    console.log('💨 [Quality Score Debug] Wind slop penalty applied:', {
      dominantPeriodS: periodS,
      dominantHeightFt: swellHeightFt,
      penalty: windSlopPenalty,
      newRawScore: rawScore,
    });
  }

  // Consolidated size/period clamp with Lido/Long Beach-specific logic for small waves with offshore winds
  if ((profile.name === "Lido Beach" || profile.name === "Long Beach") && breakingHeightFt < 2) {
    // Lido Beach & Long Beach: Offshore winds can make small waves more surfable
    const windDir = forecastPoint.windDirectionDeg;
    const beforeClamp = rawScore;

    if (windDir !== null && breakingHeightFt >= 1.0 && periodS >= 6) {
      // Check wind tier and apply appropriate small-wave cap
      if (isPremiumOffshore(windDir)) {
        // Tier 1 Premium Offshore (330–34°): cap at 60
        rawScore = Math.min(rawScore, 60);
        if (beforeClamp !== rawScore) {
          console.log('🔍 [Quality Score Debug] Premium offshore small wave clamp:', beforeClamp, '→', rawScore);
        }
      } else if (isSolidOffshoreNW(windDir)) {
        // Tier 2 Solid Offshore NW (310–329°): cap at 55
        rawScore = Math.min(rawScore, 55);
        if (beforeClamp !== rawScore) {
          console.log('🔍 [Quality Score Debug] Solid Offshore NW small wave clamp:', beforeClamp, '→', rawScore);
        }
      } else if (isOkayOffshoreNE(windDir)) {
        // Tier 3 Okay Offshore NE (35–50°): cap at 45 (NE less useful on small days)
        rawScore = Math.min(rawScore, 45);
        if (beforeClamp !== rawScore) {
          console.log('🔍 [Quality Score Debug] Okay Offshore NE small wave clamp:', beforeClamp, '→', rawScore);
        }
      } else if (isSolidSideOffshoreWNW(windDir)) {
        // Tier 4 Solid Side-Offshore WNW (290–309°): cap at 42
        rawScore = Math.min(rawScore, 42);
        if (beforeClamp !== rawScore) {
          console.log('🔍 [Quality Score Debug] Solid Side-Offshore WNW small wave clamp:', beforeClamp, '→', rawScore);
        }
      } else {
        // All other non-offshore directions: cap at 30
        rawScore = Math.min(rawScore, 30);
        if (beforeClamp !== rawScore) {
          console.log('🔍 [Quality Score Debug] Small wave clamp (no offshore):', beforeClamp, '→', rawScore);
        }
      }
    } else {
      // Very short period (<6s) or tiny waves: cap at 30
      rawScore = Math.min(rawScore, 30);
      if (beforeClamp !== rawScore) {
        console.log('🔍 [Quality Score Debug] Small wave clamp (conditions not met):', beforeClamp, '→', rawScore);
      }
    }
  } else if (breakingHeightFt < 2 || periodS < 6) {
    // Other spots OR period < 6s: standard clamp at 30 ("Don't Bother" but less harsh)
    const beforeClamp = rawScore;
    rawScore = Math.min(rawScore, 30);
    if (beforeClamp !== rawScore) {
      console.log('🔍 [Quality Score Debug] Size/period clamp applied:', beforeClamp, '→', rawScore);
    }
  }

  // Direction-based score caps: W/NW = flat 35; East = gradual by band (matches breaking-height bands)
  const swellDir = forecastPoint.waveDirectionDeg;
  if (swellDir !== null) {
    let directionCap: number | null = null;
    if (swellDir >= 247.5 && swellDir <= 330) {
      directionCap = 35; // West/NW: Don't Bother max
    } else if (swellDir < 105) {
      // East wrap bands
      if (swellDir >= 100) directionCap = 55;   // 100-104°: Worth a Look max
      else if (swellDir >= 95) directionCap = 48;  // 95-99°
      else if (swellDir >= 90) directionCap = 42;  // 90-94°
      else directionCap = 35;                      // < 90°: Don't Bother max
    }
    if (directionCap !== null) {
      const beforeClamp = rawScore;
      rawScore = Math.min(rawScore, directionCap);
      if (beforeClamp !== rawScore) {
        console.log('🔍 [Quality Score Debug] Direction cap applied:', beforeClamp, '→', rawScore, `(cap ${directionCap})`);
      }
    }
  }

  // Hard clamp for onshore winds: Tiered penalty system
  // - Light onshore (5-7mph): cap at 50 ("Worth a Look")
  // - Strong onshore (>7mph): cap at 39 ("Don't Bother")
  // This ensures surf quality reflects the nuance between light and strong onshore conditions
  const windDir = forecastPoint.windDirectionDeg;
  const windSpeed = forecastPoint.windSpeedKts;
  if (windDir !== null && windSpeed !== null) {
    const normalizedWindDir = ((windDir % 360) + 360) % 360;
    // Onshore ALL BAD range now spans 110–259° (ESE through WSW)
    const isOnshoreWind = normalizedWindDir >= 110 && normalizedWindDir <= 259;

    // Light onshore cap: 5-7mph (~4.3-6kts) winds cap at 50
    if (isOnshoreWind && windSpeed >= 4.3 && windSpeed <= 6) {
      const beforeClamp = rawScore;
      rawScore = Math.min(rawScore, 50); // Cap at 50: "Worth a Look" for light onshore
      if (beforeClamp !== rawScore) {
        console.log('🔍 [Quality Score Debug] Light onshore wind cap (5-7mph) applied:', beforeClamp, '→', rawScore);
      }
    }

    // Strong onshore cap: >7mph (~6kts) winds cap at 39
    if (isOnshoreWind && windSpeed > 6) {
      const beforeClamp = rawScore;
      rawScore = Math.min(rawScore, 39); // Hard cap: ensures "Don't Bother" rating with onshore >7mph
      if (beforeClamp !== rawScore) {
        console.log('🔍 [Quality Score Debug] Strong onshore wind cap (>7mph) applied:', beforeClamp, '→', rawScore);
      }
    }

    // Hard rating caps based on wind speed and direction off optimal (N = 0°)
    // Calculate angular distance from optimal (N = 0°)
    const optimalDir = 0; // North is optimal for south-facing beaches
    const angleOffOptimal = calculateAngularDistance(normalizedWindDir, optimalDir);

    // Cap 1: If wind >15kts AND direction >45° off optimal → cap at 60 ("Worth a Look")
    if (windSpeed > 15 && angleOffOptimal > 45) {
      const beforeClamp = rawScore;
      rawScore = Math.min(rawScore, 60);
      if (beforeClamp !== rawScore) {
        console.log('🔍 [Quality Score Debug] Wind direction cap (>15kts, >45° off) applied:', beforeClamp, '→', rawScore);
      }
    }

    // Cap 2: If wind >20kts AND direction >30° off optimal → cap at 39 ("Don't Bother")
    // Guard: skip for beneficial offshore/side-offshore directions (Tiers 1–4: NW, WNW, N, NE)
    const isBeneficialWindDir = isAnyOffshore(normalizedWindDir) || isSolidSideOffshoreWNW(normalizedWindDir);
    if (windSpeed > 20 && angleOffOptimal > 30 && !isBeneficialWindDir) {
      const beforeClamp = rawScore;
      rawScore = Math.min(rawScore, 39);
      if (beforeClamp !== rawScore) {
        console.log('🔍 [Quality Score Debug] Wind direction cap (>20kts, >30° off) applied:', beforeClamp, '→', rawScore);
      }
    }

    // JUNK CONDITIONS CAP: Small waves + strong onshore wind = unsurfable
    // When waves < 2ft AND onshore wind > 10kts, conditions are truly terrible
    if (breakingHeightFt < 2 && isOnshoreWind && windSpeed > 10) {
      const beforeClamp = rawScore;
      rawScore = Math.min(rawScore, 20);
      if (beforeClamp !== rawScore) {
        console.log('🔍 [Quality Score Debug] Junk conditions cap (small waves + onshore) applied:', beforeClamp, '→', rawScore);
      }
    }
  }

  // Clamp final score to 0-100
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  console.log('🔍 [Quality Score Debug] Final score:', score, '(rawScore:', rawScore.toFixed(2), ')');

  const breakdown: QualityBreakdown = {
    swell_quality: swellQuality,
    direction,
    tide,
    wind,
  };

  const rating = scoreToRating(score);
  const reason = generateReason(breakdown, breakingHeightFt, periodS, tideFt);

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
 * @param tidePhase - Tide phase: 'rising', 'falling', 'high', 'low', or null
 * @returns Quality score result with breakdown and reason
 */
export async function calculateQualityScore(
  forecastPoint: ForecastPoint,
  spotId: string,
  tideFt: number,
  tidePhase?: string | null
): Promise<QualityScoreResult> {
  // Dynamic import to avoid circular dependency issues
  // Note: This function is provided for convenience, but calculateQualityScoreWithProfile
  // should be used directly when you already have the profile
  const { getSpotProfile } = await import('./spotProfiles');
  const profile = getSpotProfile(spotId);
  
  if (!profile) {
    throw new Error(`No profile found for spot: ${spotId}`);
  }
  
  return calculateQualityScoreWithProfile(forecastPoint, spotId, tideFt, profile, tidePhase ?? null);
}

