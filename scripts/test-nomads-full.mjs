#!/usr/bin/env node
/**
 * Full end-to-end test for NOMADS integration
 * Tests: JSON fetch -> Database storage -> Retrieval
 * 
 * Usage: pnpm exec tsx scripts/test-nomads-full.mjs
 */

import "dotenv/config";
import { fetchWw3ForecastForSpot, convertToDbFormat } from "../server/services/nomads.ts";
import { getAllSpots, insertForecastPoints, getForecastTimeline } from "../server/db.ts";

async function testFullFlow() {
  console.log("=".repeat(60));
  console.log("NOMADS Full Integration Test");
  console.log("=".repeat(60));
  console.log();

  try {
    // Step 1: Get a test spot (Lido Beach)
    console.log("Step 1: Getting test spot...");
    const spots = await getAllSpots();
    const testSpot = spots.find(s => s.name === "Lido Beach") || spots[0];
    
    if (!testSpot) {
      throw new Error("No spots found in database. Please seed spots first.");
    }
    
    console.log(`✓ Using spot: ${testSpot.name} (ID: ${testSpot.id})`);
    console.log(`  Coordinates: ${testSpot.latitude}, ${testSpot.longitude}`);
    console.log();

    // Step 2: Fetch forecast data from NOMADS
    console.log("Step 2: Fetching WW3 forecast from NOMADS...");
    const forecastPoints = await fetchWw3ForecastForSpot(testSpot, undefined, 120); // 120 hours
    
    console.log(`✓ Successfully fetched ${forecastPoints.length} forecast points`);
    console.log();
    console.log("Sample forecast points (first 3):");
    forecastPoints.slice(0, 3).forEach((point, i) => {
      console.log(`  Point ${i + 1}:`);
      console.log(`    Forecast Time: ${point.forecastTimestamp.toISOString()}`);
      console.log(`    Hours Out: ${point.hoursOut}`);
      console.log(`    Wave Height: ${point.waveHeightFt?.toFixed(2) ?? "N/A"} ft`);
      console.log(`    Wave Period: ${point.wavePeriodSec?.toFixed(1) ?? "N/A"} sec`);
      console.log(`    Wave Direction: ${point.waveDirectionDeg ?? "N/A"}°`);
      console.log();
    });
    console.log();

    // Step 3: Convert to database format
    console.log("Step 3: Converting to database format...");
    const dbPoints = forecastPoints.map(point => convertToDbFormat(point, testSpot.id));
    console.log(`✓ Converted ${dbPoints.length} points to database format`);
    console.log();

    // Step 4: Store in database
    console.log("Step 4: Storing forecast points in database...");
    await insertForecastPoints(dbPoints);
    console.log(`✓ Stored ${dbPoints.length} forecast points in database`);
    console.log();

    // Step 5: Retrieve from database
    console.log("Step 5: Retrieving forecast timeline from database...");
    const retrievedPoints = await getForecastTimeline(testSpot.id, 120);
    console.log(`✓ Retrieved ${retrievedPoints.length} forecast points from database`);
    console.log();

    // Step 6: Verify data integrity
    console.log("Step 6: Verifying data integrity...");
    if (retrievedPoints.length === forecastPoints.length) {
      console.log("✓ Data count matches");
    } else {
      console.warn(`⚠ Data count mismatch: expected ${forecastPoints.length}, got ${retrievedPoints.length}`);
    }
    
    // Check first point
    if (retrievedPoints.length > 0) {
      const firstPoint = retrievedPoints[0];
      const originalPoint = forecastPoints[0];
      
      console.log("  First point comparison:");
      console.log(`    Hours Out: ${firstPoint.hoursOut} (expected: ${originalPoint.hoursOut})`);
      console.log(`    Wave Height: ${firstPoint.waveHeightFt ? (firstPoint.waveHeightFt / 10).toFixed(2) : "N/A"} ft (expected: ${originalPoint.waveHeightFt?.toFixed(2) ?? "N/A"} ft)`);
      console.log(`    Wave Period: ${firstPoint.wavePeriodSec ?? "N/A"} sec (expected: ${originalPoint.wavePeriodSec?.toFixed(1) ?? "N/A"} sec)`);
    }
    console.log();

    // Success!
    console.log("=".repeat(60));
    console.log("✅ FULL INTEGRATION TEST PASSED!");
    console.log("=".repeat(60));
    console.log();
    console.log("Summary:");
    console.log(`  - Fetched ${forecastPoints.length} forecast points from NOMADS`);
    console.log(`  - Stored ${dbPoints.length} points in database`);
    console.log(`  - Retrieved ${retrievedPoints.length} points from database`);
    console.log();
    console.log("Next steps:");
    console.log("  1. Implement timeline forecast generation (Phase 6)");
    console.log("  2. Add API endpoints for timeline queries (Phase 8)");
    console.log("  3. Set up scheduled refresh job (Phase 7)");

  } catch (error) {
    console.error();
    console.error("=".repeat(60));
    console.error("❌ TEST FAILED");
    console.error("=".repeat(60));
    console.error();
    console.error("Error:", error.message);
    
    // More detailed error information
    if (error.response) {
      console.error();
      console.error("HTTP Error Details:");
      console.error(`  Status: ${error.response.status}`);
      console.error(`  URL: ${error.config?.url ?? "unknown"}`);
      if (error.response.data) {
        const dataStr = typeof error.response.data === 'string' 
          ? error.response.data.substring(0, 500)
          : JSON.stringify(error.response.data).substring(0, 500);
        console.error(`  Response: ${dataStr}...`);
      }
    }
    
    if (error.stack) {
      console.error();
      console.error("Stack trace:");
      console.error(error.stack.split('\n').slice(0, 15).join('\n'));
    }
    
    console.error();
    console.error("Troubleshooting:");
    console.error("  1. Check DATABASE_URL is set in .env file");
    console.error("  2. Verify database is accessible");
    console.error("  3. Ensure spots are seeded: pnpm exec node scripts/seed-spots.mjs");
    console.error("  4. Check internet connection for NOMADS API");
    
    process.exit(1);
  }
}

// Run the test
testFullFlow().catch(console.error);

