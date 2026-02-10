/**
 * Stormglass Verification Fetch Job
 *
 * Fetches ECMWF wave data from Stormglass API for forecast verification.
 * Runs twice daily (7 AM + 7 PM ET) to stay within free tier quota (10 requests/day).
 *
 * With 3 spots × 2 syncs = 6 requests per day, leaving 4 spare for manual fetches.
 */

import { getAllSpots, insertStormglassVerificationBatch, getLatestStormglassFetchTime } from "../db";
import { fetchStormglassForSpot, type StormglassForecastPoint } from "../clients/stormglass";
import type { InsertStormglassVerification } from "../../drizzle/schema";

/**
 * Minimum hours between fetches for a single spot.
 * Set to 10 hours to allow twice-daily fetching (7 AM + 7 PM = 12h apart).
 */
const MIN_HOURS_BETWEEN_FETCHES = 10;

/**
 * Hours of forecast data to fetch.
 * Fetch 7 days (168 hours) to match Open-Meteo coverage.
 * One API call returns all hours - no extra cost!
 */
const HOURS_AHEAD = 168;

/**
 * Spots excluded from Stormglass fetch (Coming Soon / no active forecasts).
 * Must match admin comparison page so we stay within 10 calls/day (3 spots × 2 syncs = 6).
 */
const EXCLUDED_SPOT_NAMES = ["Belmar", "Gilgo Beach", "Montauk"];

/**
 * Main job function - fetches Stormglass ECMWF data for active spots only.
 */
export async function fetchStormglassVerification(): Promise<void> {
  console.log("[Stormglass Verification] Starting daily fetch job...");

  const allSpots = await getAllSpots();
  const spots = allSpots.filter((s) => !EXCLUDED_SPOT_NAMES.includes(s.name));
  const now = new Date();

  let fetchedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const spot of spots) {
    try {
      // Check if we've already fetched recently for this spot
      const lastFetch = await getLatestStormglassFetchTime(spot.id);

      if (lastFetch) {
        const hoursSinceLastFetch = (now.getTime() - lastFetch.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastFetch < MIN_HOURS_BETWEEN_FETCHES) {
          console.log(`[Stormglass Verification] Skipping ${spot.name} - fetched ${hoursSinceLastFetch.toFixed(1)}h ago`);
          skippedCount++;
          continue;
        }
      }

      // Fetch from Stormglass API (7 days = 168 hours)
      console.log(`[Stormglass Verification] Fetching for ${spot.name}...`);
      const forecastPoints = await fetchStormglassForSpot(spot, { hoursAhead: HOURS_AHEAD });

      if (forecastPoints.length === 0) {
        console.warn(`[Stormglass Verification] No data received for ${spot.name}`);
        continue;
      }

      // Convert to database format
      const dbRecords: InsertStormglassVerification[] = forecastPoints.map((point) => ({
        spotId: spot.id,
        forecastTimestamp: point.forecastTimestamp,
        waveHeightFt: point.waveHeightFt !== null ? point.waveHeightFt.toFixed(1) : null,
        swellHeightFt: point.swellHeightFt !== null ? point.swellHeightFt.toFixed(1) : null,
        swellPeriodS: point.swellPeriodS !== null ? Math.round(point.swellPeriodS) : null,
        swellDirectionDeg: point.swellDirectionDeg !== null ? Math.round(point.swellDirectionDeg) : null,
        source: point.source,
      }));

      // Insert into database
      await insertStormglassVerificationBatch(dbRecords);

      console.log(`[Stormglass Verification] Stored ${dbRecords.length} points for ${spot.name}`);
      fetchedCount++;

      // Small delay between spots to be nice to the API
      await new Promise((resolve) => setTimeout(resolve, 1000));

    } catch (error: any) {
      errorCount++;
      console.error(`[Stormglass Verification] Error fetching for ${spot.name}:`, error.message);

      // If quota exceeded, stop fetching more spots
      if (error.message?.includes("quota exceeded")) {
        console.error("[Stormglass Verification] Daily quota exceeded - stopping job");
        break;
      }
    }
  }

  console.log(`[Stormglass Verification] Job completed: ${fetchedCount} fetched, ${skippedCount} skipped, ${errorCount} errors`);
}
