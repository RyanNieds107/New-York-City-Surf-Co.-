/**
 * Open-Meteo Marine API Client
 * 
 * Fetches marine forecast data from the Open-Meteo Marine API
 * using the native fetch API.
 */

import { getSpotCoordinates } from "./spots";

/**
 * Marine forecast data structure
 */
export interface MarineForecastData {
  meta: {
    latitude: number;
    longitude: number;
    elevation: number | null;
    utcOffsetSeconds: number;
  };
  current: {
    time: Date;
    [key: string]: number | Date;
  };
  hourly: {
    time: Date[];
    [key: string]: Float32Array | number[];
  };
  daily: {
    time: Date[];
    [key: string]: Float32Array | number[];
  };
}

/**
 * NOTE: The Open-Meteo Marine API ONLY supports these wave parameters:
 * - wave_height (meters)
 * - wave_period (seconds)
 * - wave_direction (degrees)
 */

/**
 * Fetch marine forecast data for a spot
 * 
 * @param spotKey - Spot key ("lido", "rockaway", "long-beach")
 * @returns Parsed marine forecast data
 */
export async function fetchOpenMeteoMarineForSpot(
  spotKey: string
): Promise<MarineForecastData> {
  const coords = getSpotCoordinates(spotKey);
  if (!coords) {
    throw new Error(`Unknown spot key: ${spotKey}`);
  }

  const latitude = coords.lat;
  const longitude = coords.lon;
  
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&hourly=wave_height,wave_period,wave_direction&timezone=America/New_York`;

  console.log('[Open-Meteo] Fetching:', url);

  const response = await fetch(url);
  const data = await response.json();

  console.log('[Open-Meteo] Response:', data);

  // Parse hourly time array to Date objects
  const hourlyTime = (data.hourly?.time || []).map((timeStr: string) => new Date(timeStr));

  // Parse hourly data arrays
  const hourlyData: { time: Date[]; [key: string]: number[] } = {
    time: hourlyTime,
    wave_height: data.hourly?.wave_height || [],
    wave_period: data.hourly?.wave_period || [],
    wave_direction: data.hourly?.wave_direction || [],
  };

  return {
    meta: {
      latitude: data.latitude,
      longitude: data.longitude,
      elevation: data.elevation || null,
      utcOffsetSeconds: 0, // Timezone is handled in timezone parameter
    },
    current: {
      time: new Date(), // Not available from API
    },
    hourly: hourlyData,
    daily: {
      time: [], // Not available from API
    },
  };
}
