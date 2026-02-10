import axios from "axios";

/**
 * NDBC Data Ingestion Service
 * Fetches real-time buoy data from the National Data Buoy Center.
 * Data is available in text format at: https://www.ndbc.noaa.gov/data/realtime2/{buoyId}.txt
 */

export interface NDBCReading {
  buoyId: string;
  timestamp: Date;
  waveHeightCm: number | null; // WVHT in meters -> converted to cm
  dominantPeriodDs: number | null; // DPD in seconds -> converted to deciseconds
  swellDirectionDeg: number | null; // MWD in degrees
  windSpeedCmps: number | null; // WSPD in m/s -> converted to cm/s
  windDirectionDeg: number | null; // WDIR in degrees
}

/**
 * Parses a single line of NDBC realtime data.
 * Format: #YY  MM DD hh mm WDIR WSPD GST  WVHT   DPD   APD MWD   PRES  ATMP  WTMP  DEWP  VIS PTDY  TIDE
 */
function parseNDBCLine(line: string, buoyId: string): NDBCReading | null {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 14) return null;

  // Skip header lines
  if (parts[0].startsWith("#")) return null;

  try {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
    const day = parseInt(parts[2], 10);
    const hour = parseInt(parts[3], 10);
    const minute = parseInt(parts[4], 10);

    const timestamp = new Date(Date.UTC(year, month, day, hour, minute));

    // Parse values, treating "MM" (missing) as null
    const parseValue = (val: string): number | null => {
      if (val === "MM" || val === "999" || val === "99.0" || val === "9999.0") return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    };

    const wdir = parseValue(parts[5]); // Wind direction (degrees)
    const wspd = parseValue(parts[6]); // Wind speed (m/s)
    const wvht = parseValue(parts[8]); // Wave height (m)
    const dpd = parseValue(parts[9]); // Dominant period (s)
    const mwd = parseValue(parts[11]); // Mean wave direction (degrees)

    return {
      buoyId,
      timestamp,
      waveHeightCm: wvht !== null ? Math.round(wvht * 100) : null,
      dominantPeriodDs: dpd !== null ? Math.round(dpd * 10) : null,
      swellDirectionDeg: mwd !== null ? Math.round(mwd) : null,
      windSpeedCmps: wspd !== null ? Math.round(wspd * 100) : null,
      windDirectionDeg: wdir !== null ? Math.round(wdir) : null,
    };
  } catch {
    return null;
  }
}

/**
 * Fetches the latest readings from an NDBC buoy.
 * Returns the most recent valid reading.
 */
export async function fetchLatestBuoyReading(buoyId: string): Promise<NDBCReading | null> {
  const url = `https://www.ndbc.noaa.gov/data/realtime2/${buoyId}.txt`;

  try {
    const response = await axios.get(url, { timeout: 10000 });
    const lines = response.data.split("\n");

    // Find the first valid data line (skip headers)
    for (const line of lines) {
      if (line.trim() && !line.startsWith("#")) {
        const reading = parseNDBCLine(line, buoyId);
        if (reading) return reading;
      }
    }

    return null;
  } catch (error) {
    console.error(`[NDBC] Failed to fetch buoy ${buoyId}:`, error);
    return null;
  }
}

/**
 * Fetches multiple recent readings from an NDBC buoy.
 * Returns up to `limit` readings.
 */
export async function fetchRecentBuoyReadings(buoyId: string, limit: number = 24): Promise<NDBCReading[]> {
  const url = `https://www.ndbc.noaa.gov/data/realtime2/${buoyId}.txt`;

  try {
    const response = await axios.get(url, { timeout: 10000 });
    const lines = response.data.split("\n");
    const readings: NDBCReading[] = [];

    for (const line of lines) {
      if (line.trim() && !line.startsWith("#")) {
        const reading = parseNDBCLine(line, buoyId);
        if (reading) {
          readings.push(reading);
          if (readings.length >= limit) break;
        }
      }
    }

    return readings;
  } catch (error) {
    console.error(`[NDBC] Failed to fetch buoy ${buoyId}:`, error);
    return [];
  }
}
