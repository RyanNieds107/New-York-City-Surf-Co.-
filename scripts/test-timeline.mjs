#!/usr/bin/env node
/**
 * Test script for timeline forecast generation (Phase 6)
 * 
 * Usage: pnpm exec tsx scripts/test-timeline.mjs
 */

import "dotenv/config";
import { getAllSpots, getForecastTimeline } from "../server/db.ts";
import { generateForecastTimeline } from "../server/services/forecast.ts";
import { getAverageCrowdLevel } from "../server/db.ts";

async function testTimeline() {
  console.log("=".repeat(60));
  console.log("Timeline Forecast Generation Test (Phase 6)");
  console.log("=".repeat(60));
  console.log();

  try {
    // Step 1: Get a test spot
    console.log("Step 1: Getting test spot...");
    const spots = await getAllSpots();
    const testSpot = spots.find(s => s.name === "Lido Beach") || spots[0];
    
    if (!testSpot) {
      throw new Error("No spots found in database. Please seed spots first.");
    }
    
    console.log(`✓ Using spot: ${testSpot.name} (ID: ${testSpot.id})`);
    console.log();

    // Step 2: Get forecast points from database
    console.log("Step 2: Retrieving forecast points from database...");
    const forecastPoints = await getForecastTimeline(testSpot.id, 72); // 72 hours
    
    if (forecastPoints.length === 0) {
      throw new Error("No forecast points found in database. Run test-nomads-full.mjs first to fetch data.");
    }
    
    console.log(`✓ Found ${forecastPoints.length} forecast points`);
    console.log();

    // Step 3: Get crowd level
    console.log("Step 3: Getting average crowd level...");
    const avgCrowdLevel = await getAverageCrowdLevel(testSpot.id);
    console.log(`✓ Average crowd level: ${avgCrowdLevel ?? "N/A"}`);
    console.log();

    // Step 4: Generate timeline with quality scores
    console.log("Step 4: Generating forecast timeline with quality scores...");
    const timeline = await generateForecastTimeline({
      forecastPoints,
      spot: testSpot,
      tideStationId: testSpot.tideStationId,
      avgCrowdLevel,
    });
    
    console.log(`✓ Generated timeline with ${timeline.length} scored forecasts`);
    console.log();

    // Step 5: Display results
    console.log("Step 5: Sample timeline results (first 5 points):");
    console.log();
    
    timeline.slice(0, 5).forEach((result, i) => {
      console.log(`  Point ${i + 1}:`);
      console.log(`    Time: ${result.forecastTimestamp.toISOString()}`);
      console.log(`    Hours Out: ${result.hoursOut}`);
      console.log(`    Probability Score: ${result.probabilityScore}/100`);
      console.log(`    Confidence: ${result.confidenceBand}`);
      console.log(`    Wave Height: ${result.waveHeightFt?.toFixed(2) ?? "N/A"} ft`);
      console.log(`    Wave Period: ${result.wavePeriodSec?.toFixed(1) ?? "N/A"} sec`);
      console.log(`    Wave Direction: ${result.waveDirectionDeg ?? "N/A"}°`);
      console.log(`    Tide: ${result.tideHeightFt ? (result.tideHeightFt / 10).toFixed(1) : "N/A"} ft (${result.tidePhase ?? "N/A"})`);
      console.log(`    Intermediate: ${result.usabilityIntermediate}%`);
      console.log(`    Advanced: ${result.usabilityAdvanced}%`);
      console.log();
    });

    // Step 6: Show summary statistics
    console.log("Step 6: Timeline Summary:");
    const scores = timeline.map(t => t.probabilityScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const highConfidence = timeline.filter(t => t.confidenceBand === "High").length;
    const mediumConfidence = timeline.filter(t => t.confidenceBand === "Medium").length;
    const lowConfidence = timeline.filter(t => t.confidenceBand === "Low").length;
    
    console.log(`  Average Score: ${avgScore.toFixed(1)}/100`);
    console.log(`  Score Range: ${minScore} - ${maxScore}`);
    console.log(`  Confidence Distribution:`);
    console.log(`    High: ${highConfidence} points`);
    console.log(`    Medium: ${mediumConfidence} points`);
    console.log(`    Low: ${lowConfidence} points`);
    console.log();

    // Success!
    console.log("=".repeat(60));
    console.log("✅ TIMELINE GENERATION TEST PASSED!");
    console.log("=".repeat(60));
    console.log();
    console.log("Summary:");
    console.log(`  - Processed ${forecastPoints.length} forecast points`);
    console.log(`  - Generated ${timeline.length} scored forecasts`);
    console.log(`  - Average quality score: ${avgScore.toFixed(1)}/100`);
    console.log();
    console.log("Next steps:");
    console.log("  1. Add API endpoints for timeline queries (Phase 8)");
    console.log("  2. Set up scheduled refresh job (Phase 7)");

  } catch (error) {
    console.error();
    console.error("=".repeat(60));
    console.error("❌ TEST FAILED");
    console.error("=".repeat(60));
    console.error();
    console.error("Error:", error.message);
    if (error.stack) {
      console.error();
      console.error("Stack trace:");
      console.error(error.stack.split('\n').slice(0, 10).join('\n'));
    }
    process.exit(1);
  }
}

// Run the test
testTimeline().catch(console.error);

