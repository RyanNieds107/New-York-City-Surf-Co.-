#!/usr/bin/env node
/**
 * Test script for Open-Meteo Marine API integration
 * 
 * Usage: pnpm exec tsx scripts/test-openmeteo.mjs
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";
import { surfSpots } from "../drizzle/schema.js";
import { fetchOpenMeteoForecastForSpot, convertToDbFormat } from "../server/services/openMeteo.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

async function testOpenMeteo() {
  console.log("=".repeat(60));
  console.log("Open-Meteo Marine API Test");
  console.log("=".repeat(60));
  console.log();

  // Connect to database
  console.log("Step 1: Connecting to database...");
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  // Get Lido Beach spot
  console.log("Step 2: Fetching Lido Beach from database...");
  const spots = await db.select().from(surfSpots).where(eq(surfSpots.name, "Lido Beach")).limit(1);
  
  if (spots.length === 0) {
    console.error("❌ Lido Beach not found in database. Please seed spots first.");
    await connection.end();
    process.exit(1);
  }

  const spot = spots[0];
  console.log(`✓ Found spot: ${spot.name} (ID: ${spot.id})`);
  console.log(`  Coordinates: ${spot.latitude}, ${spot.longitude}`);
  console.log();

  // Fetch forecast from Open-Meteo
  console.log("Step 3: Fetching 72-hour forecast from Open-Meteo...");
  try {
    const forecastPoints = await fetchOpenMeteoForecastForSpot(spot, { maxHoursOut: 72 });
    
    console.log(`✓ Successfully fetched ${forecastPoints.length} forecast points`);
    console.log();

    // Show raw API response structure (first 3 points)
    console.log("=".repeat(60));
    console.log("Raw Forecast Points (first 3):");
    console.log("=".repeat(60));
    forecastPoints.slice(0, 3).forEach((point, idx) => {
      console.log(`\nPoint ${idx + 1}:`);
      console.log(`  Forecast Timestamp: ${point.forecastTimestamp.toISOString()}`);
      console.log(`  Model Run Time: ${point.modelRunTime.toISOString()}`);
      console.log(`  Hours Out: ${point.hoursOut}`);
      console.log(`  Wave Height (ft): ${point.waveHeightFt?.toFixed(2) ?? 'null'}`);
      console.log(`  Wave Period (sec): ${point.wavePeriodSec ?? 'null'}`);
      console.log(`  Wave Direction (deg): ${point.waveDirectionDeg ?? 'null'}`);
      console.log(`  Wind Speed (kts): ${point.windSpeedKts?.toFixed(2) ?? 'null'}`);
      console.log(`  Wind Direction (deg): ${point.windDirectionDeg ?? 'null'}`);
      console.log(`  Source: ${point.source}`);
    });
    console.log();

    // Show mapped database format (first 3 points)
    console.log("=".repeat(60));
    console.log("Mapped Database Format (first 3):");
    console.log("=".repeat(60));
    forecastPoints.slice(0, 3).forEach((point, idx) => {
      const dbPoint = convertToDbFormat(point, spot.id);
      console.log(`\nDB Point ${idx + 1}:`);
      console.log(`  spotId: ${dbPoint.spotId}`);
      console.log(`  forecastTimestamp: ${dbPoint.forecastTimestamp.toISOString()}`);
      console.log(`  modelRunTime: ${dbPoint.modelRunTime.toISOString()}`);
      console.log(`  hoursOut: ${dbPoint.hoursOut}`);
      console.log(`  waveHeightFt: ${dbPoint.waveHeightFt ?? 'null'} (tenths of feet)`);
      console.log(`  wavePeriodSec: ${dbPoint.wavePeriodSec ?? 'null'}`);
      console.log(`  waveDirectionDeg: ${dbPoint.waveDirectionDeg ?? 'null'}`);
      console.log(`  windSpeedKts: ${dbPoint.windSpeedKts ?? 'null'}`);
      console.log(`  windDirectionDeg: ${dbPoint.windDirectionDeg ?? 'null'}`);
      console.log(`  source: ${dbPoint.source}`);
    });
    console.log();

    // Show summary statistics
    console.log("=".repeat(60));
    console.log("Summary Statistics:");
    console.log("=".repeat(60));
    const validHeights = forecastPoints.filter(p => p.waveHeightFt !== null);
    const validPeriods = forecastPoints.filter(p => p.wavePeriodSec !== null);
    const validDirections = forecastPoints.filter(p => p.waveDirectionDeg !== null);
    const validWindSpeed = forecastPoints.filter(p => p.windSpeedKts !== null);
    const validWindDir = forecastPoints.filter(p => p.windDirectionDeg !== null);

    if (validHeights.length > 0) {
      const heights = validHeights.map(p => p.waveHeightFt).filter(h => h !== null);
      console.log(`Wave Height: min=${Math.min(...heights).toFixed(2)}ft, max=${Math.max(...heights).toFixed(2)}ft, avg=${(heights.reduce((a, b) => a + b, 0) / heights.length).toFixed(2)}ft`);
    }
    if (validPeriods.length > 0) {
      const periods = validPeriods.map(p => p.wavePeriodSec).filter(p => p !== null);
      console.log(`Wave Period: min=${Math.min(...periods).toFixed(1)}s, max=${Math.max(...periods).toFixed(1)}s, avg=${(periods.reduce((a, b) => a + b, 0) / periods.length).toFixed(1)}s`);
    }
    if (validWindSpeed.length > 0) {
      const speeds = validWindSpeed.map(p => p.windSpeedKts).filter(s => s !== null);
      console.log(`Wind Speed: min=${Math.min(...speeds).toFixed(1)}kts, max=${Math.max(...speeds).toFixed(1)}kts, avg=${(speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1)}kts`);
    }
    console.log();

    console.log("=".repeat(60));
    console.log("✅ TEST PASSED - Open-Meteo integration working!");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("❌ TEST FAILED");
    console.error(`Error: ${error.message}`);
    if (error.stack) {
      console.error(`Stack: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
    }
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Run the test
testOpenMeteo().catch(console.error);

