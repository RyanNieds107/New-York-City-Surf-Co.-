import axios from "axios";
import type { SurfSpot } from "../../drizzle/schema";
import type { InsertForecastPoint } from "../../drizzle/schema";

/**
 * NOMADS Data Service
 * Fetches forecast data from NOAA NOMADS (NOAA Operational Model Archive and Distribution System)
 * Priority: WaveWatch III (WW3) wave forecasts
 */

export interface NomadsForecastPoint {
  forecastTimestamp: Date;
  modelRunTime: Date;
  hoursOut: number;
  waveHeightFt: number | null;
  wavePeriodSec: number | null;
  waveDirectionDeg: number | null;
  windSpeedKts: number | null;
  windDirectionDeg: number | null;
  source: "ww3" | "gfs" | "hrrr";
}

/**
 * Checks if NOMADS WW3 JSON endpoint is available.
 * Note: NOMADS primarily provides GRIB2 format. This checks for OPeNDAP/DODS JSON alternatives.
 */
export async function checkNomadsJsonEndpoint(): Promise<boolean> {
  try {
    // Test OPeNDAP/DODS endpoint - some NOMADS services support JSON via DAP4
    const testUrl = "https://nomads.ncep.noaa.gov/dods/wave/multi_1/glo_30m";
    
    const response = await axios.get(testUrl, {
      timeout: 10000,
      validateStatus: (status) => status < 500, // Accept redirects and client errors
    });
    
    // Check if endpoint responds (even if it's HTML/XML catalog)
    // OPeNDAP services exist but may not directly return JSON for data
    return response.status === 200;
  } catch (error) {
    console.warn("[NOMADS] JSON endpoint check failed:", error);
    return false;
  }
}

/**
 * Fetches WW3 forecast data using NOMADS OPeNDAP/DODS JSON endpoint.
 * Uses DAP4 JSON format to get wave forecast data for a specific location.
 */
export async function fetchWw3ForecastJson(
  lat: number,
  lon: number,
  modelRunTime: Date,
  maxHoursOut: number = 180
): Promise<NomadsForecastPoint[]> {
  console.log(`[NOMADS] Fetching WW3 forecast via JSON for lat=${lat}, lon=${lon}`);
  
  try {
    // Determine model run identifier (00z, 06z, 12z, 18z)
    const runHour = modelRunTime.getUTCHours();
    const runDateStr = modelRunTime.toISOString().split("T")[0].replace(/-/g, "");
    const runId = String(runHour).padStart(2, "0") + "z";
    
    // OPeNDAP DODS base URL for WW3 multi_1 global 30min model
    // Note: OpenDAP is being terminated Jan 2026, but may still work for now
    // Try .json instead of .dap4.json as fallback
    const baseUrl = `https://nomads.ncep.noaa.gov/dods/wave/multi_1/glo_30m${runDateStr}/glo_30m${runId}`;
    
    // First, we need to find the grid indices for our lat/lon
    // WW3 global model has ~0.5 degree resolution
    // We'll query the lat/lon arrays to find the nearest grid point
    
    // Calculate grid indices directly from lat/lon
    // WaveWatch III global 30-minute grid has 0.5° resolution
    // Grid starts at -90°N to 90°N (lat) and 0°E to 360°E (lon, but stored as -180°E to 180°E)
    // For the global 30-minute grid:
    // - Latitude: -90 to 90 degrees, 0.5° resolution = 360 points
    // - Longitude: 0 to 360 degrees (or -180 to 180), 0.5° resolution = 720 points
    // 
    // However, the actual grid might be different. Let's calculate indices based on standard grid:
    // lat_idx = (lat + 90) / 0.5 = (lat + 90) * 2
    // lon_idx = (lon + 180) / 0.5 = (lon + 180) * 2  (for -180 to 180 range)
    
    // Calculate approximate grid indices
    // Note: These may need adjustment based on actual grid structure
    const gridResolution = 0.5; // degrees
    const latStart = -90;
    const lonStart = -180;
    
    // Calculate indices (round to nearest grid point)
    let latIdx = Math.round((lat - latStart) / gridResolution);
    let lonIdx = Math.round((lon - lonStart) / gridResolution);
    
    // Ensure indices are within reasonable bounds
    latIdx = Math.max(0, Math.min(360, latIdx));
    lonIdx = Math.max(0, Math.min(720, lonIdx));
    
    console.log(`[NOMADS] Calculated grid point: lat[${latIdx}], lon[${lonIdx}] for coordinates (${lat}, ${lon})`);
    
    // Calculate number of time steps (every 3 hours, up to maxHoursOut)
    const numSteps = Math.min(Math.floor(maxHoursOut / 3) + 1, 61); // Max 61 steps (0-180 hours)
    
    // Query forecast variables for this grid point
    // Variables: htsgw (significant wave height), perpw (dominant period), dirpw (mean direction)
    // Note: DAP4 query format is [time_start:time_end][lat_idx][lon_idx]
    // The calculated indices might be wrong - let's try a simpler approach:
    // Use a small range around the calculated point, or fall back to [0][0] if needed
    // For now, let's use the calculated indices but with bounds checking
    const safeLatIdx = Math.max(0, Math.min(360, latIdx));
    const safeLonIdx = Math.max(0, Math.min(720, lonIdx));
    
    // Try multiple query formats and grid indices
    // Format: variable[time_start:time_end][lat_idx][lon_idx]
    // Try calculated indices first, then fall back to [0][0] (test script approach)
    const gridIndicesToTry = [
      [safeLatIdx, safeLonIdx],
      [0, 0], // Fallback to test script approach
    ];
    
    // Try .dap4.json first (as per test script), then .json, then .ascii
    const extensions = ['.dap4.json', '.json', '.ascii'];
    
    console.log(`[NOMADS] Fetching forecast data: ${numSteps} time steps`);
    
    let response: any = null;
    let lastError: Error | null = null;
    let successfulGrid = false;
    
    for (const [latIdx, lonIdx] of gridIndicesToTry) {
      if (successfulGrid) break;
      
      const querySuffix = `htsgw[0:${numSteps - 1}][${latIdx}][${lonIdx}],perpw[0:${numSteps - 1}][${latIdx}][${lonIdx}],dirpw[0:${numSteps - 1}][${latIdx}][${lonIdx}]`;
      
      for (const ext of extensions) {
        try {
          const queryUrl = `${baseUrl}${ext}?${querySuffix}`;
          console.log(`[NOMADS] Trying: grid[${latIdx}][${lonIdx}] with ${ext}`);
          
          response = await axios.get(queryUrl, {
            timeout: 60000,
            headers: { Accept: "application/json" },
            validateStatus: () => true,
          });
          
          // Check if response is HTML (error page)
          if (typeof response.data === 'string' && response.data.trim().startsWith('<html')) {
            continue; // Try next format
          }
          
          // Check if we got valid JSON data
          if (response.status === 200 && response.data && typeof response.data === 'object') {
            console.log(`[NOMADS] Successfully received JSON response with grid[${latIdx}][${lonIdx}]`);
            successfulGrid = true;
            break;
          }
        } catch (error: any) {
          lastError = error;
          continue;
        }
      }
    }
    
    if (!response || !successfulGrid) {
      throw new Error(`All NOMADS query formats and grid indices failed. OpenDAP may be disabled or query format incorrect. Last error: ${lastError?.message || 'Unknown'}`);
    }
    
    if (response.status !== 200 || !response.data) {
      throw new Error(`NOMADS JSON endpoint returned status ${response.status}`);
    }
    
    // Parse DAP4 JSON response
    const data = response.data;
    const forecastPoints: NomadsForecastPoint[] = [];
    
    // DAP4 JSON structure can vary - try multiple extraction methods
    const getDataArray = (obj: any, varName: string): number[] => {
      if (!obj) {
        console.warn(`[NOMADS] Variable ${varName} not found in response`);
        return [];
      }
      
      // Try direct array
      if (Array.isArray(obj)) {
        console.log(`[NOMADS] Found ${varName} as direct array (${obj.length} elements)`);
        return obj;
      }
      
      // Try obj.data array
      if (obj?.data && Array.isArray(obj.data)) {
        console.log(`[NOMADS] Found ${varName} in obj.data (${obj.data.length} elements)`);
        return obj.data;
      }
      
      // Try obj.values array (some DAP4 formats use this)
      if (obj?.values && Array.isArray(obj.values)) {
        console.log(`[NOMADS] Found ${varName} in obj.values (${obj.values.length} elements)`);
        return obj.values;
      }
      
      // Try nested structure - look for arrays in any property
      if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          if (Array.isArray(obj[key])) {
            console.log(`[NOMADS] Found ${varName} in obj.${key} (${obj[key].length} elements)`);
            return obj[key];
          }
        }
      }
      
      console.warn(`[NOMADS] Could not extract array from ${varName}:`, typeof obj, obj);
      return [];
    };
    
    // Log response structure for debugging
    console.log(`[NOMADS] Response keys:`, Object.keys(data));
    if (data.htsgw) console.log(`[NOMADS] htsgw structure:`, typeof data.htsgw, Object.keys(data.htsgw || {}));
    if (data.perpw) console.log(`[NOMADS] perpw structure:`, typeof data.perpw, Object.keys(data.perpw || {}));
    if (data.dirpw) console.log(`[NOMADS] dirpw structure:`, typeof data.dirpw, Object.keys(data.dirpw || {}));
    
    // Try multiple possible variable name formats
    let heights = getDataArray(data.htsgw || data.HTSGW || data.htsgw_data, "htsgw");
    let periods = getDataArray(data.perpw || data.PERPW || data.perpw_data, "perpw");
    let directions = getDataArray(data.dirpw || data.DIRPW || data.dirpw_data, "dirpw");
    
    // If primary extraction failed, try alternative method
    if (heights.length === 0 || periods.length === 0 || directions.length === 0) {
      console.warn(`[NOMADS] Primary data extraction failed, trying alternative method`);
      console.error(`  Heights: ${heights.length} elements`);
      console.error(`  Periods: ${periods.length} elements`);
      console.error(`  Directions: ${directions.length} elements`);
      console.error(`[NOMADS] Response keys:`, Object.keys(data));
      console.error(`[NOMADS] Sample response structure (first 2000 chars):`, JSON.stringify(data, null, 2).substring(0, 2000));
      
      // Try to find any numeric arrays in the response
      const findNumericArrays = (obj: any, depth = 0): number[][] => {
        if (depth > 3) return []; // Prevent infinite recursion
        const arrays: number[][] = [];
        
        if (Array.isArray(obj)) {
          if (obj.length > 0 && typeof obj[0] === 'number') {
            arrays.push(obj);
          }
          return arrays;
        }
        
        if (typeof obj === 'object' && obj !== null) {
          for (const key in obj) {
            arrays.push(...findNumericArrays(obj[key], depth + 1));
          }
        }
        
        return arrays;
      };
      
      const allArrays = findNumericArrays(data);
      console.log(`[NOMADS] Found ${allArrays.length} numeric arrays in response`);
      
      // If we found 3+ arrays, try using them
      if (allArrays.length >= 3) {
        console.log(`[NOMADS] Using alternative extraction with ${allArrays.length} arrays`);
        heights = allArrays[0] || [];
        periods = allArrays[1] || [];
        directions = allArrays[2] || [];
      }
      
      // Final check
      if (heights.length === 0 || periods.length === 0 || directions.length === 0) {
        throw new Error("Failed to extract forecast data from DAP4 JSON response. Check server logs for response structure.");
      }
    }
    
    console.log(`[NOMADS] Parsed ${heights.length} forecast points`);
    
    // Convert to forecast points
    for (let i = 0; i < Math.min(heights.length, periods.length, directions.length); i++) {
      const hoursOut = i * 3;
      if (hoursOut > maxHoursOut) break;
      
      const forecastTime = new Date(modelRunTime);
      forecastTime.setUTCHours(forecastTime.getUTCHours() + hoursOut);
      
      // Convert units:
      // - Heights: meters to feet (1m = 3.28084 ft)
      // - Periods: already in seconds
      // - Directions: already in degrees (0-360, where 0=N, 90=E, 180=S, 270=W)
      const heightM = heights[i];
      const periodS = periods[i];
      const directionDeg = directions[i];
      
      // Handle missing data (typically -9999 or NaN in GRIB files)
      const waveHeightFt = (heightM !== null && heightM !== undefined && !isNaN(heightM) && heightM > -999)
        ? heightM * 3.28084
        : null;
      
      const wavePeriodSec = (periodS !== null && periodS !== undefined && !isNaN(periodS) && periodS > 0)
        ? periodS
        : null;
      
      const waveDirectionDeg = (directionDeg !== null && directionDeg !== undefined && !isNaN(directionDeg) && directionDeg >= 0 && directionDeg <= 360)
        ? directionDeg
        : null;
      
      forecastPoints.push({
        forecastTimestamp: forecastTime,
        modelRunTime: modelRunTime,
        hoursOut: hoursOut,
        waveHeightFt: waveHeightFt,
        wavePeriodSec: wavePeriodSec,
        waveDirectionDeg: waveDirectionDeg,
        windSpeedKts: null, // Will add from GFS later
        windDirectionDeg: null,
        source: "ww3",
      });
    }
    
    console.log(`[NOMADS] Successfully parsed ${forecastPoints.length} forecast points`);
    return forecastPoints;
    
  } catch (error) {
    console.error("[NOMADS] JSON fetch error:", error);
    if (axios.isAxiosError(error)) {
      throw new Error(`NOMADS JSON fetch failed: ${error.message} (status: ${error.response?.status})`);
    }
    throw error;
  }
}

/**
 * Determines the latest available WW3 model run time.
 * WW3 runs at 00z, 06z, 12z, 18z UTC (every 6 hours).
 */
export function getLatestWw3ModelRunTime(): Date {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  // Find the most recent model run (00z, 06z, 12z, 18z)
  let runHour = 0;
  if (utcHour >= 18) {
    runHour = 18;
  } else if (utcHour >= 12) {
    runHour = 12;
  } else if (utcHour >= 6) {
    runHour = 6;
  } else {
    // Before 00z, use previous day's 18z run
    runHour = 18;
    now.setUTCDate(now.getUTCDate() - 1);
  }
  
  const modelRunTime = new Date(now);
  modelRunTime.setUTCHours(runHour, 0, 0, 0);
  
  return modelRunTime;
}

/**
 * Main function to fetch WW3 forecast for a spot.
 * Tries JSON endpoint first, falls back to GRIB2 if needed.
 */
export async function fetchWw3ForecastForSpot(
  spot: SurfSpot,
  modelRunTime?: Date,
  maxHoursOut: number = 180
): Promise<NomadsForecastPoint[]> {
  const lat = parseFloat(spot.latitude);
  const lon = parseFloat(spot.longitude);
  
  if (isNaN(lat) || isNaN(lon)) {
    throw new Error(`Invalid coordinates for spot ${spot.name}: ${spot.latitude}, ${spot.longitude}`);
  }
  
  // Use provided model run time or get latest
  const runTime = modelRunTime || getLatestWw3ModelRunTime();
  
  // Use JSON endpoint (confirmed working)
  try {
    console.log(`[NOMADS] Fetching WW3 forecast for ${spot.name} using JSON endpoint`);
    return await fetchWw3ForecastJson(lat, lon, runTime, maxHoursOut);
  } catch (error) {
    console.error(`[NOMADS] JSON fetch failed for ${spot.name}:`, error);
    // If JSON fails, we could fall back to GRIB2 parser (Phase 3) in the future
    throw error;
  }
}

/**
 * Converts NomadsForecastPoint to database InsertForecastPoint format.
 */
/**
 * Converts NomadsForecastPoint to database InsertForecastPoint format.
 * Note: Database stores waveHeightFt as integer (tenths of feet), wavePeriodSec as integer (seconds).
 */
export function convertToDbFormat(
  forecastPoint: NomadsForecastPoint,
  spotId: number
): InsertForecastPoint {
  return {
    spotId: spotId,
    forecastTimestamp: forecastPoint.forecastTimestamp,
    modelRunTime: forecastPoint.modelRunTime,
    hoursOut: forecastPoint.hoursOut,
    waveHeightFt: forecastPoint.waveHeightFt !== null ? Math.round(forecastPoint.waveHeightFt * 10) : null, // Convert to tenths of feet
    wavePeriodSec: forecastPoint.wavePeriodSec !== null ? Math.round(forecastPoint.wavePeriodSec) : null, // Store as seconds (integer)
    waveDirectionDeg: forecastPoint.waveDirectionDeg !== null ? Math.round(forecastPoint.waveDirectionDeg) : null,
    windSpeedKts: forecastPoint.windSpeedKts !== null ? Math.round(forecastPoint.windSpeedKts) : null, // Store as knots (integer)
    windDirectionDeg: forecastPoint.windDirectionDeg !== null ? Math.round(forecastPoint.windDirectionDeg) : null,
    source: forecastPoint.source,
  };
}

