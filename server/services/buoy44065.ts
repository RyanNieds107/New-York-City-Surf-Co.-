/**
 * NOAA Buoy 44065 Service
 * Fetches real-time wave data from NOAA buoy 44065 (NY Harbor Entrance)
 *
 * Station ID: 44065
 * Location: 15 NM SE of Breezy Point, NY (40.368°N, 73.701°W)
 * Type: 3-meter foam buoy with SCOOP payload
 * Relevance: Closest nearshore buoy to Rockaway/Long Beach/Lido surf breaks
 */

import axios from "axios";

export interface BuoyReading {
  waveHeight: number;        // in feet (converted from meters) - SWELL height (SwH), not combined WVHT
  waveHeightMeters: number;  // raw meters - SWELL height (SwH)
  dominantPeriod: number;    // in seconds - period of dominant energy
  dominantWaveHeight: number; // in feet - height of dominant component (SwH or WWH based on energy)
  dominantWaveHeightMeters: number; // raw meters - dominant component height
  dominantDirectionDeg: number | null; // degrees - direction of dominant component
  dominantDirectionLabel: string;     // cardinal direction of dominant component
  waveDirection: number;     // in degrees - mean wave direction
  directionLabel: string;    // e.g., "SSE"
  timestamp: Date;
  isStale: boolean;          // true if data > 2 hours old
  // Spectral data - separated swell components
  swellHeight: number | null;      // SwH in feet - background groundswell
  swellPeriod: number | null;      // SwP in seconds
  swellDirection: string | null;   // SwD cardinal direction (e.g., "SE")
  swellDirectionDeg: number | null; // SwD in degrees (converted from cardinal)
  windWaveHeight: number | null;   // WWH in feet - local wind chop
  windWavePeriod: number | null;   // WWP in seconds
  windWaveDirection: string | null; // WWD cardinal direction (e.g., "WNW")
  windWaveDirectionDeg: number | null; // WWD in degrees (converted from cardinal)
  steepness: string | null;        // STEEPNESS classification
  // Meteorological wind data (from .txt file)
  windSpeedKts: number | null;     // WSPD in knots (converted from m/s)
  windDirectionDeg: number | null; // WDIR in degrees
}

const BUOY_ID = "44065";
const BUOY_URL = `https://www.ndbc.noaa.gov/data/realtime2/${BUOY_ID}.txt`;
const BUOY_SPEC_URL = `https://www.ndbc.noaa.gov/data/realtime2/${BUOY_ID}.spec`; // Spectral data with swell/wind wave separation
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Converts degrees to cardinal direction (16-point compass)
 */
function degreesToDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Converts cardinal direction to degrees (16-point compass)
 * Returns null if the cardinal direction is not recognized
 */
function cardinalToDegrees(cardinal: string | null): number | null {
  if (!cardinal) return null;
  const directionMap: Record<string, number> = {
    'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
    'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
    'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
    'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
  };
  return directionMap[cardinal.toUpperCase()] ?? null;
}

/**
 * Parse a value from NDBC data, handling "MM" (missing) markers and other missing indicators
 */
function parseValue(val: string): number | null {
  // Handle various missing value markers used by NOAA
  if (val === "MM" || val === "-" || val === "--" || val === "999" || val === "99.0" || val === "9999.0" || val === "99.00" || val.trim() === "") {
    return null;
  }
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

/**
 * Fetches and parses the latest reading from NOAA Buoy 44065 SPECTRAL data
 *
 * Spectral data format (.spec file):
 * #YY  MM DD hh mm WVHT  SwH  SwP  WWH  WWP SwD WWD  STEEPNESS  APD MWD
 * #yr  mo dy hr mn    m    m  sec    m  sec  -  degT     -      sec degT
 *
 * Key fields:
 * - WVHT (column 5): Significant wave height in meters (combined)
 * - SwH (column 6): Swell height in meters (background groundswell)
 * - SwP (column 7): Swell period in seconds
 * - WWH (column 8): Wind wave height in meters (local chop)
 * - WWP (column 9): Wind wave period in seconds
 * - SwD (column 10): Swell direction (cardinal, e.g., "SE")
 * - WWD (column 11): Wind wave direction (cardinal, e.g., "WNW")
 * - STEEPNESS (column 12): Wave steepness classification
 * - APD (column 13): Average wave period in seconds
 * - MWD (column 14): Mean wave direction in degrees
 */
export async function fetchBuoy44065(): Promise<BuoyReading | null> {
  try {
    // Fetch both spectral and standard data in parallel
    const [specResponse, txtResponse] = await Promise.all([
      axios.get(BUOY_SPEC_URL, {
        timeout: 10000,
        headers: { 'User-Agent': 'NYCSurfCo/1.0 (surf forecast application)' }
      }),
      axios.get(BUOY_URL, {
        timeout: 10000,
        headers: { 'User-Agent': 'NYCSurfCo/1.0 (surf forecast application)' }
      }).catch(() => null) // Don't fail if txt fetch fails
    ]);

    // Parse wind data from .txt file
    // Format: #YY  MM DD hh mm WDIR WSPD GST  WVHT   DPD   APD MWD   PRES  ATMP  WTMP  DEWP  VIS PTDY  TIDE
    let windSpeedKts: number | null = null;
    let windDirectionDeg: number | null = null;

    if (txtResponse?.data) {
      const txtLines: string[] = txtResponse.data.split("\n");
      for (const line of txtLines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 7) {
          const wdir = parseValue(parts[5]); // Wind direction in degrees
          const wspd = parseValue(parts[6]); // Wind speed in m/s
          if (wdir !== null) windDirectionDeg = wdir;
          if (wspd !== null) windSpeedKts = wspd * 1.94384; // m/s to knots
          console.log(`[Buoy 44065] Wind from .txt: ${windSpeedKts?.toFixed(1)}kts from ${windDirectionDeg}°`);
          break; // Only need first (most recent) line
        }
      }
    }

    const lines: string[] = specResponse.data.split("\n");

    // Skip header lines, parse first valid data line (most recent reading)
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and header lines
      if (!trimmed || trimmed.startsWith("#")) continue;

      const parts = trimmed.split(/\s+/);
      if (parts.length < 15) continue;

      try {
        // Parse timestamp
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
        const day = parseInt(parts[2], 10);
        const hour = parseInt(parts[3], 10);
        const minute = parseInt(parts[4], 10);
        const timestamp = new Date(Date.UTC(year, month, day, hour, minute));

        // Parse wave data from spectral file
        const wvht = parseValue(parts[5]);  // Combined significant wave height in meters
        const swH = parseValue(parts[6]);   // Swell height in meters
        const swP = parseValue(parts[7]);   // Swell period in seconds
        const wwH = parseValue(parts[8]);   // Wind wave height in meters
        const wwP = parseValue(parts[9]);   // Wind wave period in seconds
        const swD = parts[10];              // Swell direction (cardinal)
        const wwD = parts[11];              // Wind wave direction (cardinal)
        const steepness = parts[12];        // Steepness classification
        const apd = parseValue(parts[13]);  // Average period in seconds
        const mwd = parseValue(parts[14]);  // Mean wave direction in degrees

        // If critical swell data is missing, try the next line
        // We need SwH (swell height) and SwP (swell period) to be paired correctly
        if (swH === null || swP === null) {
          console.log(`[Buoy 44065] Missing SwH or SwP on line - trying next line`);
          continue;
        }

        // Check if data is stale (> 2 hours old)
        const now = Date.now();
        const dataAge = now - timestamp.getTime();
        const isStale = dataAge > STALE_THRESHOLD_MS;

        // Convert meters to feet
        // Use SwH (swell height) for primary wave height - NOT WVHT (combined)
        const waveHeightFeet = swH * 3.28084;
        const swellHeightFeet = swH * 3.28084;
        const windWaveHeightFeet = wwH !== null ? wwH * 3.28084 : null;

        // Determine dominant component using energy comparison: H² × T
        // Compare SwH (swell) vs WWH (wind waves) to pick the dominant source
        const swellEnergy = swH * swH * swP;
        const windWaveEnergy = wwH !== null && wwP !== null ? (wwH * wwH * wwP) : 0;
        const windWavesDominate = windWaveEnergy > swellEnergy;

        // Use same dominant source for height, period, and direction
        const dominantPeriod = windWavesDominate ? (wwP ?? swP) : swP;
        const dominantHeightFeet = windWavesDominate
          ? (windWaveHeightFeet ?? swellHeightFeet)
          : swellHeightFeet;
        const dominantHeightMeters = windWavesDominate
          ? (wwH ?? swH)
          : swH;

        // Clean up cardinal directions (handle "MM" missing values)
        const cleanSwD = swD === "MM" || swD === "-" ? null : swD;
        const cleanWwD = wwD === "MM" || wwD === "-" ? null : wwD;
        const cleanSteepness = steepness === "MM" || steepness === "-" ? null : steepness;

        // Dominant direction from the same source as height/period
        const dominantDirDeg = windWavesDominate
          ? cardinalToDegrees(cleanWwD)
          : cardinalToDegrees(cleanSwD);
        const dominantDirLabel = windWavesDominate
          ? (cleanWwD ?? (dominantDirDeg !== null ? degreesToDirection(dominantDirDeg) : "N/A"))
          : (cleanSwD ?? (dominantDirDeg !== null ? degreesToDirection(dominantDirDeg) : "N/A"));

        console.log(`[Buoy 44065] Spectral data: WVHT=${wvht}m, SwH=${swH}m @ ${swP}s from ${swD}, WWH=${wwH}m @ ${wwP}s from ${wwD}, Steepness=${steepness}`);
        console.log(`[Buoy 44065] Energy comparison: swell=${swellEnergy.toFixed(2)} vs wind=${windWaveEnergy.toFixed(2)} → ${windWavesDominate ? 'WIND WAVES' : 'SWELL'} dominate`);
        console.log(`[Buoy 44065] Output: dominantHeight=${dominantHeightFeet.toFixed(1)}ft @ ${dominantPeriod}s from ${dominantDirLabel}`);

        return {
          waveHeight: waveHeightFeet,
          waveHeightMeters: swH,
          dominantPeriod: dominantPeriod,
          dominantWaveHeight: dominantHeightFeet,
          dominantWaveHeightMeters: dominantHeightMeters,
          dominantDirectionDeg: dominantDirDeg,
          dominantDirectionLabel: dominantDirLabel,
          waveDirection: mwd ?? 0,
          directionLabel: mwd !== null ? degreesToDirection(mwd) : "N/A",
          timestamp,
          isStale,
          // Spectral swell components
          swellHeight: swellHeightFeet,
          swellPeriod: swP,
          swellDirection: cleanSwD,
          swellDirectionDeg: cardinalToDegrees(cleanSwD),
          windWaveHeight: windWaveHeightFeet,
          windWavePeriod: wwP,
          windWaveDirection: cleanWwD,
          windWaveDirectionDeg: cardinalToDegrees(cleanWwD),
          steepness: cleanSteepness,
          // Meteorological wind data
          windSpeedKts,
          windDirectionDeg,
        };
      } catch (parseError) {
        console.error(`[Buoy 44065] Failed to parse line: ${line}`, parseError);
        continue;
      }
    }

    console.log("[Buoy 44065] No valid spectral data lines found");
    return null;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`[Buoy 44065] Network error: ${error.message}`);
    } else {
      console.error("[Buoy 44065] Failed to fetch buoy data:", error);
    }
    return null;
  }
}

/**
 * In-memory cache for buoy data
 * Cache TTL: 15 minutes (NOAA updates roughly every hour, but we cache to reduce API calls)
 */
let cachedReading: BuoyReading | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Clears the buoy cache (for debugging/forcing refresh)
 */
export function clearBuoyCache(): void {
  cachedReading = null;
  cacheTimestamp = 0;
  console.log("[Buoy 44065] Cache cleared");
}

/**
 * Fetches buoy data with caching
 * Returns cached data if available and fresh, otherwise fetches new data
 */
export async function fetchBuoy44065Cached(): Promise<BuoyReading | null> {
  const now = Date.now();

  // Return cached data if still fresh
  if (cachedReading && (now - cacheTimestamp) < CACHE_TTL_MS) {
    // Update isStale flag based on current time
    const dataAge = now - cachedReading.timestamp.getTime();
    return {
      ...cachedReading,
      isStale: dataAge > STALE_THRESHOLD_MS,
    };
  }

  // Fetch fresh data
  const reading = await fetchBuoy44065();

  if (reading) {
    cachedReading = reading;
    cacheTimestamp = now;
  }

  return reading;
}
