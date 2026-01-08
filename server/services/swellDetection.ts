import type { SwellAlert, SurfSpot, ForecastPoint } from "../../drizzle/schema";
import type { ForecastTimelineResult } from "./forecast";
import { generateForecastTimeline } from "./forecast";
import { getCurrentTideInfo } from "./tides";
import { getAverageCrowdLevel } from "../db";
import { getForecastTimeline } from "../db";

export interface DetectedSwell {
  alertId: number;
  userId: number;
  spotId: number;
  swellStartTime: Date;
  swellEndTime: Date;
  peakWaveHeightFt: number;
  peakQualityScore: number;
  avgPeriodSec: number;
  conditions: Array<{
    timestamp: Date;
    waveHeight: number;
    period: number;
    windType: string | null;
    qualityScore: number;
  }>;
}

/**
 * Detects upcoming swells that match a user's alert criteria.
 * Returns swell windows that meet the alert requirements.
 */
export async function detectUpcomingSwells(
  alert: SwellAlert,
  spots: SurfSpot[],
  now: Date = new Date()
): Promise<DetectedSwell[]> {
  // If alert is for a specific spot, only check that spot
  // Otherwise, check all spots
  const spotsToCheck = alert.spotId === null 
    ? spots 
    : spots.filter(s => s.id === alert.spotId);

  if (spotsToCheck.length === 0) {
    return [];
  }

  const detectedSwells: DetectedSwell[] = [];

  // Check each spot
  for (const spot of spotsToCheck) {
    // Get forecast timeline (120 hours)
    const forecastPoints = await getForecastTimeline(spot.id, 120);
    
    if (forecastPoints.length === 0) {
      continue;
    }

    // Generate forecast timeline with quality scores
    const tideInfo = await getCurrentTideInfo(spot.tideStationId);
    const avgCrowdLevel = await getAverageCrowdLevel(spot.id);
    
    const timeline = await generateForecastTimeline({
      forecastPoints,
      spot,
      tideStationId: spot.tideStationId,
      avgCrowdLevel,
    });

    // Calculate advance notice window
    const advanceNoticeMs = (alert.hoursAdvanceNotice || 24) * 60 * 60 * 1000;
    const earliestTime = new Date(now.getTime() + advanceNoticeMs);
    const latestTime = new Date(now.getTime() + (120 * 60 * 60 * 1000)); // Max 120 hours out

    // Find swell windows that match criteria
    const matchingWindows = findMatchingSwellWindows(
      timeline,
      alert,
      earliestTime,
      latestTime,
      spot
    );

    // Convert to DetectedSwell format
    for (const window of matchingWindows) {
      detectedSwells.push({
        alertId: alert.id,
        userId: alert.userId,
        spotId: spot.id,
        swellStartTime: window.startTime,
        swellEndTime: window.endTime,
        peakWaveHeightFt: window.peakHeight,
        peakQualityScore: window.peakScore,
        avgPeriodSec: window.avgPeriod,
        conditions: window.conditions,
      });
    }
  }

  return detectedSwells;
}

interface SwellWindow {
  startTime: Date;
  endTime: Date;
  peakHeight: number;
  peakScore: number;
  avgPeriod: number;
  conditions: Array<{
    timestamp: Date;
    waveHeight: number;
    period: number;
    windType: string | null;
    qualityScore: number;
  }>;
}

/**
 * Finds consecutive time windows where forecast points match alert criteria.
 */
function findMatchingSwellWindows(
  timeline: ForecastTimelineResult[],
  alert: SwellAlert,
  earliestTime: Date,
  latestTime: Date,
  spot: SurfSpot
): SwellWindow[] {
  const windows: SwellWindow[] = [];
  let currentWindow: ForecastTimelineResult[] = [];

  // Filter timeline to advance notice window
  const relevantPoints = timeline.filter(point => {
    const pointTime = new Date(point.forecastTimestamp);
    return pointTime >= earliestTime && pointTime <= latestTime;
  });

  if (relevantPoints.length === 0) {
    return [];
  }

  // Sort by timestamp
  const sortedPoints = [...relevantPoints].sort((a, b) => {
    return new Date(a.forecastTimestamp).getTime() - new Date(b.forecastTimestamp).getTime();
  });

  for (let i = 0; i < sortedPoints.length; i++) {
    const point = sortedPoints[i];
    const pointTime = new Date(point.forecastTimestamp);

    // Check if point matches criteria
    if (pointMatchesCriteria(point, alert)) {
      // Check if this point is consecutive with the last point in current window
      if (currentWindow.length > 0) {
        const lastPoint = currentWindow[currentWindow.length - 1];
        const lastTime = new Date(lastPoint.forecastTimestamp);
        const hoursDiff = (pointTime.getTime() - lastTime.getTime()) / (60 * 60 * 1000);

        // Allow up to 1 hour gap (in case of missing data)
        if (hoursDiff <= 1) {
          currentWindow.push(point);
        } else {
          // Save current window if it has at least 2 hours
          if (currentWindow.length >= 2) {
            const window = createWindowFromPoints(currentWindow);
            if (window) windows.push(window);
          }
          currentWindow = [point];
        }
      } else {
        currentWindow = [point];
      }
    } else {
      // Save current window if it has at least 2 hours
      if (currentWindow.length >= 2) {
        const window = createWindowFromPoints(currentWindow);
        if (window) windows.push(window);
      }
      currentWindow = [];
    }
  }

  // Save final window if it has at least 2 hours
  if (currentWindow.length >= 2) {
    const window = createWindowFromPoints(currentWindow);
    if (window) windows.push(window);
  }

  return windows;
}

/**
 * Checks if a forecast point matches the alert criteria.
 */
function pointMatchesCriteria(
  point: ForecastTimelineResult,
  alert: SwellAlert
): boolean {
  // Check wave height
  const breakingHeight = point.breakingWaveHeightFt ?? point.dominantSwellHeightFt ?? point.waveHeightFt ?? 0;
  if (alert.minWaveHeightFt !== null && breakingHeight < Number(alert.minWaveHeightFt)) {
    return false;
  }

  // Check quality score
  const qualityScore = point.quality_score ?? point.probabilityScore ?? 0;
  if (alert.minQualityScore !== null && qualityScore < alert.minQualityScore) {
    return false;
  }

  // Check period
  const period = point.dominantSwellPeriodS ?? point.wavePeriodSec ?? 0;
  if (alert.minPeriodSec !== null && period < alert.minPeriodSec) {
    return false;
  }

  // Check wind (if ideal wind only)
  if (alert.idealWindOnly === 1) {
    const windType = point.windType;
    if (windType !== "offshore" && windType !== "cross-offshore") {
      return false;
    }
  }

  return true;
}

/**
 * Creates a SwellWindow from an array of consecutive matching points.
 */
function createWindowFromPoints(
  points: ForecastTimelineResult[]
): SwellWindow | null {
  if (points.length === 0) return null;

  const firstTime = new Date(points[0].forecastTimestamp);
  const lastTime = new Date(points[points.length - 1].forecastTimestamp);

  // Calculate peak values
  let peakHeight = 0;
  let peakScore = 0;
  let totalPeriod = 0;
  let validPeriods = 0;

  const conditions = points.map(point => {
    const breakingHeight = point.breakingWaveHeightFt ?? point.dominantSwellHeightFt ?? point.waveHeightFt ?? 0;
    const qualityScore = point.quality_score ?? point.probabilityScore ?? 0;
    const period = point.dominantSwellPeriodS ?? point.wavePeriodSec ?? 0;

    if (breakingHeight > peakHeight) peakHeight = breakingHeight;
    if (qualityScore > peakScore) peakScore = qualityScore;
    if (period > 0) {
      totalPeriod += period;
      validPeriods++;
    }

    return {
      timestamp: new Date(point.forecastTimestamp),
      waveHeight: breakingHeight,
      period,
      windType: point.windType,
      qualityScore,
    };
  });

  const avgPeriod = validPeriods > 0 ? Math.round(totalPeriod / validPeriods) : 0;

  return {
    startTime: firstTime,
    endTime: lastTime,
    peakHeight,
    peakScore,
    avgPeriod,
    conditions,
  };
}

