/**
 * Spot Profiles for Day 1 MVP Forecasting System
 * 
 * Defines the characteristics of each surf spot used in wave height
 * and quality rating calculations.
 */

export interface SpotProfile {
  name: string;
  swell_target_deg: number; // Ideal swell direction in degrees
  swell_tolerance_deg: number; // Acceptable deviation from target (degrees)
  min_period_s: number; // Minimum usable period (seconds)
  multiplier: number; // Fixed wave height multiplier for this spot
}

/**
 * Spot profile configurations for Lido Beach, Long Beach, and Rockaway Beach
 */
export const SPOT_PROFILES: Record<string, SpotProfile> = {
  'lido': {
    name: 'Lido Beach',
    swell_target_deg: 140, // SE-SSE (shifted to better capture SSE swells)
    swell_tolerance_deg: 50, // Widened to include ESE (90°) to SSE (180°) without penalty
    min_period_s: 6,
    multiplier: 1.5, // Fixed wave height multiplier
  },
  'long-beach': {
    name: 'Long Beach',
    swell_target_deg: 135, // SE
    swell_tolerance_deg: 45, // Covers 100° (ESE) to 180° (S)
    min_period_s: 5,
    multiplier: 1.3, // Fixed wave height multiplier
  },
  'rockaway': {
    name: 'Rockaway Beach',
    swell_target_deg: 135, // SE
    swell_tolerance_deg: 45, // Covers 100° (ESE) to 180° (S)
    min_period_s: 5,
    multiplier: 1.1, // Fixed wave height multiplier
  },
};

/**
 * Maps database spot names to profile keys
 */
const SPOT_NAME_TO_KEY: Record<string, string> = {
  'Lido Beach': 'lido',
  'Long Beach': 'long-beach',
  'Rockaway Beach': 'rockaway',
};

/**
 * Get spot profile by spot name or key
 * 
 * @param spotIdentifier - Spot name from database (e.g., "Lido Beach") or profile key (e.g., "lido")
 * @returns SpotProfile or undefined if not found
 */
export function getSpotProfile(spotIdentifier: string): SpotProfile | undefined {
  // Try direct key lookup first
  if (SPOT_PROFILES[spotIdentifier]) {
    return SPOT_PROFILES[spotIdentifier];
  }
  
  // Try name-to-key mapping
  const key = SPOT_NAME_TO_KEY[spotIdentifier];
  if (key && SPOT_PROFILES[key]) {
    return SPOT_PROFILES[key];
  }
  
  return undefined;
}

/**
 * Get spot profile key from spot name
 * 
 * @param spotName - Spot name from database
 * @returns Profile key (e.g., "lido") or undefined
 */
export function getSpotKey(spotName: string): string | undefined {
  return SPOT_NAME_TO_KEY[spotName];
}

/**
 * Calculate physically accurate spot multiplier based on swell height and period
 * 
 * Implements period-based tier system and global small swell damping ("Lake Atlantic" rule).
 * 
 * @param spotKey - Spot identifier key ("lido", "long-beach", "rockaway")
 * @param swellHeightFt - Offshore swell height in feet
 * @param periodS - Swell period in seconds
 * @returns Spot multiplier (0.8 for small swells, or period-based tier multiplier)
 */
export function calculateSpotMultiplier(
  spotKey: string,
  swellHeightFt: number,
  periodS: number
): number {
  // Global Small Swell Damping (The "Lake Atlantic" Rule)
  // Small swells lose energy to friction and cannot use canyon or inlet mechanics
  if (swellHeightFt < 2.0) {
    return 0.8;
  }

  // Spot-specific period-based tiers
  switch (spotKey) {
    case 'lido':
    case 'LIDO_BEACH':
      // Lido Beach: Hudson Canyon refraction + inlet shoaling
      if (periodS < 12) {
        return 1.1; // Tier A: Inlet shoaling only
      } else {
        return 1.1; // Tier B: Hudson Canyon refraction + inlet
      }

    case 'long-beach':
    case 'LONG_BEACH':
      // Long Beach: Jetty-driven sandbars
      if (periodS < 12) {
        return 1.05; // Tier A
      } else {
        return 1.05; // Tier B
      }

    case 'rockaway':
    case 'ROCKAWAY':
      // Rockaway Beach: Deep in NY Bight shadow
      if (periodS < 11) {
        return 1.0; // Tier A
      } else {
        return 1.1; // Tier B
      }

    default:
      // Fallback to neutral multiplier for unknown spots
      console.warn(`[calculateSpotMultiplier] Unknown spot key: ${spotKey}, using 1.0`);
      return 1.0;
  }
}


