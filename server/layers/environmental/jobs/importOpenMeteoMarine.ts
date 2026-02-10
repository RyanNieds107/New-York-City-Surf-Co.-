/**
 * Open-Meteo Marine API Ingestion Job
 * 
 * Fetches marine forecast data from Open-Meteo and ingests it into the database.
 * Uses upsert strategy: deletes existing forecasts for the same spot + modelRunTime,
 * then inserts new forecasts.
 */

import { getAllSpots } from "../db";
import { insertForecastPoints, deleteForecastPointsBySpotAndModelRun } from "../db";
import type { InsertForecastPoint } from "../../drizzle/schema";
import { fetchOpenMeteoMarineForSpot } from "../services/openmeteo/marineClient";
import { getSpotKeyFromName } from "../services/openmeteo/spots";
import { metersToFeet } from "../services/openmeteo/conversions";

/**
 * Calculate hours from model run time to forecast timestamp
 */
function calculateHoursOut(modelRunTime: Date, forecastTimestamp: Date): number {
  const diffMs = forecastTimestamp.getTime() - modelRunTime.getTime();
  return Math.round(diffMs / (1000 * 60 * 60));
}

/**
 * Convert meters to feet and then to integer tenths (for waveHeightFt storage)
 */
function metersToFeetTenths(m: number | null | undefined): number | null {
  const feet = metersToFeet(m);
  if (feet === null) return null;
  return Math.round(feet * 10);
}

/**
 * Round number to integer, returning null if input is null/undefined
 */
function roundToInt(value: number | null | undefined): number | null {
  if (value === null || value === undefined || isNaN(value)) return null;
  return Math.round(value);
}

/**
 * Convert number to decimal string (for decimal fields), returning null if input is null/undefined
 */
function toDecimalString(value: number | null | undefined): string | null {
  if (value === null || value === undefined || isNaN(value)) return null;
  return value.toFixed(1);
}

/**
 * Main ingestion function
 * Fetches and ingests marine forecast data for all spots
 */
export async function importOpenMeteoMarineForecasts(): Promise<void> {
  console.log("[Open-Meteo Marine] Starting ingestion...");

  const spots = await getAllSpots();
  const modelRunTime = new Date(); // Current UTC time when model runs

  console.log(`[Open-Meteo Marine] Processing ${spots.length} spots`);
  console.log(`[Open-Meteo Marine] Model run time: ${modelRunTime.toISOString()}`);

  for (const spot of spots) {
    try {
      console.log(`[Open-Meteo Marine] Processing spot: ${spot.name} (ID: ${spot.id})`);

      // Map spot name to key
      const spotKey = getSpotKeyFromName(spot.name);
      if (!spotKey) {
        console.warn(`[Open-Meteo Marine] No key mapping for spot: ${spot.name}, skipping`);
        continue;
      }

      // Fetch marine forecast data (7 days of hourly data)
      const marineData = await fetchOpenMeteoMarineForSpot(spotKey);
      console.log(
        `[Open-Meteo Marine] Fetched ${marineData.hourly.time.length} hourly points for ${spot.name}`
      );

      // Convert to InsertForecastPoint format
      const forecastPoints: InsertForecastPoint[] = [];

      for (let i = 0; i < marineData.hourly.time.length; i++) {
        const forecastTimestamp = marineData.hourly.time[i];

        // Open-Meteo Marine API only provides these three parameters:
        // wave_height (meters), wave_period (seconds), wave_direction (degrees)
        const waveHeightM =
          (marineData.hourly.wave_height as Float32Array | number[])?.[i] ?? null;
        const wavePeriodS =
          (marineData.hourly.wave_period as Float32Array | number[])?.[i] ?? null;
        const waveDirectionDegRaw =
          (marineData.hourly.wave_direction as Float32Array | number[])?.[i] ?? null;

        // Convert units:
        // - wave_height (meters) → waveHeightFt (convert to feet, store as integer * 10)
        // - wave_period (seconds) → wavePeriodSec (store as integer)
        // - wave_direction (degrees) → waveDirectionDeg (store as integer)
        const waveHeightFt = metersToFeetTenths(waveHeightM);
        const wavePeriodSec = roundToInt(wavePeriodS);
        const waveDirectionDeg = roundToInt(waveDirectionDegRaw);

        const hoursOut = calculateHoursOut(modelRunTime, forecastTimestamp);

        const forecastPoint: InsertForecastPoint = {
          spotId: spot.id,
          forecastTimestamp,
          modelRunTime,
          hoursOut,
          // Primary swell (stored as integer tenths)
          waveHeightFt,
          wavePeriodSec,
          waveDirectionDeg,
          // Secondary swell (API doesn't provide - set to null)
          secondarySwellHeightFt: null,
          secondarySwellPeriodS: null,
          secondarySwellDirectionDeg: null,
          // Wind waves (API doesn't provide - set to null)
          windWaveHeightFt: null,
          windWavePeriodS: null,
          windWaveDirectionDeg: null,
          // Wind (API doesn't provide - set to null)
          windSpeedKts: null,
          windDirectionDeg: null,
          source: "openmeteo",
        };

        forecastPoints.push(forecastPoint);
      }

      // Delete existing forecasts for this spot + modelRunTime (upsert strategy)
      console.log(
        `[Open-Meteo Marine] Deleting existing forecasts for spot ${spot.id}, modelRunTime ${modelRunTime.toISOString()}`
      );
      await deleteForecastPointsBySpotAndModelRun(spot.id, modelRunTime);

      // Insert new forecasts
      if (forecastPoints.length > 0) {
        console.log(
          `[Open-Meteo Marine] Inserting ${forecastPoints.length} forecast points for ${spot.name}`
        );
        await insertForecastPoints(forecastPoints);
        console.log(`[Open-Meteo Marine] ✓ Successfully ingested forecasts for ${spot.name}`);
      } else {
        console.warn(`[Open-Meteo Marine] No forecast points to insert for ${spot.name}`);
      }
    } catch (error) {
      console.error(
        `[Open-Meteo Marine] ✗ Failed to ingest forecasts for spot ${spot.id} (${spot.name}):`,
        error
      );
      // Continue with other spots
    }
  }

  console.log("[Open-Meteo Marine] Ingestion completed");
}

/**
 * Smoke test function - fetches and logs one hour sample for Lido Beach
 */
export async function smokeTestLido(): Promise<void> {
  console.log("[Open-Meteo Marine Smoke Test] Fetching data for Lido Beach...");

  try {
    const marineData = await fetchOpenMeteoMarineForSpot("lido");

    if (marineData.hourly.time.length === 0) {
      console.log("[Smoke Test] No hourly data available");
      return;
    }

    const i = 0; // First hour
    const forecastTimestamp = marineData.hourly.time[i];

    // Open-Meteo Marine API only provides these three parameters:
    // wave_height (meters), wave_period (seconds), wave_direction (degrees)
    const waveHeightM =
      (marineData.hourly.wave_height as Float32Array | number[])?.[i] ?? null;
    const wavePeriodS =
      (marineData.hourly.wave_period as Float32Array | number[])?.[i] ?? null;
    const waveDirectionDeg =
      (marineData.hourly.wave_direction as Float32Array | number[])?.[i] ?? null;

    // Convert units
    const waveHeightFt = metersToFeet(waveHeightM);

    console.log("\n=== SAMPLE FORECAST DATA (First Hour) ===");
    console.log(`Timestamp: ${forecastTimestamp.toISOString()}`);
    console.log(`\nWave Data:`);
    console.log(`  Height: ${waveHeightFt?.toFixed(1) ?? "null"}ft (${waveHeightM ?? "null"}m)`);
    console.log(`  Period: ${wavePeriodS ?? "null"}s`);
    console.log(`  Direction: ${waveDirectionDeg ?? "null"}°`);
    console.log(`\nNote: Open-Meteo Marine API only provides combined wave data.`);
    console.log(`Secondary swell, wind waves, and wind data are not available and set to null.`);

    console.log("\n=== END SAMPLE DATA ===\n");
  } catch (error) {
    console.error("[Smoke Test] Error:", error);
    throw error;
  }
}

// Allow running this file directly for testing
// Check if this is the main module by checking if import.meta.url matches the script file
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule || process.argv[1]?.includes('importOpenMeteoMarine')) {
  smokeTestLido()
    .then(() => {
      console.log("[Smoke Test] Completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("[Smoke Test] Failed:", error);
      process.exit(1);
    });
}
