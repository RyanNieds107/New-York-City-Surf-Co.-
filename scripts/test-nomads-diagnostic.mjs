#!/usr/bin/env node
/**
 * Diagnostic script to identify NOMADS test issues
 * 
 * Usage: pnpm exec tsx scripts/test-nomads-diagnostic.mjs
 */

import "dotenv/config";

console.log("=".repeat(60));
console.log("NOMADS Diagnostic Test");
console.log("=".repeat(60));
console.log();

// Step 1: Check environment variables
console.log("Step 1: Checking environment variables...");
if (process.env.DATABASE_URL) {
  console.log("✓ DATABASE_URL is set");
  // Mask password in output
  const masked = process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@");
  console.log(`  Value: ${masked.substring(0, 50)}...`);
} else {
  console.error("✗ DATABASE_URL is NOT set");
  console.error("  Please add DATABASE_URL to your .env file");
  process.exit(1);
}
console.log();

// Step 2: Test database connection
console.log("Step 2: Testing database connection...");
try {
  const { getAllSpots } = await import("../server/db.ts");
  const spots = await getAllSpots();
  console.log(`✓ Database connection successful`);
  console.log(`  Found ${spots.length} spots in database`);
  if (spots.length === 0) {
    console.error("  ⚠ No spots found! Run: pnpm exec node scripts/seed-spots.mjs");
  } else {
    console.log("  Spots:");
    spots.forEach(spot => {
      console.log(`    - ${spot.name} (ID: ${spot.id})`);
    });
  }
} catch (error) {
  console.error("✗ Database connection failed");
  console.error(`  Error: ${error.message}`);
  if (error.stack) {
    console.error(`  Stack: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
  }
  process.exit(1);
}
console.log();

// Step 3: Test NOMADS endpoint availability
console.log("Step 3: Testing NOMADS endpoint availability...");
try {
  const axios = (await import("axios")).default;
  const testUrl = "https://nomads.ncep.noaa.gov/dods/wave/multi_1/glo_30m";
  console.log(`  Testing: ${testUrl}`);
  
  const response = await axios.get(testUrl, {
    timeout: 10000,
    validateStatus: () => true,
  });
  
  if (response.status === 200) {
    console.log(`✓ NOMADS endpoint is accessible (status: ${response.status})`);
  } else {
    console.warn(`⚠ NOMADS endpoint returned status: ${response.status}`);
  }
} catch (error) {
  console.error("✗ NOMADS endpoint test failed");
  console.error(`  Error: ${error.message}`);
  if (error.code === "ENOTFOUND" || error.code === "ETIMEDOUT") {
    console.error("  ⚠ Network issue - check your internet connection");
  }
}
console.log();

// Step 4: Test NOMADS service imports
console.log("Step 4: Testing NOMADS service imports...");
try {
  const nomads = await import("../server/services/nomads.ts");
  console.log("✓ NOMADS service imported successfully");
  console.log("  Available functions:");
  console.log(`    - fetchWw3ForecastForSpot: ${typeof nomads.fetchWw3ForecastForSpot}`);
  console.log(`    - convertToDbFormat: ${typeof nomads.convertToDbFormat}`);
  console.log(`    - getLatestWw3ModelRunTime: ${typeof nomads.getLatestWw3ModelRunTime}`);
} catch (error) {
  console.error("✗ Failed to import NOMADS service");
  console.error(`  Error: ${error.message}`);
  if (error.stack) {
    console.error(`  Stack: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
  }
  process.exit(1);
}
console.log();

// Step 5: Test getting model run time
console.log("Step 5: Testing model run time calculation...");
try {
  const { getLatestWw3ModelRunTime } = await import("../server/services/nomads.ts");
  const modelRunTime = getLatestWw3ModelRunTime();
  console.log(`✓ Model run time calculated`);
  console.log(`  Latest run: ${modelRunTime.toISOString()}`);
  console.log(`  UTC Hour: ${modelRunTime.getUTCHours()}:00`);
} catch (error) {
  console.error("✗ Model run time calculation failed");
  console.error(`  Error: ${error.message}`);
}
console.log();

// Step 6: Test fetching forecast (if we have a spot)
console.log("Step 6: Testing forecast fetch (if spot available)...");
try {
  const { getAllSpots } = await import("../server/db.ts");
  const { fetchWw3ForecastForSpot } = await import("../server/services/nomads.ts");
  
  const spots = await getAllSpots();
  if (spots.length === 0) {
    console.log("  ⚠ Skipping - no spots in database");
  } else {
    const testSpot = spots.find(s => s.name === "Lido Beach") || spots[0];
    console.log(`  Testing with: ${testSpot.name}`);
    console.log(`  Coordinates: ${testSpot.latitude}, ${testSpot.longitude}`);
    
    console.log("  Fetching forecast (this may take 30-60 seconds)...");
    const forecastPoints = await fetchWw3ForecastForSpot(testSpot, undefined, 24); // Just 24 hours for test
    
    console.log(`✓ Forecast fetch successful!`);
    console.log(`  Received ${forecastPoints.length} forecast points`);
    if (forecastPoints.length > 0) {
      const first = forecastPoints[0];
      console.log(`  First point:`);
      console.log(`    Time: ${first.forecastTimestamp.toISOString()}`);
      console.log(`    Wave Height: ${first.waveHeightFt?.toFixed(2) ?? "N/A"} ft`);
      console.log(`    Wave Period: ${first.wavePeriodSec?.toFixed(1) ?? "N/A"} sec`);
    }
  }
} catch (error) {
  console.error("✗ Forecast fetch failed");
  console.error(`  Error: ${error.message}`);
  if (error.response) {
    console.error(`  HTTP Status: ${error.response.status}`);
    console.error(`  URL: ${error.config?.url?.substring(0, 100) ?? "unknown"}`);
  }
  if (error.stack) {
    console.error(`  Stack: ${error.stack.split('\n').slice(0, 10).join('\n')}`);
  }
}
console.log();

console.log("=".repeat(60));
console.log("Diagnostic complete!");
console.log("=".repeat(60));

