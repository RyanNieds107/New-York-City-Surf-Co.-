/**
 * Validation Test Suite for Surf Forecasting Algorithm
 * 
 * Tests the Day 1 MVP forecasting algorithm against 15 historical swell events
 * from 2020-2025 to evaluate accuracy and identify tuning opportunities.
 */

import { HISTORICAL_SWELLS } from './historicalSwells';
import { generateForecastOutput } from '../server/utils/forecastOutput';
import type { ForecastPoint } from '../drizzle/schema';

interface ValidationResult {
  date: string;
  name: string;
  actual_rating: string;
  predicted_rating: string;
  predicted_score: number;
  breaking_wave_height: string;
  match: 'EXACT' | 'CLOSE' | 'MISS';
  score_diff: number;
  notes: string;
}

/**
 * Convert historical text ratings to approximate numeric scores
 * 
 * Historical ratings: Poor, Fair, Good, Very Good, Excellent, Epic
 * Algorithm outputs: Flat, Don't Bother, Worth a Look, Actually Fun, Clear the Calendar, All-Time
 * 
 * We map historical ratings to approximate score ranges:
 */
function ratingToScore(rating: string): number {
  const map: Record<string, number> = {
    'Poor': 15,
    'Fair': 50,
    'Good': 68,
    'Very Good': 80,
    'Excellent': 87,
    'Epic': 93,
  };
  return map[rating] || 50;
}

/**
 * Determine if prediction matches actual within acceptable tolerance
 */
function evaluateMatch(actualScore: number, predictedScore: number): 'EXACT' | 'CLOSE' | 'MISS' {
  const diff = Math.abs(actualScore - predictedScore);
  if (diff <= 10) return 'EXACT'; // Within 10 points
  if (diff <= 25) return 'CLOSE'; // Within 25 points
  return 'MISS'; // Off by more than 25 points
}

/**
 * Convert HistoricalSwell to ForecastPoint format
 * 
 * Note: ForecastPoint stores waveHeightFt as integer*10, so we multiply by 10
 */
function convertToForecastPoint(swell: typeof HISTORICAL_SWELLS[0]): ForecastPoint {
  // Create timestamp from date string (use 10:00 AM local time)
  const date = new Date(`${swell.date}T10:00:00-05:00`);
  const modelRunTime = new Date(date);
  modelRunTime.setHours(0, 0, 0, 0); // Set to midnight for model run time

  return {
    id: 0, // Not used for validation
    spotId: 0, // Not used - we pass spot_id string to generateForecastOutput
    forecastTimestamp: date,
    modelRunTime: modelRunTime,
    hoursOut: 0, // Not used for validation
    // Convert decimal feet to integer*10 format
    waveHeightFt: Math.round(swell.swell_height_ft * 10),
    wavePeriodSec: Math.round(swell.swell_period_s),
    waveDirectionDeg: swell.swell_direction_deg,
    windSpeedKts: swell.wind_speed_kt !== null ? Math.round(swell.wind_speed_kt) : null,
    windDirectionDeg: swell.wind_direction_deg !== null ? Math.round(swell.wind_direction_deg) : null,
    source: 'ww3' as const,
    createdAt: new Date(),
  };
}

console.log('='.repeat(100));
console.log('SURF FORECASTING ALGORITHM VALIDATION');
console.log('Testing against 15 historical swell events (2020-2025)');
console.log('='.repeat(100));
console.log('');

const results: ValidationResult[] = [];

HISTORICAL_SWELLS.forEach((swell) => {
  try {
    // Convert historical data to ForecastPoint format
    const forecastPoint = convertToForecastPoint(swell);

    // Generate forecast output using the algorithm
    const output = generateForecastOutput(forecastPoint, swell.spot_id, swell.tide_ft);

    // Compare predicted vs actual
    const actualScore = ratingToScore(swell.actual_rating);
    const scoreDiff = output.quality_score - actualScore;
    const match = evaluateMatch(actualScore, output.quality_score);

    const result: ValidationResult = {
      date: swell.date,
      name: swell.name,
      actual_rating: swell.actual_rating,
      predicted_rating: output.quality_rating,
      predicted_score: output.quality_score,
      breaking_wave_height: output.breaking_wave_height,
      match,
      score_diff: scoreDiff,
      notes: swell.notes,
    };

    results.push(result);

    // Print individual result
    const matchSymbol = match === 'EXACT' ? '✅' : match === 'CLOSE' ? '⚠️' : '❌';
    console.log(`${matchSymbol} ${swell.date} | ${swell.name}`);
    console.log(
      `   Actual: ${swell.actual_rating.toUpperCase()} | Predicted: ${output.quality_rating} (${output.quality_score})`
    );
    console.log(`   Breaking Waves: ${output.breaking_wave_height}`);
    console.log(
      `   Raw: ${swell.swell_height_ft}ft @ ${swell.swell_period_s}s from ${swell.swell_direction_deg}°`
    );
    console.log(
      `   Breakdown: Swell:${output.breakdown.swell_quality} Dir:${output.breakdown.direction} Tide:${output.breakdown.tide} Wind:${output.breakdown.wind >= 0 ? '+' : ''}${output.breakdown.wind}`
    );
    console.log(`   Reason: ${output.reason}`);
    console.log(`   Notes: ${swell.notes}`);
    console.log('');
  } catch (error) {
    console.error(`❌ Error processing ${swell.date} | ${swell.name}:`, error);
    console.log('');
  }
});

// Summary statistics
console.log('='.repeat(100));
console.log('VALIDATION SUMMARY');
console.log('='.repeat(100));

const exactMatches = results.filter((r) => r.match === 'EXACT').length;
const closeMatches = results.filter((r) => r.match === 'CLOSE').length;
const misses = results.filter((r) => r.match === 'MISS').length;

console.log(`Total Tests: ${results.length}`);
console.log(
  `✅ Exact Matches (within 10 points): ${exactMatches} (${Math.round((exactMatches / results.length) * 100)}%)`
);
console.log(
  `⚠️  Close Matches (within 25 points): ${closeMatches} (${Math.round((closeMatches / results.length) * 100)}%)`
);
console.log(
  `❌ Misses (off by 25+ points): ${misses} (${Math.round((misses / results.length) * 100)}%)`
);
console.log('');

// Show biggest misses
const biggestMisses = results
  .filter((r) => r.match === 'MISS')
  .sort((a, b) => Math.abs(b.score_diff) - Math.abs(a.score_diff))
  .slice(0, 5);

if (biggestMisses.length > 0) {
  console.log('BIGGEST MISSES (tune these):');
  biggestMisses.forEach((r) => {
    const direction = r.score_diff > 0 ? 'OVERRATED' : 'UNDERRATED';
    console.log(`  ${direction}: ${r.name} (${r.date})`);
    console.log(`    Expected: ${r.actual_rating} | Got: ${r.predicted_rating} (${r.predicted_score})`);
    console.log(`    Off by: ${Math.abs(r.score_diff)} points`);
  });
  console.log('');
}

// Average score difference
const avgDiff = results.reduce((sum, r) => sum + Math.abs(r.score_diff), 0) / results.length;
console.log(`Average Score Difference: ${avgDiff.toFixed(1)} points`);
console.log('');

// Tuning recommendations
console.log('TUNING RECOMMENDATIONS:');
if (avgDiff > 20) {
  console.log('  ⚠️  Algorithm needs significant tuning');
} else if (avgDiff > 10) {
  console.log('  ⚙️  Algorithm needs minor adjustments');
} else {
  console.log('  ✅ Algorithm is well-calibrated');
}

// Pattern analysis
console.log('');
console.log('PATTERN ANALYSIS:');

// Check for overrated/underrated patterns
const overrated = results.filter((r) => r.score_diff > 25);
const underrated = results.filter((r) => r.score_diff < -25);

if (overrated.length > 0) {
  console.log(`  ⚠️  Overrated ${overrated.length} swells (predicted too high):`);
  overrated.forEach((r) => {
    console.log(`    - ${r.name} (${r.date}): Expected ${r.actual_rating}, got ${r.predicted_rating}`);
  });
}

if (underrated.length > 0) {
  console.log(`  ⚠️  Underrated ${underrated.length} swells (predicted too low):`);
  underrated.forEach((r) => {
    console.log(`    - ${r.name} (${r.date}): Expected ${r.actual_rating}, got ${r.predicted_rating}`);
  });
}

console.log('');
console.log('INTERPRETATION GUIDELINES:');
console.log('  - If underrating long-period swells (14s+): increase period_multiplier for 14s+');
console.log('  - If overrating east swells (90-110°): reduce direction score tolerance or add penalty');
console.log('  - If underrating excellent days: increase amplification_factor for Lido');
console.log('  - If overrating marginal days: make clamps more aggressive');
console.log('  - If east swells not breaking as big: adjust direction factor or amplification');
console.log('  - If short period swells scoring too high: lower energy buckets');
console.log('  - If tide effect not captured: refine tide scoring ranges');

