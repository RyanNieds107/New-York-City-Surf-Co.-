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
  // Tertiary swell (third swell component - only available from GFS wave models)
  tertiarySwellHeightFt: number | null;
  tertiarySwellPeriodS: number | null;
  tertiarySwellDirectionDeg: number | null;
  // Wind waves
  windWaveHeightFt: number | null;
  windWavePeriodS: number | null;
  windWaveDirectionDeg: number | null;
  // Wind data
  windSpeedKts: number | null;
  windDirectionDeg: number | null;
  // Temperature data
  waterTempF: number | null;
  airTempF: number | null;
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
    // Secondary swell (Open-Meteo uses secondary_swell_* naming)
    secondary_swell_wave_height?: (number | null)[]; // meters
    secondary_swell_wave_period?: (number | null)[]; // seconds
    secondary_swell_wave_direction?: (number | null)[]; // degrees (0-360)
    // Tertiary swell (only available from GFS wave models)
    tertiary_swell_wave_height?: (number | null)[]; // meters
    tertiary_swell_wave_period?: (number | null)[]; // seconds
    tertiary_swell_wave_direction?: (number | null)[]; // degrees (0-360)
    // Wind waves
    wind_wave_height?: (number | null)[]; // meters
    wind_wave_period?: (number | null)[]; // seconds
    wind_wave_direction?: (number | null)[]; // degrees (0-360)
    // Combined wave (for backward compatibility)
    wave_height?: (number | null)[]; // meters
    wave_period?: (number | null)[]; // seconds
    wave_direction?: (number | null)[]; // degrees (0-360)
    // Wind data
    wind_speed_10m?: (number | null)[]; // km/h
    wind_direction_10m?: (number | null)[]; // degrees (0-360)
    // Temperature data
    sea_surface_temperature?: (number | null)[]; // Celsius (from Marine API)
    temperature_2m?: (number | null)[]; // Celsius (from Weather API)
  };
}

/**
 * Gets current conditions from Open-Meteo for a specific surf spot.
 * Returns the first hour (current/nearest) forecast point.
 * 
 * @param spot - The surf spot with latitude/longitude
 * @returns Current conditions forecast point or null if unavailable
 */
export async function getCurrentConditionsFromOpenMeteo(
  spot: SurfSpot
): Promise<NomadsForecastPoint | null> {
  const forecastPoints = await fetchOpenMeteoForecastForSpot(spot, { maxHoursOut: 1 });
  if (forecastPoints.length === 0) return null;
  // Return the first point (current/nearest hour, should be hoursOut = 0 or close)
  return forecastPoints[0];
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
  
  // Request parameters for Marine API (wave data only - wind not supported)
  const marineHourlyParams = [
    // Primary swell
    'swell_wave_height',
    'swell_wave_period',
    'swell_wave_direction',
    // Secondary swell (note: Open-Meteo uses secondary_swell_* naming)
    'secondary_swell_wave_height',
    'secondary_swell_wave_period',
    'secondary_swell_wave_direction',
    // Tertiary swell (only available from GFS wave models)
    'tertiary_swell_wave_height',
    'tertiary_swell_wave_period',
    'tertiary_swell_wave_direction',
    // Wind waves
    'wind_wave_height',
    'wind_wave_period',
    'wind_wave_direction',
    // Combined wave (for backward compatibility)
    'wave_height',
    'wave_period',
    'wave_direction',
    // Water temperature (sea surface temperature)
    'sea_surface_temperature',
    // NOTE: wind_speed_10m and wind_direction_10m are NOT supported by Marine API
    // Wind data and air temperature must come from the Weather Forecast API
  ];
  
  // Strictly set to 5 days for 120-hour forecasts
  // When maxHoursOut is 120, we MUST request exactly 5 days to get 120 hours of data
  const forecastDays = maxHoursOut >= 120 ? 5 : Math.ceil(maxHoursOut / 24);

  console.log(`[Open-Meteo] Requesting ${forecastDays} days (${maxHoursOut} hours) of forecast data`);
  if (maxHoursOut >= 120 && forecastDays !== 5) {
    console.warn(`[Open-Meteo] WARNING: Expected 5 days for 120-hour forecast, but got ${forecastDays}`);
  }

  const marineParams = {
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: marineHourlyParams.join(','),
    timezone: "auto",
    forecast_days: forecastDays,
  };

  // 🌊 STEP 1: Open-Meteo Marine API Request
  console.log('🌊 STEP 1: Open-Meteo Marine API Request');
  console.log('URL:', apiUrl);
  console.log('Parameters requested:', marineHourlyParams);

  // Construct and log the full request URL
  const fullUrl = `${apiUrl}?latitude=${lat}&longitude=${lon}&hourly=${marineHourlyParams.join(',')}&timezone=${marineParams.timezone}&forecast_days=${marineParams.forecast_days}`;
  console.log('[Open-Meteo] Full Marine request URL:', fullUrl);

  // Weather API for wind data and air temperature (Marine API doesn't support these)
  const weatherApiUrl = "https://api.open-meteo.com/v1/forecast";
  const weatherParams = {
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: 'wind_speed_10m,wind_direction_10m,temperature_2m',
    timezone: "auto",
    forecast_days: forecastDays,
  };
  const weatherFullUrl = `${weatherApiUrl}?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m,temperature_2m&timezone=${weatherParams.timezone}&forecast_days=${weatherParams.forecast_days}`;
  console.log('[Open-Meteo] Full Weather request URL:', weatherFullUrl);

  try {
    // Fetch marine data and weather data in parallel
    const [marineResponse, weatherResponse] = await Promise.all([
      axios.get<OpenMeteoResponse>(apiUrl, {
        params: marineParams,
        timeout: 30000,
      }),
      axios.get<OpenMeteoResponse>(weatherApiUrl, {
        params: weatherParams,
        timeout: 30000,
      }),
    ]);

    // Log the response bodies
    console.log('[Open-Meteo] Marine response received');
    console.log('[Open-Meteo] Weather response received');

    if (!marineResponse.data || !marineResponse.data.hourly) {
      throw new Error("Invalid response from Open-Meteo Marine API");
    }

    const data = marineResponse.data;
    const hourly = data.hourly;

    // Get wind and temperature data from weather response
    const weatherHourly = weatherResponse.data?.hourly || {};
    // Merge wind data into hourly object
    hourly.wind_speed_10m = weatherHourly.wind_speed_10m as (number | null)[] || [];
    hourly.wind_direction_10m = weatherHourly.wind_direction_10m as (number | null)[] || [];
    // Merge air temperature from weather response
    hourly.temperature_2m = weatherHourly.temperature_2m as (number | null)[] || [];

    // Validate required arrays exist
    if (!hourly.time || hourly.time.length === 0) {
      throw new Error("No time data in Open-Meteo response");
    }

    // 🌊 STEP 2: Open-Meteo API Response
    console.log('🌊 STEP 2: Open-Meteo API Response');
    console.log('Has primary swell?', !!hourly.swell_wave_height);
    console.log('Has secondary swell?', !!hourly.secondary_swell_wave_height);
    console.log('Has wind waves?', !!hourly.wind_wave_height);
    console.log('Has wind data?', !!hourly.wind_speed_10m?.length);
    console.log('Has water temp?', !!hourly.sea_surface_temperature?.length);
    console.log('Has air temp?', !!hourly.temperature_2m?.length);
    console.log('First hour sample:', {
      primary: hourly.swell_wave_height?.[0],
      secondary: hourly.secondary_swell_wave_height?.[0],
      windWave: hourly.wind_wave_height?.[0],
      windSpeed: hourly.wind_speed_10m?.[0],
      windDir: hourly.wind_direction_10m?.[0],
      waterTempC: hourly.sea_surface_temperature?.[0],
      airTempC: hourly.temperature_2m?.[0],
    });
    console.log('Available hourly fields:', Object.keys(hourly));
    if (hourly.swell_wave_height) {
      console.log(`Primary swell data: ${hourly.swell_wave_height.filter(v => v !== null).length} non-null values`);
    }
    if (hourly.secondary_swell_wave_height) {
      console.log(`Secondary swell data: ${hourly.secondary_swell_wave_height.filter(v => v !== null).length} non-null values`);
    } else {
      console.log(`No secondary swell data in response`);
    }
    if (hourly.wind_wave_height) {
      console.log(`Wind wave data: ${hourly.wind_wave_height.filter(v => v !== null).length} non-null values`);
    } else {
      console.log(`No wind wave data in response`);
    }
    if (hourly.wind_speed_10m) {
      console.log(`Wind speed data: ${hourly.wind_speed_10m.filter(v => v !== null).length} non-null values`);
    } else {
      console.log(`No wind speed data in response`);
    }

    // Use current time as model run time (Open-Meteo doesn't provide explicit model run time)
    // The forecast is generated on-demand, so we use "now" as the reference
    const modelRunTime = new Date();
    
    // Convert hourly data to forecast points
    // IMPORTANT: Do NOT filter out any hours - we need all 120+ points for the 5-day forecast
    const forecastPoints: NomadsForecastPoint[] = [];
    const numHours = hourly.time.length; // Use ALL available hours, don't limit

    console.log(`[Open-Meteo] Processing ${numHours} hourly data points from API response`);

    for (let i = 0; i < numHours; i++) {
      const timeStr = hourly.time[i];
      if (!timeStr) continue;

      const forecastTimestamp = new Date(timeStr);

      // Calculate hours out from model run time
      const hoursOut = Math.round((forecastTimestamp.getTime() - modelRunTime.getTime()) / (1000 * 60 * 60));

      // Only skip if significantly in the past (more than 2 hours ago)
      // Keep all future hours regardless of maxHoursOut to ensure we get full 120-hour forecast
      if (hoursOut < -2) continue;

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

      // Extract secondary swell values (Open-Meteo uses secondary_swell_* naming)
      const secondarySwellHeightM = hourly.secondary_swell_wave_height?.[i] ?? null;
      const secondarySwellPeriodSRaw = hourly.secondary_swell_wave_period?.[i] ?? null;
      const secondarySwellDirectionDegRaw = hourly.secondary_swell_wave_direction?.[i] ?? null;

      // Extract tertiary swell values (only available from GFS wave models)
      const tertiarySwellHeightM = hourly.tertiary_swell_wave_height?.[i] ?? null;
      const tertiarySwellPeriodSRaw = hourly.tertiary_swell_wave_period?.[i] ?? null;
      const tertiarySwellDirectionDegRaw = hourly.tertiary_swell_wave_direction?.[i] ?? null;

      // Extract wind wave values
      const windWaveHeightM = hourly.wind_wave_height?.[i] ?? null;
      const windWavePeriodSRaw = hourly.wind_wave_period?.[i] ?? null;
      const windWaveDirectionDegRaw = hourly.wind_wave_direction?.[i] ?? null;

      // Extract wind data (Weather API returns km/h, not m/s)
      const windSpeedKmh = hourly.wind_speed_10m?.[i] ?? null;
      const windDirectionDegRaw = hourly.wind_direction_10m?.[i] ?? null;

      // Extract temperature data (both are in Celsius)
      const waterTempC = hourly.sea_surface_temperature?.[i] ?? null;
      const airTempC = hourly.temperature_2m?.[i] ?? null;

      // Helper function to convert Celsius to Fahrenheit
      const celsiusToFahrenheit = (c: number | null): number | null => {
        if (c === null || isNaN(c)) return null;
        return (c * 9/5) + 32;
      };

      // Convert units and validate
      const waveHeightFt = metersToFeet(primarySwellHeightM);
      const wavePeriodSec = validatePeriod(primarySwellPeriodS);
      const waveDirection = validateDirection(primarySwellDirectionDeg);

      const secondarySwellHeightFt = metersToFeet(secondarySwellHeightM);
      const secondarySwellPeriodS = validatePeriod(secondarySwellPeriodSRaw);
      const secondarySwellDirectionDeg = validateDirection(secondarySwellDirectionDegRaw);

      const tertiarySwellHeightFt = metersToFeet(tertiarySwellHeightM);
      const tertiarySwellPeriodS = validatePeriod(tertiarySwellPeriodSRaw);
      const tertiarySwellDirectionDeg = validateDirection(tertiarySwellDirectionDegRaw);

      const windWaveHeightFt = metersToFeet(windWaveHeightM);
      const windWavePeriodS = validatePeriod(windWavePeriodSRaw);
      const windWaveDirectionDeg = validateDirection(windWaveDirectionDegRaw);

      const windSpeedKts = windSpeedKmh !== null && !isNaN(windSpeedKmh) && windSpeedKmh >= 0
        ? windSpeedKmh * 0.539957 // km/h to knots
        : null;

      const windDirection = validateDirection(windDirectionDegRaw);

      // Convert temperatures from Celsius to Fahrenheit
      const waterTempF = celsiusToFahrenheit(waterTempC);
      const airTempF = celsiusToFahrenheit(airTempC);

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
        // Tertiary swell
        tertiarySwellHeightFt,
        tertiarySwellPeriodS,
        tertiarySwellDirectionDeg,
        // Wind waves
        windWaveHeightFt,
        windWavePeriodS,
        windWaveDirectionDeg,
        // Wind data
        windSpeedKts,
        windDirectionDeg: windDirection,
        // Temperature data
        waterTempF,
        airTempF,
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
        temperature: { waterTempF: firstPoint.waterTempF, airTempF: firstPoint.airTempF },
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
    // Tertiary swell (stored as decimal feet - convert to string for decimal type)
    tertiarySwellHeightFt: forecastPoint.tertiarySwellHeightFt !== null ? forecastPoint.tertiarySwellHeightFt.toFixed(1) : null,
    tertiarySwellPeriodS: forecastPoint.tertiarySwellPeriodS !== null ? Math.round(forecastPoint.tertiarySwellPeriodS) : null,
    tertiarySwellDirectionDeg: forecastPoint.tertiarySwellDirectionDeg !== null ? Math.round(forecastPoint.tertiarySwellDirectionDeg) : null,
    // Wind waves (stored as decimal feet - convert to string for decimal type)
    windWaveHeightFt: forecastPoint.windWaveHeightFt !== null ? forecastPoint.windWaveHeightFt.toFixed(1) : null,
    windWavePeriodS: forecastPoint.windWavePeriodS !== null ? Math.round(forecastPoint.windWavePeriodS) : null,
    windWaveDirectionDeg: forecastPoint.windWaveDirectionDeg !== null ? Math.round(forecastPoint.windWaveDirectionDeg) : null,
    // Wind data
    windSpeedKts: forecastPoint.windSpeedKts !== null ? Math.round(forecastPoint.windSpeedKts) : null,
    windDirectionDeg: forecastPoint.windDirectionDeg !== null ? Math.round(forecastPoint.windDirectionDeg) : null,
    // Temperature data (stored as decimal Fahrenheit - convert to string for decimal type)
    waterTempF: forecastPoint.waterTempF !== null ? forecastPoint.waterTempF.toFixed(1) : null,
    airTempF: forecastPoint.airTempF !== null ? forecastPoint.airTempF.toFixed(1) : null,
    source: forecastPoint.source,
  };
  return dbPoint;
}

