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
  tide_best_min_ft: number; // Bottom of ideal tide range (feet)
  tide_best_max_ft: number; // Top of ideal tide range (feet)
  min_period_s: number; // Minimum usable period (seconds)
  amplification_factor: number; // Spot-specific wave height multiplier
}

/**
 * Spot profile configurations for Lido Beach, Long Beach, and Rockaway Beach
 */
export const SPOT_PROFILES: Record<string, SpotProfile> = {
  'lido': {
    name: 'Lido Beach',
    swell_target_deg: 120, // ESE
    swell_tolerance_deg: 30,
    tide_best_min_ft: 2.0,
    tide_best_max_ft: 5.0,
    min_period_s: 6,
    amplification_factor: 1.4,
  },
  'long-beach': {
    name: 'Long Beach',
    swell_target_deg: 130, // SE
    swell_tolerance_deg: 40,
    tide_best_min_ft: 2.0,
    tide_best_max_ft: 5.0,
    min_period_s: 5,
    amplification_factor: 1.2,
  },
  'rockaway': {
    name: 'Rockaway Beach',
    swell_target_deg: 110, // ESE
    swell_tolerance_deg: 35,
    tide_best_min_ft: 1.0,
    tide_best_max_ft: 4.0,
    min_period_s: 5,
    amplification_factor: 1.15,
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


