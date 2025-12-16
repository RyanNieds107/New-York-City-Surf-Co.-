/**
 * Unit conversion helpers for Open-Meteo Marine API
 */

/**
 * Convert meters to feet
 * @param m - Value in meters
 * @returns Value in feet, or null if input is null/undefined
 */
export function metersToFeet(m: number | null | undefined): number | null {
  if (m === null || m === undefined || isNaN(m)) return null;
  return m * 3.28084;
}

/**
 * Convert mph to knots
 * @param mph - Value in miles per hour
 * @returns Value in knots, or null if input is null/undefined
 */
export function mphToKnots(mph: number | null | undefined): number | null {
  if (mph === null || mph === undefined || isNaN(mph)) return null;
  return mph * 0.868976;
}
