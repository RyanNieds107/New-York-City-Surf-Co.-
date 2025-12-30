import { describe, expect, it } from "vitest";
import { generateForecast } from "./services/forecast";
import type { SurfSpot, BuoyReading } from "../drizzle/schema";
import type { CurrentTideInfo } from "./services/tides";

describe("generateForecast", () => {
  const mockSpot: SurfSpot = {
    id: 1,
    name: "Test Beach",
    latitude: "40.5884",
    longitude: "-73.6579",
    buoyId: "44025",
    tideStationId: "8516601",
    bathymetryFactor: 6,
    idealSwellDirMin: 120,
    idealSwellDirMax: 200,
    createdAt: new Date(),
  };

  const mockBuoyReading: BuoyReading = {
    id: 1,
    buoyId: "44025",
    timestamp: new Date(),
    waveHeightCm: 150, // 1.5m = ~5ft
    dominantPeriodDs: 100, // 10 seconds
    swellDirectionDeg: 160, // Within ideal window
    windSpeedCmps: 300, // 3 m/s - light wind
    windDirectionDeg: 0, // Offshore (north)
    createdAt: new Date(),
  };

  const mockTideInfo: CurrentTideInfo = {
    currentHeightFt: 3.0, // Mid-tide
    nextTide: {
      time: new Date(Date.now() + 3 * 60 * 60 * 1000),
      heightFt: 5.0,
      type: "H",
    },
    tidePhase: "rising",
  };

  it("returns zero scores when no buoy data is available", () => {
    const result = generateForecast({
      spot: mockSpot,
      buoyReading: null,
      tideInfo: mockTideInfo,
      avgCrowdLevel: null,
    });

    expect(result.probabilityScore).toBe(0);
    expect(result.waveHeightTenthsFt).toBe(0);
    expect(result.confidenceBand).toBe("Low");
    expect(result.usabilityIntermediate).toBe(0);
    expect(result.usabilityAdvanced).toBe(0);
    expect(result.windSpeedMph).toBeNull();
    expect(result.windType).toBeNull();
    expect(result.tidePhase).toBeNull();
  });

  it("generates a positive forecast with good conditions", () => {
    const result = generateForecast({
      spot: mockSpot,
      buoyReading: mockBuoyReading,
      tideInfo: mockTideInfo,
      avgCrowdLevel: null,
    });

    expect(result.probabilityScore).toBeGreaterThan(50);
    expect(result.waveHeightTenthsFt).toBeGreaterThan(0);
    expect(result.confidenceBand).toBe("High");
    expect(result.usabilityIntermediate).toBeGreaterThan(0);
    expect(result.usabilityAdvanced).toBeGreaterThan(0);
    // Wind should be offshore (direction 0 = north)
    expect(result.windType).toBe("offshore");
    expect(result.windSpeedMph).toBeGreaterThan(0);
    // Tide should be rising
    expect(result.tidePhase).toBe("rising");
    expect(result.tideHeightFt).toBeGreaterThan(0);
  });

  it("calculates wave height correctly from cm to tenths of feet", () => {
    const result = generateForecast({
      spot: mockSpot,
      buoyReading: mockBuoyReading,
      tideInfo: mockTideInfo,
      avgCrowdLevel: null,
    });

    // 150cm / 30.48 = ~4.92ft, so tenths should be ~49
    expect(result.waveHeightTenthsFt).toBeGreaterThanOrEqual(45);
    expect(result.waveHeightTenthsFt).toBeLessThanOrEqual(55);
  });

  it("reduces confidence for stale data", () => {
    const staleReading: BuoyReading = {
      ...mockBuoyReading,
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours old
    };

    const result = generateForecast({
      spot: mockSpot,
      buoyReading: staleReading,
      tideInfo: mockTideInfo,
      avgCrowdLevel: null,
    });

    expect(result.confidenceBand).toBe("Low");
  });

  it("applies crowd penalty when crowd level is high", () => {
    const resultNoCrowd = generateForecast({
      spot: mockSpot,
      buoyReading: mockBuoyReading,
      tideInfo: mockTideInfo,
      avgCrowdLevel: null,
    });

    const resultCrowded = generateForecast({
      spot: mockSpot,
      buoyReading: mockBuoyReading,
      tideInfo: mockTideInfo,
      avgCrowdLevel: 5, // Packed
    });

    expect(resultCrowded.usabilityIntermediate).toBeLessThan(resultNoCrowd.usabilityIntermediate);
    expect(resultCrowded.usabilityAdvanced).toBeLessThan(resultNoCrowd.usabilityAdvanced);
  });

  it("penalizes intermediate surfers for big waves", () => {
    const bigWaveReading: BuoyReading = {
      ...mockBuoyReading,
      waveHeightCm: 300, // ~10ft
    };

    const result = generateForecast({
      spot: mockSpot,
      buoyReading: bigWaveReading,
      tideInfo: mockTideInfo,
      avgCrowdLevel: null,
    });

    expect(result.usabilityIntermediate).toBeLessThan(result.usabilityAdvanced);
  });

  it("scores lower for poor swell direction", () => {
    const poorDirectionReading: BuoyReading = {
      ...mockBuoyReading,
      swellDirectionDeg: 45, // Outside ideal window (120-200)
    };

    const goodResult = generateForecast({
      spot: mockSpot,
      buoyReading: mockBuoyReading,
      tideInfo: mockTideInfo,
      avgCrowdLevel: null,
    });

    const poorResult = generateForecast({
      spot: mockSpot,
      buoyReading: poorDirectionReading,
      tideInfo: mockTideInfo,
      avgCrowdLevel: null,
    });

    expect(poorResult.probabilityScore).toBeLessThan(goodResult.probabilityScore);
  });

  it("scores lower for onshore wind", () => {
    const onshoreWindReading: BuoyReading = {
      ...mockBuoyReading,
      windDirectionDeg: 180, // Onshore (south)
      windSpeedCmps: 800, // Strong wind
    };

    const goodResult = generateForecast({
      spot: mockSpot,
      buoyReading: mockBuoyReading,
      tideInfo: mockTideInfo,
      avgCrowdLevel: null,
    });

    const poorResult = generateForecast({
      spot: mockSpot,
      buoyReading: onshoreWindReading,
      tideInfo: mockTideInfo,
      avgCrowdLevel: null,
    });

    expect(poorResult.probabilityScore).toBeLessThan(goodResult.probabilityScore);
  });
});
