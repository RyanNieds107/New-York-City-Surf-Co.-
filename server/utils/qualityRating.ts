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
 *    - East Wrap (< 105°): Return -15 (Major Penalty)
 * 2. Check tolerance (only if not blocked):
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

  // East Wrap (< 105°): Heavy wrap-around, lose power, often walled/inconsistent
  if (swellDirectionDeg < 105) {
    return -15; // Major Penalty - East wraps lose significant power
  }

  // CHECK TOLERANCE (Only if not blocked)
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
// LIDO BEACH SPECIFIC WIND SCORING
// ============================================================================

/**
 * Check if wind direction is Premium Offshore (330-30°): NNW, N, NNE
 * Handles 360° wrap-around
 */
function isPremiumOffshore(windDir: number): boolean {
  const normalized = ((windDir % 360) + 360) % 360;
  return normalized >= 330 || normalized <= 30;
}

/**
 * Check if wind direction is Good Offshore (310-50°): NW, NE
 * Excludes premium offshore range
 */
function isGoodOffshore(windDir: number): boolean {
  const normalized = ((windDir % 360) + 360) % 360;
  // Good offshore is 310-330 (NW) or 30-50 (NE), excluding premium range
  return (normalized >= 310 && normalized < 330) || (normalized > 30 && normalized <= 50);
}

/**
 * Check if wind direction is any offshore (310-50°)
 * Includes both premium and good offshore
 */
function isAnyOffshore(windDir: number): boolean {
  const normalized = ((windDir % 360) + 360) % 360;
  return normalized >= 310 || normalized <= 50;
}

/**
 * Check if wind direction is Side-Offshore (295-315° WNW, 50-70° ENE)
 * Excludes premium and good offshore ranges
 * Updated: WNW 295-315° creates buffer zone with Cross-Shore
 */
function isSideOffshore(windDir: number): boolean {
  const normalized = ((windDir % 360) + 360) % 360;
  // Side-offshore is 295-315 (WNW) or 50-70 (ENE)
  return (normalized >= 295 && normalized < 315) || (normalized > 50 && normalized <= 70);
}

/**
 * Check if wind direction is Pure Cross-Shore: W, E
 * - Western: 260-294° (W, before WNW side-offshore at 295°)
 * - Eastern: 71-109° (E, after ENE)
 * WSW and ESE are "Side-Onshore" - worse than pure cross
 * Updated: 260-295° creates buffer zone with Side-Offshore
 */
function isCrossShore(windDir: number): boolean {
  const normalized = ((windDir % 360) + 360) % 360;
  // Pure cross-shore (best of the non-offshore winds):
  // - W: 260-295° (before it becomes WNW side-offshore at 295°)
  // - E: 70-110° (after ENE side-offshore)
  return (normalized >= 260 && normalized < 295) || (normalized > 70 && normalized <= 110);
}

/**
 * Check if wind direction is Side-Onshore: WSW, ESE
 * Worse than pure cross-shore, better than full onshore
 * - Western: 225-259° (WSW - has onshore component)
 * - Eastern: 111-134° (ESE - has onshore component)
 */
function isSideOnshore(windDir: number): boolean {
  const normalized = ((windDir % 360) + 360) % 360;
  // Side-onshore (transition zone between cross and full onshore):
  // - WSW: 225-260° (after SW onshore, before W cross)
  // - ESE: 110-135° (after E cross, before SE onshore)
  return (normalized >= 225 && normalized < 260) || (normalized > 110 && normalized < 135);
}

/**
 * Lido Beach-specific wind scoring with 6 tiers
 *
 * Hierarchy for south-facing beach (best to worst):
 * 1. Premium Offshore (N) - best
 * 2. Good Offshore (NW, NE)
 * 3. Side-Offshore (WNW, ENE)
 * 4. Cross-Shore W (260-290°) - W is better than E (no onshore component)
 * 4b. Cross-Shore E (70-110°) - E can have slight wrap effect
 * 5. Side-Onshore (WSW 225-260°, ESE 110-135°) - transition zone
 * 6. Full Onshore (SE-SW 135-225°) - worst
 *
 * TIER 1 - Premium Offshore (330-30°): NNW, N, NNE
 *   ≤12kts: +25 points | ≤18kts: +20 | ≤25kts: +15 | >25kts: +5
 *
 * TIER 2 - Good Offshore (310-330°, 30-50°): NW, NE
 *   ≤12kts: +20 points | ≤18kts: +15 | >18kts: +10
 *
 * TIER 3 - Side-Offshore (290-310°, 50-70°): WNW, ENE
 *   ≤12kts: +5 points | 12-18kts: 0 | >18kts: -15 (strong WNW creates choppy conditions)
 *
 * TIER 4a - Cross-Shore West (260-290°): W
 *   ≤10kts: -3 points | ≤18kts: -8 | >18kts: -15
 *
 * TIER 4b - Cross-Shore East (70-110°): E
 *   ≤10kts: -5 points | ≤18kts: -12 | >18kts: -20
 *
 * TIER 5 - Side-Onshore (225-260°, 110-135°): WSW, ESE
 *   ≤10kts: -15 points | ≤15kts: -25 | >15kts: -35
 *
 * TIER 6 - Full Onshore (135-225°): SE through SW
 *   ≤6kts: -10 points | ≤10kts: -45 | >10kts: -60
 *
 * @param windSpeedKt - Wind speed in knots
 * @param windDirectionDeg - Wind direction in degrees (0-360)
 * @returns Score from -60 to +25
 */
function getWindQualityForLido(windSpeedKt: number, windDirectionDeg: number): number {
  const normalized = ((windDirectionDeg % 360) + 360) % 360;

  console.log('🔍 [getWindQualityForLido] Lido-specific wind scoring:', {
    windSpeedKt: windSpeedKt.toFixed(1),
    windDirectionDeg,
    normalized: normalized.toFixed(1),
  });

  // TIER 1 - Premium Offshore (330-30°): NNW, N, NNE
  if (isPremiumOffshore(normalized)) {
    let score: number;
    if (windSpeedKt <= 12) {
      score = 25;
    } else if (windSpeedKt <= 18) {
      score = 20;
    } else if (windSpeedKt <= 25) {
      score = 15;
    } else {
      score = 5;
    }
    console.log('🔍 [getWindQualityForLido] TIER 1 Premium Offshore:', score);
    return score;
  }

  // NE 35–45°: treat same as Side-Offshore (not ideal at Lido)
  if (normalized >= 35 && normalized <= 45) {
    let score: number;
    if (windSpeedKt < 10) score = 5;
    else if (windSpeedKt < 15) score = -5;
    else if (windSpeedKt < 20) score = -30;
    else score = -50;
    console.log('🔍 [getWindQualityForLido] NE 35–45° (side-offshore):', score);
    return score;
  }

  // TIER 2 - Good Offshore (310-330°, 30-34° and 46-50° NE): NW, narrow NE
  if (isGoodOffshore(normalized)) {
    let score: number;
    if (windSpeedKt <= 12) {
      score = 20;
    } else if (windSpeedKt <= 18) {
      score = 15;
    } else {
      score = 10;
    }
    console.log('🔍 [getWindQualityForLido] TIER 2 Good Offshore:', score);
    return score;
  }

  // TIER 3 - Side-Offshore (295-315° WNW, 50-70° ENE)
  if (isSideOffshore(normalized)) {
    let score: number;
    if (windSpeedKt < 10) {
      score = 5; // Light side-offshore still somewhat favorable
    } else if (windSpeedKt < 15) {
      score = -5; // Moderate side-offshore
    } else if (windSpeedKt < 20) {
      score = -30; // Strong side-offshore creates choppy conditions
    } else {
      score = -50; // Very strong side-offshore - messy conditions
    }
    console.log('🔍 [getWindQualityForLido] TIER 3 Side-Offshore:', score);
    return score;
  }

  // TIER 4a - Cross-Shore West (260-295°): W - better than E
  // Calm WNW/W winds (≤10kt) should not be penalized - they're actually quite good
  const isWestCross = normalized >= 260 && normalized < 295;
  if (isWestCross) {
    let score: number;
    if (windSpeedKt <= 10) {
      score = 0; // No penalty for calm WNW/W winds
    } else if (windSpeedKt < 15) {
      score = -15;
    } else if (windSpeedKt < 20) {
      score = -35;
    } else {
      score = -55;
    }
    console.log('🔍 [getWindQualityForLido] TIER 4a Cross-Shore West:', score);
    return score;
  }

  // TIER 4b - Cross-Shore East (70-110°): E - slightly worse than W
  const isEastCross = normalized > 70 && normalized <= 110;
  if (isEastCross) {
    let score: number;
    if (windSpeedKt < 10) {
      score = -12;
    } else if (windSpeedKt < 15) {
      score = -25;
    } else if (windSpeedKt < 20) {
      score = -40;
    } else {
      score = -60;
    }
    console.log('🔍 [getWindQualityForLido] TIER 4b Cross-Shore East:', score);
    return score;
  }

  // TIER 5 - Side-Onshore (225-260°, 110-135°): WSW, ESE
  if (isSideOnshore(normalized)) {
    let score: number;
    if (windSpeedKt <= 10) {
      score = -15;
    } else if (windSpeedKt <= 15) {
      score = -25;
    } else {
      score = -35;
    }
    console.log('🔍 [getWindQualityForLido] TIER 5 Side-Onshore:', score);
    return score;
  }

  // TIER 6 - Full Onshore (135-225°): SE through SW
  let score: number;
  if (windSpeedKt <= 6) {
    score = -10;
  } else if (windSpeedKt <= 10) {
    score = -45;
  } else {
    score = -60;
  }
  console.log('🔍 [getWindQualityForLido] TIER 6 Full Onshore:', score);
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

  // Good offshore (310-50°) + period ≥ 8s: +10 points
  if (isGoodOffshore(normalized)) {
    console.log('🔍 [getOffshoreSmallWaveBonus] Good offshore small wave bonus: +10');
    return 10;
  }

  // Any other offshore (side-offshore) + period ≥ 8s: +5 points
  if (isSideOffshore(normalized)) {
    console.log('🔍 [getOffshoreSmallWaveBonus] Side-offshore small wave bonus: +5');
    return 5;
  }

  return 0;
}

/**
 * Score wind quality for Long Island south shore beaches
 *
 * Long Island south shore beaches (Lido, Long Beach, Rockaway) face approximately 180° (South).
 *
 * Wind classifications:
 * - Offshore (good): Winds from N, NW, NE (315-45°) = +10 to +20 points
 * - Cross-shore/Sideshore (marginal): Winds from E or W (60-120°, 240-300°) = -5 to -20 points
 * - Onshore (bad): Winds from S, SE, SW (135-225°) = -10 to -60 points
 *   - ≤6kts: -10 (light, tolerable)
 *   - >6kts (>7mph): -45 (harsh penalty)
 *   - >10kts (>12mph): -60 (blown out, ensures Poor rating)
 *
 * @param windSpeedKt - Wind speed in knots or null
 * @param windDirectionDeg - Wind direction in degrees (0-360) or null
 * @param profile - Spot profile (not used for wind, but kept for interface consistency)
 * @returns Score from -60 to +20
 */
export function scoreWind(
  windSpeedKt: number | null,
  windDirectionDeg: number | null,
  profile: SpotProfile
): number {
  if (windSpeedKt === null || windDirectionDeg === null) {
    console.log('🔍 [scoreWind] Missing wind data:', { windSpeedKt, windDirectionDeg });
    return 0; // neutral when no wind data
  }

  // Use Lido-specific wind scoring for Lido Beach
  if (profile.name === "Lido Beach") {
    return getWindQualityForLido(windSpeedKt, windDirectionDeg);
  }

  // Rockaway faces slightly more SE, so W winds are even better there
  const isRockaway = profile.name === "Rockaway Beach";

  // Long Island south shore faces ~180° (south)
  // Normalize wind direction to 0-360
  const normalized = ((windDirectionDeg % 360) + 360) % 360;

  // Wind hierarchy (best to worst):
  // 1. Offshore (315-45°): N, NW, NE
  // 2. Side-Offshore (295-315° WNW, 45-70° ENE)
  // 3. Cross-Shore W (260-295°): W - better than E
  // 4. Cross-Shore E (70-110°): E
  // 5. Side-Onshore (225-260°, 110-135°): WSW, ESE
  // 6. Full Onshore (135-225°): SE through SW

  const isOffshore = normalized >= 315 || normalized <= 45;
  const isSideOff = (normalized >= 295 && normalized < 315) || (normalized > 45 && normalized <= 70);
  const isWestCross = normalized >= 260 && normalized < 295;
  const isEastCross = normalized > 70 && normalized <= 110;
  const isSideOn = (normalized >= 225 && normalized < 260) || (normalized > 110 && normalized < 135);
  const isOnshore = normalized >= 135 && normalized <= 225;

  console.log('🔍 [scoreWind] Wind calculation:', {
    windSpeedKt: windSpeedKt.toFixed(1),
    windDirectionDeg,
    normalized: normalized.toFixed(1),
    isOffshore,
    isSideOff,
    isWestCross,
    isEastCross,
    isSideOn,
    isOnshore,
  });

  // All spots: NE 35–45° typically isn't great; treat same as Side-Offshore (46–70°)
  if (normalized >= 35 && normalized <= 45) {
    if (isRockaway) {
      if (windSpeedKt < 10) return 10;
      if (windSpeedKt < 15) return 5;
      if (windSpeedKt < 20) return -20;
      return -40;
    } else {
      // Long Beach (same as Lido side-offshore)
      if (windSpeedKt < 10) return 5;
      if (windSpeedKt < 15) return -5;
      if (windSpeedKt < 20) return -30;
      return -50;
    }
  }

  if (isOffshore) {
    // Offshore winds = GOOD
    if (windSpeedKt <= 12) {
      return 20; // Perfect offshore
    } else if (windSpeedKt <= 18) {
      return 15; // Good offshore
    } else {
      return 10; // Strong offshore (harder to paddle)
    }
  } else if (isSideOff) {
    // Side-offshore = DECENT (WNW, ENE) - Spot-specific handling
    // Rockaway handles WNW better, Lido/Long Beach struggle with strong WNW
    // All spots get penalties for strong side-offshore (choppy, messy conditions)
    if (isRockaway) {
      // Rockaway: Handles WNW better than other spots
      if (windSpeedKt < 10) {
        return 10;
      } else if (windSpeedKt < 15) {
        return 5;
      } else if (windSpeedKt < 20) {
        return -20; // Strong side-offshore creates choppy conditions even at Rockaway
      } else {
        return -40; // Very strong side-offshore
      }
    } else {
      // Long Beach: Same aggressive scaling as Lido
      if (windSpeedKt < 10) {
        return 5;
      } else if (windSpeedKt < 15) {
        return -5;
      } else if (windSpeedKt < 20) {
        return -30; // Strong side-offshore creates choppy conditions
      } else {
        return -50; // Very strong side-offshore - messy conditions
      }
    }
  } else if (isWestCross) {
    // Cross-shore W (includes WNW) - Calm winds ≤10mph should not be penalized
    // WNW winds at 9-10mph are actually quite good for all Long Island spots
    if (windSpeedKt <= 10) {
      return 0; // No penalty for calm WNW/W winds
    } else if (windSpeedKt < 15) {
      return -15;
    } else if (windSpeedKt < 20) {
      return -35;
    } else {
      return -55;
    }
  } else if (isEastCross) {
    // Cross-shore E = MARGINAL
    if (windSpeedKt < 10) {
      return -12;
    } else if (windSpeedKt < 15) {
      return -25;
    } else if (windSpeedKt < 20) {
      return -40;
    } else {
      return -60;
    }
  } else if (isSideOn) {
    // Side-onshore (WSW, ESE) = BAD but not as bad as full onshore
    if (windSpeedKt <= 10) {
      return -15;
    } else if (windSpeedKt <= 15) {
      return -25;
    } else {
      return -35;
    }
  } else {
    // Full Onshore (SE-SW) = WORST
    if (windSpeedKt <= 6) {
      return -10; // Light onshore (tolerable)
    } else if (windSpeedKt <= 10) {
      return -45; // Moderate onshore
    } else {
      return -60; // Strong onshore - blown out
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
  tidePhase?: string | null
): QualityScoreResult {

  // Convert waveHeightFt from integer*10 to decimal feet
  const swellHeightFt = forecastPoint.waveHeightFt !== null 
    ? forecastPoint.waveHeightFt / 10 
    : 0;
  const periodS = forecastPoint.wavePeriodSec ?? 0;

  // Calculate breaking wave height: H × (T/10) × spotMultiplier × tideMultiplier × directionalPenalty
  // SELECTION uses H² × T energy, but DISPLAY uses period-based shoaling physics
  // This ensures quality score clamping is based on actual predicted surf size
  // Tide multiplier is now included in wave height calculation (high tide reduces, low tide boosts)
  const breakingHeightFt = calculateBreakingWaveHeight(
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
    profile
  );

  // Calculate raw score (sum of components)
  // FinalScore = SwellQuality (0-60) + DirectionScore (-20 to 0) + TideScore + WindScore
  let rawScore = swellQuality + direction + tide + wind;

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
    offshoreBonus,
    windSpeedKts: forecastPoint.windSpeedKts,
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
      // Check for premium, good, or side offshore conditions
      if (isPremiumOffshore(windDir)) {
        // Premium offshore (330-30°) + period ≥ 6s + height ≥ 1.0ft: cap at 60 ("Worth a Look")
        rawScore = Math.min(rawScore, 60);
        if (beforeClamp !== rawScore) {
          console.log('🔍 [Quality Score Debug] Premium offshore small wave clamp:', beforeClamp, '→', rawScore);
        }
      } else if (isGoodOffshore(windDir)) {
        // Good offshore (310-50°) + period ≥ 6s + height ≥ 1.0ft: cap at 50 ("Worth a Look")
        rawScore = Math.min(rawScore, 50);
        if (beforeClamp !== rawScore) {
          console.log('🔍 [Quality Score Debug] Good offshore small wave clamp:', beforeClamp, '→', rawScore);
        }
      } else if (isSideOffshore(windDir)) {
        // Side-offshore (295-315° WNW, 50-70° ENE): cap at 42 ("Worth a Look")
        rawScore = Math.min(rawScore, 42);
        if (beforeClamp !== rawScore) {
          console.log('🔍 [Quality Score Debug] Side-offshore small wave clamp:', beforeClamp, '→', rawScore);
        }
      } else {
        // Other conditions (non-offshore): cap at 35 ("Don't Bother" but less harsh)
        rawScore = Math.min(rawScore, 35);
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

  // Hard clamp for blocked swell directions: W/NW swells can't produce good surf on south-facing beaches
  // If swell direction is in the blocked range, cap score at 35 ("Don't Bother")
  const swellDir = forecastPoint.waveDirectionDeg;
  if (swellDir !== null) {
    const isBlockedDirection = (swellDir >= 247.5 && swellDir <= 330) || swellDir < 105;
    if (isBlockedDirection) {
      const beforeClamp = rawScore;
      rawScore = Math.min(rawScore, 35); // Hard cap: blocked directions can't exceed "Don't Bother"
      if (beforeClamp !== rawScore) {
        console.log('🔍 [Quality Score Debug] Blocked direction clamp applied:', beforeClamp, '→', rawScore);
      }
    }
  }

  // Hard clamp for onshore winds: SW winds >7mph (~6kts) cap score at 40 ("Don't Bother")
  // This ensures Rockaway, Lido, and Long Beach never show "Go Surf" during significant SW wind events
  const windDir = forecastPoint.windDirectionDeg;
  const windSpeed = forecastPoint.windSpeedKts;
  if (windDir !== null && windSpeed !== null) {
    const normalizedWindDir = ((windDir % 360) + 360) % 360;
    const isOnshoreWind = normalizedWindDir >= 135 && normalizedWindDir <= 225;
    if (isOnshoreWind && windSpeed > 6) {
      const beforeClamp = rawScore;
      rawScore = Math.min(rawScore, 39); // Hard cap: ensures "Don't Bother" rating with onshore >7mph
      if (beforeClamp !== rawScore) {
        console.log('🔍 [Quality Score Debug] Onshore wind clamp applied:', beforeClamp, '→', rawScore);
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
    if (windSpeed > 20 && angleOffOptimal > 30) {
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

