import type { SwellAlert, SurfSpot, ForecastPoint } from "../../drizzle/schema";
import type { ForecastTimelineResult } from "./forecast";
import { generateForecastTimeline } from "./forecast";
import { getCurrentTideInfo } from "./tides";
import { getAverageCrowdLevel } from "../db";
import { getForecastTimeline } from "../db";
import { isDaylightHours, getLastLightForDate } from "../utils/sunTimes";

export interface DetectedSwell {
  alertId: number;
  userId: number;
  spotId: number;
  swellStartTime: Date;
  swellEndTime: Date;
  peakWaveHeightFt: number;
  peakQualityScore: number;
  avgQualityScore: number;
  avgPeriodSec: number;
  conditions: Array<{
    timestamp: Date;
    waveHeight: number;
    period: number;
    windType: string | null;
    qualityScore: number;
  }>;
}

// Spots that are "Coming Soon" and should be excluded from alerts
const EXCLUDED_SPOT_NAMES = ["Belmar", "Gilgo Beach", "Montauk"];

/**
 * Detects upcoming swells that match a user's alert criteria.
 * Returns swell windows that meet the alert requirements.
 */
export async function detectUpcomingSwells(
  alert: SwellAlert,
  spots: SurfSpot[],
  now: Date = new Date()
): Promise<DetectedSwell[]> {
  // Filter out "Coming Soon" spots that don't have active forecasts
  const activeSpots = spots.filter(s => !EXCLUDED_SPOT_NAMES.includes(s.name));
  
  // If alert is for a specific spot, only check that spot
  // Otherwise, check all active spots (excludes Coming Soon spots)
  const spotsToCheck = alert.spotId === null 
    ? activeSpots 
    : spots.filter(s => s.id === alert.spotId);

  if (spotsToCheck.length === 0) {
    return [];
  }

  const detectedSwells: DetectedSwell[] = [];

  // Check each spot
  for (const spot of spotsToCheck) {
    // Get forecast timeline (168 hours = 7 days)
    const forecastPoints = await getForecastTimeline(spot.id, 168);
    
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

    // Calculate forecast window
    // The forecast window defines how far into the future to look for matching swells
    // e.g., a 7-day window means "look for swells within the next 7 days"
    // earliestTime = now (start looking immediately)
    // latestTime = now + forecast window (how far ahead to look)
    let forecastWindowMs: number;
    if (alert.daysAdvanceNotice !== null && alert.daysAdvanceNotice !== undefined) {
      forecastWindowMs = alert.daysAdvanceNotice * 24 * 60 * 60 * 1000;
    } else {
      forecastWindowMs = (alert.hoursAdvanceNotice || 24) * 60 * 60 * 1000;
    }
    
    // Start looking from now (or a small buffer to avoid very near-term noise)
    const earliestTime = new Date(now.getTime() + (1 * 60 * 60 * 1000)); // 1 hour buffer
    // Look up to the forecast window limit
    const latestTime = new Date(now.getTime() + forecastWindowMs);

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
        avgQualityScore: window.avgScore,
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
  avgScore: number;
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

    // Check if point matches criteria (including daylight check)
    if (pointMatchesCriteria(point, alert, spot)) {
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
            const window = createWindowFromPoints(currentWindow, spot);
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
        const window = createWindowFromPoints(currentWindow, spot);
        if (window) windows.push(window);
      }
      currentWindow = [];
    }
  }

  // Save final window if it has at least 2 hours
  if (currentWindow.length >= 2) {
    const window = createWindowFromPoints(currentWindow, spot);
    if (window) windows.push(window);
  }

  return windows;
}

/**
 * Checks if a forecast point matches the alert criteria.
 * Also filters out nighttime hours - only daylight surfing hours count.
 */
function pointMatchesCriteria(
  point: ForecastTimelineResult,
  alert: SwellAlert,
  spot?: SurfSpot
): boolean {
  // DAYLIGHT CHECK: Only include points during daylight surfing hours
  const pointTime = new Date(point.forecastTimestamp);
  const lat = spot ? parseFloat(spot.latitude) : 40.588; // Default to Long Beach area
  const lng = spot ? parseFloat(spot.longitude) : -73.658;
  
  if (!isDaylightHours(pointTime, lat, lng)) {
    return false; // Skip nighttime hours
  }

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
    if (windType !== "offshore" && windType !== "side-offshore") {
      return false;
    }
  }

  return true;
}

/**
 * Creates a SwellWindow from an array of consecutive matching points.
 * Caps end time at last light (sunset) for the day.
 */
function createWindowFromPoints(
  points: ForecastTimelineResult[],
  spot?: SurfSpot
): SwellWindow | null {
  if (points.length === 0) return null;

  const firstTime = new Date(points[0].forecastTimestamp);
  let lastTime = new Date(points[points.length - 1].forecastTimestamp);
  
  // Cap end time at last light for the day
  const lat = spot ? parseFloat(spot.latitude) : 40.588;
  const lng = spot ? parseFloat(spot.longitude) : -73.658;
  const lastLight = getLastLightForDate(lastTime, lat, lng);
  
  if (lastTime.getTime() > lastLight.getTime()) {
    lastTime = lastLight;
  }

  // Calculate peak and average values
  let peakHeight = 0;
  let peakScore = 0;
  let totalScore = 0;
  let totalPeriod = 0;
  let validPeriods = 0;

  const conditions = points.map(point => {
    const breakingHeight = point.breakingWaveHeightFt ?? point.dominantSwellHeightFt ?? point.waveHeightFt ?? 0;
    const qualityScore = point.quality_score ?? point.probabilityScore ?? 0;
    const period = point.dominantSwellPeriodS ?? point.wavePeriodSec ?? 0;

    if (breakingHeight > peakHeight) peakHeight = breakingHeight;
    if (qualityScore > peakScore) peakScore = qualityScore;
    totalScore += qualityScore;
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
  const avgScore = conditions.length > 0 ? Math.round(totalScore / conditions.length) : 0;

  return {
    startTime: firstTime,
    endTime: lastTime,
    peakHeight,
    peakScore,
    avgScore,
    avgPeriod,
    conditions,
  };
}

