/**
 * TypeScript types for Open-Meteo Marine API and WLI Filter Algorithm
 */

/**
 * Open-Meteo Marine API Response structure
 * Used for type-safe access to forecast data
 */
export interface OpenMeteoMarineResponse {
  hourly: {
    time: string[];
    wave_height: number[];
    wave_direction: number[];
    wave_period: number[];
    swell_wave_height: number[];      // Crucial for Lido
    swell_wave_direction: number[];   // Crucial for Lido
    swell_wave_period: number[];      // Crucial for Lido
  };
}

/**
 * Local conditions affecting surf quality
 * Used by WLI Filter Algorithm to adjust forecasts
 */
export interface LocalConditions {
  tideLevel: number; // feet
  isEbbing: boolean; // true if tide is falling
  // Note: barState removed for initial implementation
  // barState: 'WASHED_OUT' | 'OUTER_BAR' | 'STABILIZED';
}

/**
 * WLI Filter Algorithm result
 * Contains adjusted wave height, quality score, and explanatory reasons
 */
export interface WliAdjustmentResult {
  finalHeight: number; // Adjusted wave height in feet
  score: number; // Quality score 1-10
  reasons: string[]; // Explanations for adjustments
}

