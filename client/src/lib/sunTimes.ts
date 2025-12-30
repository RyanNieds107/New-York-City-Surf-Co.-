/**
 * Sunrise/Sunset and Twilight Calculation Utilities
 *
 * Uses standard astronomical formulas to calculate sunrise, sunset, and twilight times
 * based on latitude, longitude, and date.
 *
 * Twilight phases (in order of brightness):
 * - Civil twilight: Sun 0-6° below horizon. Enough light for outdoor activities.
 * - Nautical twilight: Sun 6-12° below horizon. Horizon visible, objects distinguishable.
 * - Astronomical twilight: Sun 12-18° below horizon. Very faint light.
 */

// Zenith angles for different light conditions
const ZENITH = {
  SUNRISE_SUNSET: 90.833,  // Standard sunrise/sunset (accounts for refraction)
  CIVIL: 96,               // Civil twilight - sun 6° below horizon
  NAUTICAL: 102,           // Nautical twilight - sun 12° below horizon
} as const;

// Cache for all light times by date string and location
const lightTimesCache = new Map<string, LightTimes>();

interface LightTimes {
  firstLight: Date;    // Start of civil twilight (dawn)
  sunrise: Date;       // Actual sunrise
  sunset: Date;        // Actual sunset
  lastLight: Date;     // End of civil twilight (dusk)
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Get day of year (1-365/366)
 */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Calculate sunrise time for a given date and location
 *
 * @param lat - Latitude in degrees (positive = North)
 * @param lng - Longitude in degrees (positive = East)
 * @param date - Date to calculate sunrise for
 * @returns Date object with sunrise time
 */
export function calculateSunrise(lat: number, lng: number, date: Date): Date {
  return calculateSunTime(lat, lng, date, true, ZENITH.SUNRISE_SUNSET);
}

/**
 * Calculate sunset time for a given date and location
 *
 * @param lat - Latitude in degrees (positive = North)
 * @param lng - Longitude in degrees (positive = East)
 * @param date - Date to calculate sunset for
 * @returns Date object with sunset time
 */
export function calculateSunset(lat: number, lng: number, date: Date): Date {
  return calculateSunTime(lat, lng, date, false, ZENITH.SUNRISE_SUNSET);
}

/**
 * Calculate first light (civil dawn) - when there's enough light to surf
 *
 * @param lat - Latitude in degrees (positive = North)
 * @param lng - Longitude in degrees (positive = East)
 * @param date - Date to calculate for
 * @returns Date object with first light time
 */
export function calculateFirstLight(lat: number, lng: number, date: Date): Date {
  return calculateSunTime(lat, lng, date, true, ZENITH.CIVIL);
}

/**
 * Calculate last light (civil dusk) - when it becomes too dark to surf
 *
 * @param lat - Latitude in degrees (positive = North)
 * @param lng - Longitude in degrees (positive = East)
 * @param date - Date to calculate for
 * @returns Date object with last light time
 */
export function calculateLastLight(lat: number, lng: number, date: Date): Date {
  return calculateSunTime(lat, lng, date, false, ZENITH.CIVIL);
}

/**
 * Calculate sunrise, sunset, or twilight time using astronomical formula
 *
 * @param lat - Latitude in degrees
 * @param lng - Longitude in degrees
 * @param date - Date to calculate for
 * @param isMorning - true for dawn/sunrise, false for sunset/dusk
 * @param zenith - Zenith angle (90.833 for sunrise/sunset, 96 for civil twilight, etc.)
 */
function calculateSunTime(lat: number, lng: number, date: Date, isMorning: boolean, zenith: number): Date {
  const dayOfYear = getDayOfYear(date);

  // Convert longitude to hour value
  const lngHour = lng / 15;

  // Calculate approximate time
  const t = isMorning
    ? dayOfYear + ((6 - lngHour) / 24)
    : dayOfYear + ((18 - lngHour) / 24);

  // Calculate sun's mean anomaly
  const M = (0.9856 * t) - 3.289;

  // Calculate sun's true longitude
  let L = M + (1.916 * Math.sin(toRadians(M))) + (0.020 * Math.sin(toRadians(2 * M))) + 282.634;
  // Normalize to 0-360
  L = ((L % 360) + 360) % 360;

  // Calculate sun's right ascension
  let RA = toDegrees(Math.atan(0.91764 * Math.tan(toRadians(L))));
  // Normalize to 0-360
  RA = ((RA % 360) + 360) % 360;

  // Right ascension needs to be in same quadrant as L
  const Lquadrant = Math.floor(L / 90) * 90;
  const RAquadrant = Math.floor(RA / 90) * 90;
  RA = RA + (Lquadrant - RAquadrant);

  // Convert to hours
  RA = RA / 15;

  // Calculate sun's declination
  const sinDec = 0.39782 * Math.sin(toRadians(L));
  const cosDec = Math.cos(Math.asin(sinDec));

  // Calculate sun's local hour angle
  const cosH = (Math.cos(toRadians(zenith)) - (sinDec * Math.sin(toRadians(lat)))) /
               (cosDec * Math.cos(toRadians(lat)));

  // Check if sun never rises or sets at this location on this date
  if (cosH > 1) {
    // Sun never rises (polar night) - return midnight or end of day
    const result = new Date(date);
    result.setHours(isMorning ? 0 : 23, isMorning ? 0 : 59, 0, 0);
    return result;
  }
  if (cosH < -1) {
    // Sun never sets (midnight sun) - return midnight or end of day
    const result = new Date(date);
    result.setHours(isMorning ? 0 : 23, isMorning ? 0 : 59, 0, 0);
    return result;
  }

  // Calculate H in degrees then convert to hours
  let H: number;
  if (isMorning) {
    H = 360 - toDegrees(Math.acos(cosH));
  } else {
    H = toDegrees(Math.acos(cosH));
  }
  H = H / 15;

  // Calculate local mean time of rising/setting
  const T = H + RA - (0.06571 * t) - 6.622;

  // Adjust to UTC
  let UT = T - lngHour;
  // Normalize to 0-24
  UT = ((UT % 24) + 24) % 24;

  // Create result date
  const result = new Date(date);
  const hours = Math.floor(UT);
  const minutes = Math.round((UT - hours) * 60);

  // Set UTC time then let JavaScript handle timezone
  result.setUTCHours(hours, minutes, 0, 0);

  return result;
}

/**
 * Get cached light times (first light, sunrise, sunset, last light) for a date and location
 */
function getCachedLightTimes(lat: number, lng: number, date: Date): LightTimes {
  const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${lat.toFixed(2)}-${lng.toFixed(2)}`;

  if (lightTimesCache.has(dateKey)) {
    return lightTimesCache.get(dateKey)!;
  }

  const result: LightTimes = {
    firstLight: calculateFirstLight(lat, lng, date),
    sunrise: calculateSunrise(lat, lng, date),
    sunset: calculateSunset(lat, lng, date),
    lastLight: calculateLastLight(lat, lng, date),
  };

  lightTimesCache.set(dateKey, result);

  // Limit cache size
  if (lightTimesCache.size > 100) {
    const firstKey = lightTimesCache.keys().next().value;
    if (firstKey) lightTimesCache.delete(firstKey);
  }

  return result;
}

/**
 * Check if a given timestamp falls during nighttime (too dark to surf)
 * Uses civil twilight times which adapt to season and latitude
 *
 * @param timestamp - Date/time to check
 * @param lat - Latitude in degrees
 * @param lng - Longitude in degrees
 * @returns true if the timestamp is during nighttime (before first light or after last light)
 */
export function isNighttime(timestamp: Date | string, lat: number, lng: number): boolean {
  const time = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  // Get all light times for this date (includes civil twilight)
  const { firstLight, lastLight } = getCachedLightTimes(lat, lng, time);

  const timeMs = time.getTime();
  const firstLightMs = firstLight.getTime();
  const lastLightMs = lastLight.getTime();

  // It's nighttime if before first light (civil dawn) or after last light (civil dusk)
  return timeMs < firstLightMs || timeMs > lastLightMs;
}

/**
 * Get sunrise and sunset times for a specific date and location
 * This is a convenience function that returns both times at once
 *
 * @param lat - Latitude in degrees
 * @param lng - Longitude in degrees
 * @param date - Date to get sun times for
 * @returns Object with sunrise and sunset Date objects
 */
export function getSunTimes(lat: number, lng: number, date: Date): { sunrise: Date; sunset: Date } {
  const { sunrise, sunset } = getCachedLightTimes(lat, lng, date);
  return { sunrise, sunset };
}

/**
 * Get all light times for a specific date and location
 * Includes first light (civil dawn), sunrise, sunset, and last light (civil dusk)
 *
 * @param lat - Latitude in degrees
 * @param lng - Longitude in degrees
 * @param date - Date to get light times for
 * @returns Object with firstLight, sunrise, sunset, and lastLight Date objects
 */
export function getLightTimes(lat: number, lng: number, date: Date): LightTimes {
  return getCachedLightTimes(lat, lng, date);
}
