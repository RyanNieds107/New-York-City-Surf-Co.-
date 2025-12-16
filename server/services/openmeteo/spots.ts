/**
 * Spot coordinates mapping for Open-Meteo Marine API
 */

export interface SpotCoordinates {
  lat: number;
  lon: number;
}

/**
 * Spot coordinates map using keys
 */
export const SPOT_COORDINATES: Record<string, SpotCoordinates> = {
  "lido": { lat: 40.5892, lon: -73.6265 },
  "rockaway": { lat: 40.5830, lon: -73.8160 },
  "long-beach": { lat: 40.5880, lon: -73.6580 },
};

/**
 * Spot name to key mapping
 */
export const SPOT_NAME_TO_KEY: Record<string, string> = {
  "Lido Beach": "lido",
  "Rockaway Beach": "rockaway",
  "Long Beach": "long-beach",
};

/**
 * Get spot coordinates by key
 * @param spotKey - Spot key ("lido", "rockaway", "long-beach")
 * @returns Spot coordinates or undefined if not found
 */
export function getSpotCoordinates(spotKey: string): SpotCoordinates | undefined {
  return SPOT_COORDINATES[spotKey];
}

/**
 * Get spot key from spot name
 * @param spotName - Spot name from database ("Lido Beach", etc.)
 * @returns Spot key or undefined if not found
 */
export function getSpotKeyFromName(spotName: string): string | undefined {
  return SPOT_NAME_TO_KEY[spotName];
}
