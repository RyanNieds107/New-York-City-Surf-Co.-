/**
 * Sunrise/Sunset Calculation Utilities for Server-Side
 *
 * Uses standard astronomical formulas to calculate sunrise, sunset, and twilight times
 * based on latitude, longitude, and date.
 */

// Zenith angles for different light conditions
const ZENITH = {
  SUNRISE_SUNSET: 90.833,  // Standard sunrise/sunset (accounts for refraction)
  CIVIL: 96,               // Civil twilight - sun 6° below horizon
} as const;

// NYC area default coordinates (Long Beach area)
export const NYC_COORDS = {
  lat: 40.588,
  lng: -73.658,
};

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
 * Calculate sunrise or sunset time using astronomical formula
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
  if (cosH > 1 || cosH < -1) {
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
 * Calculate sunrise time for a given date and location
 */
export function calculateSunrise(lat: number, lng: number, date: Date): Date {
  return calculateSunTime(lat, lng, date, true, ZENITH.SUNRISE_SUNSET);
}

/**
 * Calculate sunset time for a given date and location
 */
export function calculateSunset(lat: number, lng: number, date: Date): Date {
  return calculateSunTime(lat, lng, date, false, ZENITH.SUNRISE_SUNSET);
}

/**
 * Calculate first light (civil dawn) - when there's enough light to surf
 */
export function calculateFirstLight(lat: number, lng: number, date: Date): Date {
  return calculateSunTime(lat, lng, date, true, ZENITH.CIVIL);
}

/**
 * Calculate last light (civil dusk) - when it becomes too dark to surf
 */
export function calculateLastLight(lat: number, lng: number, date: Date): Date {
  return calculateSunTime(lat, lng, date, false, ZENITH.CIVIL);
}

/**
 * Check if a given timestamp falls during nighttime (too dark to surf)
 */
export function isNighttime(timestamp: Date, lat: number, lng: number): boolean {
  const firstLight = calculateFirstLight(lat, lng, timestamp);
  const lastLight = calculateLastLight(lat, lng, timestamp);

  const timeMs = timestamp.getTime();
  return timeMs < firstLight.getTime() || timeMs > lastLight.getTime();
}

/**
 * Check if a given timestamp is during daylight surfing hours
 */
export function isDaylightHours(timestamp: Date, lat: number = NYC_COORDS.lat, lng: number = NYC_COORDS.lng): boolean {
  return !isNighttime(timestamp, lat, lng);
}

/**
 * Get the last light time for a given date
 */
export function getLastLightForDate(date: Date, lat: number = NYC_COORDS.lat, lng: number = NYC_COORDS.lng): Date {
  return calculateLastLight(lat, lng, date);
}

/**
 * Get the first light time for a given date  
 */
export function getFirstLightForDate(date: Date, lat: number = NYC_COORDS.lat, lng: number = NYC_COORDS.lng): Date {
  return calculateFirstLight(lat, lng, date);
}

/**
 * Get time-of-day label based on hour
 * @param date - The date/time to get label for
 * @param lat - Latitude for sunset calculation
 * @param lng - Longitude for sunset calculation
 * @returns A friendly time-of-day label
 */
export function getTimeOfDayLabel(date: Date, lat: number = NYC_COORDS.lat, lng: number = NYC_COORDS.lng): string {
  const hour = date.getHours();
  const lastLight = calculateLastLight(lat, lng, date);
  const lastLightHour = lastLight.getHours();
  
  // If within 1 hour of last light or after, it's evening
  if (hour >= lastLightHour - 1) {
    return "Evening";
  }
  
  if (hour < 9) {
    return "Early Morning";
  }
  if (hour < 12) {
    return "Morning";
  }
  if (hour < 15) {
    return "Midday";
  }
  return "Afternoon";
}

/**
 * Format a time window with daylight awareness
 * @param startTime - Window start time
 * @param endTime - Window end time  
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Formatted string like "Sat Morning-Afternoon" or "Sun Early Morning-Midday"
 */
export function formatDaylightTimeWindow(
  startTime: Date, 
  endTime: Date, 
  lat: number = NYC_COORDS.lat, 
  lng: number = NYC_COORDS.lng
): string {
  const startDay = startTime.toLocaleDateString("en-US", { weekday: "short" });
  
  // Get last light for the start day
  const lastLight = calculateLastLight(lat, lng, startTime);
  
  // Cap end time at last light if it extends past sunset
  const effectiveEndTime = endTime.getTime() > lastLight.getTime() ? lastLight : endTime;
  
  const startLabel = getTimeOfDayLabel(startTime, lat, lng);
  const endLabel = getTimeOfDayLabel(effectiveEndTime, lat, lng);
  
  // If same label, just show one
  if (startLabel === endLabel) {
    return `${startDay} ${startLabel}`;
  }
  
  return `${startDay} ${startLabel}-${endLabel}`;
}
