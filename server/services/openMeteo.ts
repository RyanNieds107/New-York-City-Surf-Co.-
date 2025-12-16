import axios from "axios";
import type { SurfSpot } from "../../drizzle/schema";
import type { InsertForecastPoint } from "../../drizzle/schema";

/**
 * Open-Meteo Marine Forecast Service
 * Fetches forecast data from Open-Meteo Marine API
 * https://open-meteo.com/en/docs/marine-weather-api
 */

// Reuse the same interface as NOMADS for compatibility
export interface NomadsForecastPoint {
  forecastTimestamp: Date;
  modelRunTime: Date;
  hoursOut: number;
  // Primary swell (backward compatibility)
  waveHeightFt: number | null;
  wavePeriodSec: number | null;
  waveDirectionDeg: number | null;
  // Secondary swell
  secondarySwellHeightFt: number | null;
  secondarySwellPeriodS: number | null;
  secondarySwellDirectionDeg: number | null;
  // Wind waves
  windWaveHeightFt: number | null;
  windWavePeriodS: number | null;
  windWaveDirectionDeg: number | null;
  // Wind data
  windSpeedKts: number | null;
  windDirectionDeg: number | null;
  source: "ww3" | "gfs" | "hrrr";
}

/**
 * Open-Meteo API response structure
 */
interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number | null;
  hourly: {
    time: string[]; // ISO 8601 timestamps
    // Primary swell
    swell_wave_height?: (number | null)[]; // meters
    swell_wave_period?: (number | null)[]; // seconds
    swell_wave_direction?: (number | null)[]; // degrees (0-360)
    // Secondary swell
    swell_wave_height_secondary?: (number | null)[]; // meters
    swell_wave_period_secondary?: (number | null)[]; // seconds
    swell_wave_direction_secondary?: (number | null)[]; // degrees (0-360)
    // Wind waves
    wind_wave_height?: (number | null)[]; // meters
    wind_wave_period?: (number | null)[]; // seconds
    wind_wave_direction?: (number | null)[]; // degrees (0-360)
    // Combined wave (for backward compatibility)
    wave_height?: (number | null)[]; // meters
    wave_period?: (number | null)[]; // seconds
    wave_direction?: (number | null)[]; // degrees (0-360)
    // Wind data
    wind_speed_10m?: (number | null)[]; // m/s
    wind_direction_10m?: (number | null)[]; // degrees (0-360)
  };
}

/**
 * Fetches marine forecast data from Open-Meteo API for a specific surf spot.
 * 
 * @param spot - The surf spot with latitude/longitude
 * @param options - Optional configuration
 * @returns Array of forecast points in the same format as NOMADS
 */
export async function fetchOpenMeteoForecastForSpot(
  spot: SurfSpot,
  options?: { maxHoursOut?: number }
): Promise<NomadsForecastPoint[]> {
  const lat = parseFloat(spot.latitude);
  const lon = parseFloat(spot.longitude);
  const maxHoursOut = options?.maxHoursOut ?? 168; // Default 7 days (168 hours)

  if (isNaN(lat) || isNaN(lon)) {
    throw new Error(`Invalid coordinates for spot ${spot.name}: ${spot.latitude}, ${spot.longitude}`);
  }

  console.log(`[Open-Meteo] Fetching marine forecast for ${spot.name} (${lat}, ${lon})`);

  // Open-Meteo Marine API endpoint
  const apiUrl = "https://marine-api.open-meteo.com/v1/marine";
  
  // Request parameters - include all swell components
  const hourlyParams = [
    // Primary swell
    'swell_wave_height',
    'swell_wave_period',
    'swell_wave_direction',
    // Secondary swell
    'swell_wave_height_secondary',
    'swell_wave_period_secondary',
    'swell_wave_direction_secondary',
    // Wind waves
    'wind_wave_height',
    'wind_wave_period',
    'wind_wave_direction',
    // Combined wave (for backward compatibility)
    'wave_height',
    'wave_period',
    'wave_direction',
    // Wind data
    'wind_speed_10m',
    'wind_direction_10m',
  ];
  
  const params = {
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: hourlyParams.join(','),
    timezone: "auto", // Auto-detect timezone
    forecast_days: Math.ceil(maxHoursOut / 24), // Convert hours to days (round up)
  };

  // 🌊 STEP 1: Open-Meteo API Request
  console.log('🌊 STEP 1: Open-Meteo API Request');
  console.log('URL:', apiUrl);
  console.log('Parameters requested:', hourlyParams);
  
  // Construct and log the full request URL
  const fullUrl = `${apiUrl}?latitude=${lat}&longitude=${lon}&hourly=${hourlyParams.join(',')}&timezone=${params.timezone}&forecast_days=${params.forecast_days}`;
  console.log('[Open-Meteo] Full request URL:', fullUrl);

  try {
    const response = await axios.get<OpenMeteoResponse>(apiUrl, {
      params,
      timeout: 30000,
    });
    
    // Log the response body
    console.log('[Open-Meteo] Response body:', JSON.stringify(response.data, null, 2));

    if (!response.data || !response.data.hourly) {
      throw new Error("Invalid response from Open-Meteo API");
    }

    const data = response.data;
    const hourly = data.hourly;

    // Validate required arrays exist
    if (!hourly.time || hourly.time.length === 0) {
      throw new Error("No time data in Open-Meteo response");
    }

    // 🌊 STEP 2: Open-Meteo API Response
    console.log('🌊 STEP 2: Open-Meteo API Response');
    console.log('Has primary swell?', !!hourly.swell_wave_height);
    console.log('Has secondary swell?', !!hourly.swell_wave_height_secondary);
    console.log('Has wind waves?', !!hourly.wind_wave_height);
    console.log('First hour sample:', {
      primary: hourly.swell_wave_height?.[0],
      secondary: hourly.swell_wave_height_secondary?.[0],
      wind: hourly.wind_wave_height?.[0]
    });
    console.log('Available hourly fields:', Object.keys(hourly));
    if (hourly.swell_wave_height) {
      console.log(`Primary swell data: ${hourly.swell_wave_height.filter(v => v !== null).length} non-null values`);
    }
    if (hourly.swell_wave_height_secondary) {
      console.log(`Secondary swell data: ${hourly.swell_wave_height_secondary.filter(v => v !== null).length} non-null values`);
    } else {
      console.log(`No secondary swell data in response`);
    }
    if (hourly.wind_wave_height) {
      console.log(`Wind wave data: ${hourly.wind_wave_height.filter(v => v !== null).length} non-null values`);
    } else {
      console.log(`No wind wave data in response`);
    }

    // Use current time as model run time (Open-Meteo doesn't provide explicit model run time)
    // The forecast is generated on-demand, so we use "now" as the reference
    const modelRunTime = new Date();
    
    // Convert hourly data to forecast points
    const forecastPoints: NomadsForecastPoint[] = [];
    const numHours = Math.min(hourly.time.length, maxHoursOut);

    for (let i = 0; i < numHours; i++) {
      const timeStr = hourly.time[i];
      if (!timeStr) continue;

      const forecastTimestamp = new Date(timeStr);
      
      // Calculate hours out from model run time
      const hoursOut = Math.round((forecastTimestamp.getTime() - modelRunTime.getTime()) / (1000 * 60 * 60));
      
      // Skip if hoursOut is negative (past data) or exceeds max
      if (hoursOut < 0 || hoursOut > maxHoursOut) continue;

      // Helper function to convert meters to feet
      const metersToFeet = (m: number | null): number | null => {
        if (m === null || isNaN(m) || m < 0) return null;
        return m * 3.28084;
      };

      // Helper function to validate and round period
      const validatePeriod = (s: number | null): number | null => {
        if (s === null || isNaN(s) || s <= 0) return null;
        return s;
      };

      // Helper function to validate direction
      const validateDirection = (deg: number | null): number | null => {
        if (deg === null || isNaN(deg) || deg < 0 || deg > 360) return null;
        return deg;
      };

      // Extract primary swell values (prefer swell_wave_* over wave_*)
      const primarySwellHeightM = hourly.swell_wave_height?.[i] ?? hourly.wave_height?.[i] ?? null;
      const primarySwellPeriodS = hourly.swell_wave_period?.[i] ?? hourly.wave_period?.[i] ?? null;
      const primarySwellDirectionDeg = hourly.swell_wave_direction?.[i] ?? hourly.wave_direction?.[i] ?? null;

      // Extract secondary swell values
      const secondarySwellHeightM = hourly.swell_wave_height_secondary?.[i] ?? null;
      const secondarySwellPeriodSRaw = hourly.swell_wave_period_secondary?.[i] ?? null;
      const secondarySwellDirectionDegRaw = hourly.swell_wave_direction_secondary?.[i] ?? null;

      // Extract wind wave values
      const windWaveHeightM = hourly.wind_wave_height?.[i] ?? null;
      const windWavePeriodSRaw = hourly.wind_wave_period?.[i] ?? null;
      const windWaveDirectionDegRaw = hourly.wind_wave_direction?.[i] ?? null;

      // Extract wind data
      const windSpeedMs = hourly.wind_speed_10m?.[i] ?? null;
      const windDirectionDegRaw = hourly.wind_direction_10m?.[i] ?? null;

      // Convert units and validate
      const waveHeightFt = metersToFeet(primarySwellHeightM);
      const wavePeriodSec = validatePeriod(primarySwellPeriodS);
      const waveDirection = validateDirection(primarySwellDirectionDeg);

      const secondarySwellHeightFt = metersToFeet(secondarySwellHeightM);
      const secondarySwellPeriodS = validatePeriod(secondarySwellPeriodSRaw);
      const secondarySwellDirectionDeg = validateDirection(secondarySwellDirectionDegRaw);

      const windWaveHeightFt = metersToFeet(windWaveHeightM);
      const windWavePeriodS = validatePeriod(windWavePeriodSRaw);
      const windWaveDirectionDeg = validateDirection(windWaveDirectionDegRaw);

      const windSpeedKts = windSpeedMs !== null && !isNaN(windSpeedMs) && windSpeedMs >= 0
        ? windSpeedMs * 1.94384 // m/s to knots
        : null;

      const windDirection = validateDirection(windDirectionDegRaw);

      forecastPoints.push({
        forecastTimestamp,
        modelRunTime,
        hoursOut,
        // Primary swell (backward compatibility)
        waveHeightFt,
        wavePeriodSec,
        waveDirectionDeg: waveDirection,
        // Secondary swell
        secondarySwellHeightFt,
        secondarySwellPeriodS,
        secondarySwellDirectionDeg,
        // Wind waves
        windWaveHeightFt,
        windWavePeriodS,
        windWaveDirectionDeg,
        // Wind data
        windSpeedKts,
        windDirectionDeg: windDirection,
        source: "ww3", // Keep same source enum for compatibility
      });
    }

    console.log(`[Open-Meteo] Fetched ${forecastPoints.length} forecast points for ${spot.name}`);
    if (forecastPoints.length > 0) {
      const firstPoint = forecastPoints[0];
      console.log('First forecast point sample:', {
        primary: { height: firstPoint.waveHeightFt, period: firstPoint.wavePeriodSec, dir: firstPoint.waveDirectionDeg },
        secondary: { height: firstPoint.secondarySwellHeightFt, period: firstPoint.secondarySwellPeriodS, dir: firstPoint.secondarySwellDirectionDeg },
        windWave: { height: firstPoint.windWaveHeightFt, period: firstPoint.windWavePeriodS, dir: firstPoint.windWaveDirectionDeg },
      });
    }
    return forecastPoints;

  } catch (error: any) {
    // Log detailed error information
    console.error('[Open-Meteo] Request failed:');
    console.error('  spotId:', spot.id);
    console.error('  lat:', lat);
    console.error('  lon:', lon);
    console.error('  request URL:', fullUrl);
    if (error.response) {
      console.error('  status:', error.response.status);
      console.error('  response data:', error.response.data);
    }
    throw error; // Re-throw to be caught by router
  }
}

/**
 * Converts NomadsForecastPoint to database InsertForecastPoint format.
 * Reuses the same conversion logic from NOMADS service for compatibility.
 */
export function convertToDbFormat(
  forecastPoint: NomadsForecastPoint,
  spotId: number
): InsertForecastPoint {
  const dbPoint = {
    spotId: spotId,
    forecastTimestamp: forecastPoint.forecastTimestamp,
    modelRunTime: forecastPoint.modelRunTime,
    hoursOut: forecastPoint.hoursOut,
    // Primary swell (backward compatibility - stored as integer tenths of feet)
    waveHeightFt: forecastPoint.waveHeightFt !== null ? Math.round(forecastPoint.waveHeightFt * 10) : null,
    wavePeriodSec: forecastPoint.wavePeriodSec !== null ? Math.round(forecastPoint.wavePeriodSec) : null,
    waveDirectionDeg: forecastPoint.waveDirectionDeg !== null ? Math.round(forecastPoint.waveDirectionDeg) : null,
    // Secondary swell (stored as decimal feet - convert to string for decimal type)
    secondarySwellHeightFt: forecastPoint.secondarySwellHeightFt !== null ? forecastPoint.secondarySwellHeightFt.toFixed(1) : null,
    secondarySwellPeriodS: forecastPoint.secondarySwellPeriodS !== null ? Math.round(forecastPoint.secondarySwellPeriodS) : null,
    secondarySwellDirectionDeg: forecastPoint.secondarySwellDirectionDeg !== null ? Math.round(forecastPoint.secondarySwellDirectionDeg) : null,
    // Wind waves (stored as decimal feet - convert to string for decimal type)
    windWaveHeightFt: forecastPoint.windWaveHeightFt !== null ? forecastPoint.windWaveHeightFt.toFixed(1) : null,
    windWavePeriodS: forecastPoint.windWavePeriodS !== null ? Math.round(forecastPoint.windWavePeriodS) : null,
    windWaveDirectionDeg: forecastPoint.windWaveDirectionDeg !== null ? Math.round(forecastPoint.windWaveDirectionDeg) : null,
    // Wind data
    windSpeedKts: forecastPoint.windSpeedKts !== null ? Math.round(forecastPoint.windSpeedKts) : null,
    windDirectionDeg: forecastPoint.windDirectionDeg !== null ? Math.round(forecastPoint.windDirectionDeg) : null,
    source: forecastPoint.source,
  };
  return dbPoint;
}

