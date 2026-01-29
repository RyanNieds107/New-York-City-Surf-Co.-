import { ENV } from "../_core/env";
import type { SurfSpot } from "../../drizzle/schema";

/**
 * Stormglass API Response structure (ECMWF wave data)
 */
interface StormglassResponse {
  hours: Array<{
    time: string; // ISO 8601 timestamp
    waveHeight?: {
      ecmwf?: number; // meters
      [source: string]: number | undefined;
    };
    swellHeight?: {
      ecmwf?: number; // meters
      [source: string]: number | undefined;
    };
    swellPeriod?: {
      ecmwf?: number; // seconds
      [source: string]: number | undefined;
    };
    swellDirection?: {
      ecmwf?: number; // degrees
      [source: string]: number | undefined;
    };
  }>;
  meta?: {
    cost: number;
    dailyQuota: number;
    requestCount: number;
  };
}

/**
 * Processed Stormglass forecast point
 */
export interface StormglassForecastPoint {
  forecastTimestamp: Date;
  waveHeightFt: number | null;
  swellHeightFt: number | null;
  swellPeriodS: number | null;
  swellDirectionDeg: number | null;
  source: string;
}

/**
 * Converts meters to feet
 */
function metersToFeet(m: number | undefined): number | null {
  if (m === undefined || m === null || isNaN(m)) return null;
  return m * 3.28084;
}

/**
 * Fetches ECMWF wave data from Stormglass API for a specific spot.
 *
 * IMPORTANT: Free tier is limited to 10 requests/day.
 * Call sparingly - typically once per day per spot.
 */
export async function fetchStormglassForSpot(
  spot: SurfSpot,
  options?: { hoursAhead?: number }
): Promise<StormglassForecastPoint[]> {
  const apiKey = ENV.stormglassApiKey;

  if (!apiKey) {
    console.warn("[Stormglass] API key not configured - skipping fetch");
    return [];
  }

  const lat = parseFloat(spot.latitude);
  const lon = parseFloat(spot.longitude);
  const hoursAhead = options?.hoursAhead ?? 48; // Default 48 hours (2 days)

  if (isNaN(lat) || isNaN(lon)) {
    throw new Error(`Invalid coordinates for spot ${spot.name}`);
  }

  console.log(`[Stormglass] Fetching ECMWF data for ${spot.name} (${lat}, ${lon})`);

  // Calculate time range
  const now = new Date();
  const endTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  const apiUrl = "https://api.stormglass.io/v2/weather/point";

  // Build query parameters
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lon.toString(),
    params: "waveHeight,swellHeight,swellPeriod,swellDirection",
    source: "ecmwf",
    start: now.toISOString(),
    end: endTime.toISOString(),
  });

  try {
    const response = await fetch(`${apiUrl}?${params}`, {
      method: "GET",
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 402) {
        console.error("[Stormglass] Daily quota exceeded (402 Payment Required)");
        throw new Error("Stormglass daily quota exceeded");
      } else if (response.status === 401) {
        console.error("[Stormglass] Invalid API key (401 Unauthorized)");
        throw new Error("Invalid Stormglass API key");
      } else {
        throw new Error(`Stormglass API error: ${response.status} ${response.statusText}`);
      }
    }

    const data: StormglassResponse = await response.json();

    console.log(`[Stormglass] API cost: ${data.meta?.cost ?? "unknown"}, ` +
      `quota remaining: ${data.meta?.dailyQuota ?? "unknown"}`);

    if (!data.hours || data.hours.length === 0) {
      console.warn("[Stormglass] No hourly data in response");
      return [];
    }

    // Convert to our format
    const forecastPoints: StormglassForecastPoint[] = data.hours.map((hour) => ({
      forecastTimestamp: new Date(hour.time),
      waveHeightFt: metersToFeet(hour.waveHeight?.ecmwf),
      swellHeightFt: metersToFeet(hour.swellHeight?.ecmwf),
      swellPeriodS: hour.swellPeriod?.ecmwf ?? null,
      swellDirectionDeg: hour.swellDirection?.ecmwf ?? null,
      source: "ecmwf",
    }));

    console.log(`[Stormglass] Fetched ${forecastPoints.length} ECMWF forecast points for ${spot.name}`);
    return forecastPoints;

  } catch (error: any) {
    console.error("[Stormglass] API request failed:", error.message);
    throw error;
  }
}
