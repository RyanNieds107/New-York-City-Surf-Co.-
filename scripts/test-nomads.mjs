#!/usr/bin/env node
/**
 * Test script for NOMADS JSON endpoint
 * 
 * Usage: pnpm exec tsx scripts/test-nomads.mjs
 * Or: node --loader tsx scripts/test-nomads.mjs
 */

import axios from "axios";

// Helper functions (simplified versions for testing)
function getLatestWw3ModelRunTime() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  let runHour = 0;
  if (utcHour >= 18) {
    runHour = 18;
  } else if (utcHour >= 12) {
    runHour = 12;
  } else if (utcHour >= 6) {
    runHour = 6;
  } else {
    runHour = 18;
    now.setUTCDate(now.getUTCDate() - 1);
  }
  
  const modelRunTime = new Date(now);
  modelRunTime.setUTCHours(runHour, 0, 0, 0);
  return modelRunTime;
}

async function checkNomadsJsonEndpoint() {
  try {
    const testUrl = "https://nomads.ncep.noaa.gov/dods/wave/multi_1/glo_30m";
    const response = await axios.get(testUrl, {
      timeout: 10000,
      validateStatus: (status) => status < 500,
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

async function testNomadsJson() {
  console.log("=".repeat(60));
  console.log("NOMADS JSON Endpoint Test");
  console.log("=".repeat(60));
  console.log();

  // Test 1: Check if JSON endpoint is available
  console.log("Test 1: Checking if NOMADS JSON endpoint is available...");
  try {
    const isAvailable = await checkNomadsJsonEndpoint();
    console.log(`✓ Endpoint check completed`);
    console.log(`  Result: ${isAvailable ? "✅ AVAILABLE" : "❌ NOT AVAILABLE"}`);
    console.log();
  } catch (error) {
    console.error("✗ Endpoint check failed:", error.message);
    console.log();
  }

  // Test 2: Get latest model run time
  console.log("Test 2: Getting latest WW3 model run time...");
  try {
    const modelRunTime = getLatestWw3ModelRunTime();
    console.log(`✓ Model run time determined`);
    console.log(`  Latest run: ${modelRunTime.toISOString()}`);
    console.log(`  UTC Hour: ${modelRunTime.getUTCHours()}:00`);
    console.log();
  } catch (error) {
    console.error("✗ Model run time failed:", error.message);
    console.log();
  }

  // Test 3: Try to fetch actual forecast data (Lido Beach coordinates)
  console.log("Test 3: Attempting to fetch WW3 forecast data...");
  console.log("  Location: Lido Beach (40.588°N, 73.626°W)");
  console.log("  Forecast hours: 0-120 (40 data points)");
  console.log();
  
  const lat = 40.588;
  const lon = -73.626;
  const modelRunTime = getLatestWw3ModelRunTime();
  const maxHoursOut = 120;

  try {
    console.log("  Fetching from JSON endpoint...");
    
    // Try OPeNDAP DODS endpoint
    const runHour = modelRunTime.getUTCHours();
    const runDateStr = modelRunTime.toISOString().split("T")[0].replace(/-/g, "");
    const runId = String(runHour).padStart(2, "0") + "z";
    const baseUrl = `https://nomads.ncep.noaa.gov/dods/wave/multi_1/glo_30m${runDateStr}/glo_30m${runId}`;
    
    console.log(`  Testing URL: ${baseUrl}`);
    
    // First, try to access the base URL to see what we get
    const baseResponse = await axios.get(baseUrl, {
      timeout: 30000,
      validateStatus: () => true,
    });
    
    console.log(`  Base URL Status: ${baseResponse.status}`);
    console.log(`  Content-Type: ${baseResponse.headers['content-type']}`);
    
    if (baseResponse.status !== 200) {
      throw new Error(`Base URL returned status ${baseResponse.status}`);
    }
    
    // Try DAP4 JSON query
    const numSteps = Math.floor(maxHoursOut / 3) + 1;
    const queryUrl = `${baseUrl}.dap4.json?htsgw[0:${numSteps - 1}][0][0],perpw[0:${numSteps - 1}][0][0],dirpw[0:${numSteps - 1}][0][0]`;
    
    console.log(`  Query URL: ${queryUrl.substring(0, 100)}...`);
    
    const response = await axios.get(queryUrl, {
      timeout: 30000,
      headers: { Accept: "application/json" },
      validateStatus: () => true,
    });
    
    console.log(`  Query Status: ${response.status}`);
    console.log(`  Content-Type: ${response.headers['content-type']}`);
    
    if (response.status === 200 && response.data) {
      console.log();
      console.log("✅ SUCCESS! Received JSON response");
      console.log();
      console.log("Response structure:");
      console.log(JSON.stringify(response.data, null, 2).substring(0, 1000));
      console.log();
      console.log("=".repeat(60));
      console.log("✅ JSON ENDPOINT WORKS! Can parse this data.");
      console.log("=".repeat(60));
    } else {
      throw new Error(`Query returned status ${response.status}`);
    }
    
  } catch (error) {
    console.error("❌ FAILED to fetch forecast data");
    console.error(`  Error: ${error.message}`);
    console.log();
    console.log("=".repeat(60));
    console.log("❌ JSON ENDPOINT FAILED - Need to implement GRIB2 parser (Phase 3)");
    console.log("=".repeat(60));
    console.log();
    console.log("Error details:");
    if (error.response) {
      console.log(`  HTTP Status: ${error.response.status}`);
      console.log(`  Response headers:`, JSON.stringify(error.response.headers, null, 2));
      if (error.response.data) {
        console.log(`  Response data (first 500 chars):`);
        const dataStr = typeof error.response.data === 'string' 
          ? error.response.data 
          : JSON.stringify(error.response.data);
        console.log(`    ${dataStr.substring(0, 500)}...`);
      }
    } else if (error.request) {
      console.log(`  Request made but no response received`);
      console.log(`  URL: ${error.config?.url ?? "unknown"}`);
    } else {
      console.log(`  Error: ${error.message}`);
      if (error.stack) {
        console.log(`  Stack: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
      }
    }
  }
}

// Run the test
testNomadsJson().catch(console.error);

