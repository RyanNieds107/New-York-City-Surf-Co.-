/**
 * Test Script for Day 1 MVP Forecasting System
 * 
 * Generates sample forecast data and tests breaking wave height
 * and quality rating calculations.
 */

import type { ForecastPoint } from '../drizzle/schema';
import { generateForecastOutput } from '../server/utils/forecastOutput';

/**
 * Create sample forecast point data
 */
function createSampleForecastPoint(
  hoursFromNow: number,
  swellHeightFt: number,
  periodS: number,
  swellDirectionDeg: number | null,
  windSpeedKts: number | null,
  windDirectionDeg: number | null
): ForecastPoint {
  const now = new Date();
  const forecastTime = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000);
  const modelRunTime = new Date(now);
  modelRunTime.setHours(0, 0, 0, 0); // Set to midnight

  return {
    id: hoursFromNow,
    spotId: 1, // Will be mapped to 'lido'
    forecastTimestamp: forecastTime,
    modelRunTime: modelRunTime,
    hoursOut: hoursFromNow,
    // Store as integer*10 (multiply by 10)
    waveHeightFt: Math.round(swellHeightFt * 10),
    wavePeriodSec: periodS,
    waveDirectionDeg: swellDirectionDeg,
    windSpeedKts: windSpeedKts,
    windDirectionDeg: windDirectionDeg,
    source: 'ww3' as const,
    createdAt: now,
  };
}

/**
 * Format time for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format wind for display
 */
function formatWind(
  windSpeedKt: number | null,
  windDirectionDeg: number | null
): string {
  if (windSpeedKt === null || windDirectionDeg === null) {
    return 'N/A';
  }

  // Long Island south shore faces ~180° (south)
  // Normalize wind direction to 0-360
  const normalized = ((windDirectionDeg % 360) + 360) % 360;
  
  // Determine wind type
  const isOffshore = normalized >= 315 || normalized <= 45; // N, NW, NE
  const isOnshore = normalized >= 135 && normalized <= 225; // S, SE, SW
  
  let windType = 'cross';
  if (isOffshore) {
    windType = 'offshore';
  } else if (isOnshore) {
    windType = 'onshore';
  }

  return `${windSpeedKt}kt ${windType}`;
}

/**
 * Format breakdown for display
 */
function formatBreakdown(breakdown: {
  swell_quality: number;
  direction: number;
  tide: number;
  wind: number;
}): string {
  return `Swell:${breakdown.swell_quality} Dir:${breakdown.direction} Tide:${breakdown.tide} Wind:${breakdown.wind >= 0 ? '+' : ''}${breakdown.wind}`;
}

/**
 * Main test function
 */
function main() {
  console.log('=== LIDO BEACH - 24 HOUR FORECAST ===\n');

  // Sample forecast points (mix of good/bad conditions)
  const samplePoints: Array<{
    point: ForecastPoint;
    tideFt: number;
  }> = [
    // Poor conditions - junk period, onshore
    {
      point: createSampleForecastPoint(0, 1.9, 3, 120, 15, 280), // onshore
      tideFt: 5.4,
    },
    // Fair conditions - decent size, tide good, wind marginal
    {
      point: createSampleForecastPoint(1, 2.5, 6, 125, 8, 260), // cross
      tideFt: 4.8,
    },
    // Good conditions - good period, offshore
    {
      point: createSampleForecastPoint(2, 2.8, 9, 120, 12, 90), // offshore
      tideFt: 4.2,
    },
    // Epic conditions - pumping swell, clean offshore
    {
      point: createSampleForecastPoint(3, 3.5, 11, 120, 10, 85), // offshore
      tideFt: 3.8,
    },
    // Big but poor - large swell but onshore winds
    {
      point: createSampleForecastPoint(4, 4.0, 10, 135, 18, 285), // onshore
      tideFt: 3.5,
    },
    // Small but good - small swell but clean conditions
    {
      point: createSampleForecastPoint(5, 1.8, 8, 115, 8, 88), // offshore
      tideFt: 4.0,
    },
    // Marginal - right on the edge
    {
      point: createSampleForecastPoint(6, 2.0, 7, 140, 6, 95), // light offshore
      tideFt: 4.5,
    },
  ];

  // Generate and display forecasts
  for (const { point, tideFt } of samplePoints) {
    try {
      const output = generateForecastOutput(point, 'lido', tideFt);

      // Format output
      const time = formatTime(point.forecastTimestamp);
      const wind = formatWind(
        output.raw_data.wind_speed_kt,
        output.raw_data.wind_direction_deg
      );
      const breakdown = formatBreakdown(output.breakdown);
      const rawData = `${output.raw_data.swell_height_ft.toFixed(1)}ft @ ${output.raw_data.swell_period_s}s`;

      console.log(
        `${time} | ${output.breaking_wave_height} | ${output.quality_rating.toUpperCase()} | Tide: ${tideFt.toFixed(1)}ft | Wind: ${wind}`
      );
      console.log(
        `  Score: ${output.quality_score} (${breakdown}) | "${output.reason}"`
      );
      console.log(`  Raw: ${rawData}`);
      console.log('');
    } catch (error) {
      console.error(`Error processing forecast point:`, error);
    }
  }
}

// Run the test
try {
  main();
} catch (error) {
  console.error('Error running test:', error);
  process.exit(1);
}

export { main as testForecastV0 };

