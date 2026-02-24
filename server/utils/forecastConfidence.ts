/**
 * Forecast Confidence Calculator
 *
 * Compares Open-Meteo forecasts against Stormglass ECMWF data
 * to determine confidence levels.
 *
 * Confidence Thresholds:
 * - HIGH: Models agree within 0.5ft
 * - MED: Models agree within 1.5ft
 * - LOW: Models disagree by more than 1.5ft
 */

import { getStormglassVerification } from "../db";
import type { ForecastTimelineResult } from "../services/forecast";
import type { StormglassVerification } from "../../drizzle/schema";
import { calculateQualityScoreWithProfile } from "./qualityRating";
import { getSpotProfile } from "./spotProfiles";

export type ConfidenceLevel = "HIGH" | "MED" | "LOW" | null;

/**
 * Calculate confidence based on wave height difference between models.
 */
export function calculateConfidence(
  openMeteoHeightFt: number | null,
  ecmwfHeightFt: number | null
): ConfidenceLevel {
  // If either value is missing, we can't calculate confidence
  if (openMeteoHeightFt === null || ecmwfHeightFt === null) {
    return null;
  }

  const difference = Math.abs(openMeteoHeightFt - ecmwfHeightFt);

  if (difference < 0.5) return "HIGH";  // Models agree within 0.5ft
  if (difference < 1.5) return "MED";   // Models close
  return "LOW";                         // Models disagree significantly
}

/**
 * Result type for timeline with confidence
 */
export interface ForecastWithConfidence extends ForecastTimelineResult {
  modelConfidence: ConfidenceLevel;
  ecmwfWaveHeightFt: number | null;
  euroQualityScore: number | null;
  euroQualityRating: string | null;
}

/**
 * Add confidence levels to a forecast timeline by comparing with Stormglass data.
 * Covers the full 7-day forecast window using Eastern-time hour keys for matching.
 */
export async function addConfidenceToTimeline(
  spotId: number,
  timeline: ForecastTimelineResult[],
  spotName?: string
): Promise<ForecastWithConfidence[]> {
  if (timeline.length === 0) {
    return [];
  }

  // Get the time range from the timeline
  const now = new Date();
  const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Next 7 days

  // Fetch Stormglass verification data for this time range
  const verificationData = await getStormglassVerification(spotId, now, endTime);

  // Create a map of verification data by hour for O(1) lookup
  const verificationMap = new Map<string, StormglassVerification>();
  for (const v of verificationData) {
    const key = buildEasternHourKey(v.forecastTimestamp);
    verificationMap.set(key, v);
  }

  // Add confidence to each timeline point
  return timeline.map((point) => {
    const pointTime = new Date(point.forecastTimestamp);
    const key = buildEasternHourKey(pointTime);
    const verification = verificationMap.get(key);

    // Get Open-Meteo wave height (use breaking height or dominant swell height)
    const openMeteoHeight = point.breakingWaveHeightFt ?? point.dominantSwellHeightFt ?? null;

    // Get ECMWF wave height from verification data (waveHeightFt is populated; swellHeightFt is NULL)
    const ecmwfHeight = verification?.waveHeightFt
      ? parseFloat(verification.waveHeightFt)
      : null;

    // Calculate confidence
    const modelConfidence = calculateConfidence(openMeteoHeight, ecmwfHeight);

    // Compute Euro quality score when ECMWF data is available and spot name is provided
    let euroQualityScore: number | null = null;
    let euroQualityRating: string | null = null;

    if (ecmwfHeight != null && spotName) {
      const profile = getSpotProfile(spotName);
      if (profile) {
        const MPH_TO_KTS = 1 / 1.15078;

        // Build a ForecastPoint-compatible object using timeline data
        // waveHeightFt must be in tenths of feet (ForecastPoint convention)
        const forecastPointLike = {
          waveHeightFt: Math.round((point.dominantSwellHeightFt ?? point.waveHeightFt ?? 0) * 10),
          wavePeriodSec: point.dominantSwellPeriodS ?? point.wavePeriodSec ?? null,
          waveDirectionDeg: point.dominantSwellDirectionDeg ?? point.waveDirectionDeg ?? null,
          windSpeedKts: point.windSpeedMph != null ? Math.round(point.windSpeedMph * MPH_TO_KTS) : null,
          windDirectionDeg: point.windDirectionDeg ?? null,
          windGustsKts: point.windGustsMph != null ? Math.round(point.windGustsMph * MPH_TO_KTS) : null,
          secondarySwellHeightFt: point.secondarySwellHeightFt ?? null,
          secondarySwellPeriodS: point.secondarySwellPeriodS ?? null,
          secondarySwellDirectionDeg: point.secondarySwellDirectionDeg ?? null,
          windWaveHeightFt: point.windWaveHeightFt ?? null,
          windWavePeriodS: point.windWavePeriodS ?? null,
          windWaveDirectionDeg: point.windWaveDirectionDeg ?? null,
          // Stubs for required ForecastPoint fields not used by quality scorer
          waterTempF: null,
          airTempF: null,
        };

        // tideHeightFt in ForecastTimelineResult is in tenths of feet
        const tideFt = (point.tideHeightFt ?? 0) / 10;

        const euroResult = calculateQualityScoreWithProfile(
          forecastPointLike as any,
          spotName,
          tideFt,
          profile,
          point.tidePhase ?? null,
          ecmwfHeight  // breakingHeightOverride = Euro wave height (ft)
        );

        euroQualityScore = euroResult.score;
        euroQualityRating = euroResult.rating;
      }
    }

    return {
      ...point,
      modelConfidence,
      ecmwfWaveHeightFt: ecmwfHeight,
      euroQualityScore,
      euroQualityRating,
    };
  });
}

/**
 * Get a simple confidence summary for a spot.
 * Useful for dashboard cards to show overall confidence.
 */
export async function getConfidenceSummary(
  spotId: number,
  timeline: ForecastTimelineResult[]
): Promise<{
  overallConfidence: ConfidenceLevel;
  highCount: number;
  medCount: number;
  lowCount: number;
  totalWithData: number;
}> {
  const timelineWithConfidence = await addConfidenceToTimeline(spotId, timeline);

  // Only look at points with confidence data (next 24 hours)
  const pointsWithConfidence = timelineWithConfidence.filter(
    (p) => p.modelConfidence !== null
  );

  if (pointsWithConfidence.length === 0) {
    return {
      overallConfidence: null,
      highCount: 0,
      medCount: 0,
      lowCount: 0,
      totalWithData: 0,
    };
  }

  const highCount = pointsWithConfidence.filter((p) => p.modelConfidence === "HIGH").length;
  const medCount = pointsWithConfidence.filter((p) => p.modelConfidence === "MED").length;
  const lowCount = pointsWithConfidence.filter((p) => p.modelConfidence === "LOW").length;

  // Determine overall confidence based on majority
  let overallConfidence: ConfidenceLevel;
  const total = pointsWithConfidence.length;

  if (highCount / total >= 0.6) {
    overallConfidence = "HIGH";
  } else if (lowCount / total >= 0.4) {
    overallConfidence = "LOW";
  } else {
    overallConfidence = "MED";
  }

  return {
    overallConfidence,
    highCount,
    medCount,
    lowCount,
    totalWithData: total,
  };
}

/**
 * Get confidence badge text for display.
 */
/**
 * Result of auto-selecting the most accurate forecast model based on buoy validation.
 */
export interface RecommendedModelResult {
  model: 'euro' | 'om';
  reason: string;
  buoyHeightFt: number;
  omDiffFt: number;
  euroDiffFt: number | null;
}

/**
 * Compare buoy observation against both models' current-hour wave height.
 * Whichever model is closer to the buoy becomes the recommended default.
 * Returns null if buoy is stale/unavailable or OM data is unavailable.
 * Tie goes to Euro.
 */
export function selectRecommendedModel(
  buoyWaveHeightFt: number | null,
  buoyIsStale: boolean,
  omWaveHeightFt: number | null,
  ecmwfWaveHeightFt: number | null,
): RecommendedModelResult | null {
  // Can't compare without buoy ground truth or OM data
  if (buoyWaveHeightFt === null || buoyIsStale || omWaveHeightFt === null) {
    return null;
  }

  const omDiff = Math.abs(omWaveHeightFt - buoyWaveHeightFt);

  // If ECMWF unavailable, recommend OM by default
  if (ecmwfWaveHeightFt === null) {
    return {
      model: 'om',
      reason: 'ECMWF data unavailable, using Open-Meteo',
      buoyHeightFt: buoyWaveHeightFt,
      omDiffFt: omDiff,
      euroDiffFt: null,
    };
  }

  const euroDiff = Math.abs(ecmwfWaveHeightFt - buoyWaveHeightFt);

  // Tie goes to Euro
  const model = euroDiff <= omDiff ? 'euro' : 'om';
  const reason = model === 'euro'
    ? `Euro closer to buoy (${euroDiff.toFixed(1)}ft vs ${omDiff.toFixed(1)}ft diff)`
    : `OM closer to buoy (${omDiff.toFixed(1)}ft vs ${euroDiff.toFixed(1)}ft diff)`;

  return {
    model,
    reason,
    buoyHeightFt: buoyWaveHeightFt,
    omDiffFt: omDiff,
    euroDiffFt: euroDiff,
  };
}

export function getConfidenceBadgeText(confidence: ConfidenceLevel): string | null {
  switch (confidence) {
    case "HIGH":
      return "High Confidence";
    case "LOW":
      return "Forecast Uncertain";
    case "MED":
    case null:
    default:
      return null; // No badge for MED or unknown
  }
}

const WAVE_HEIGHT_DISCREPANCY_THRESHOLD_FT = 2.0;
const WAVE_HEIGHT_DISCREPANCY_WINDOW_HOURS = 48;

/**
 * Build an hour key in Eastern (America/New_York) so Stormglass and Open-Meteo
 * are compared for the same clock hour. Use this for both sources so timezone
 * and storage format don't cause mismatches.
 */
function buildEasternHourKey(timestamp: Date | string): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  let hour = getPart("hour");
  if (hour === "24") hour = "00";
  return `${year}-${month}-${day}T${hour}`;
}

/**
 * Compare Open-Meteo wave height (from timeline) with Stormglass wave height.
 * Returns a summary suitable for a user-facing forecast warning when models disagree by >= 1.0 ft.
 * Both timestamps are normalized to Eastern hour for matching.
 */
export async function getWaveHeightDiscrepancy(
  spotId: number,
  timeline: ForecastTimelineResult[]
): Promise<{ hasLargeDiscrepancy: boolean; maxDiffFt: number | null }> {
  if (timeline.length === 0) {
    return { hasLargeDiscrepancy: false, maxDiffFt: null };
  }

  const now = new Date();
  const endTime = new Date(now.getTime() + WAVE_HEIGHT_DISCREPANCY_WINDOW_HOURS * 60 * 60 * 1000);
  const verificationData = await getStormglassVerification(spotId, now, endTime);

  const verificationMap = new Map<string, StormglassVerification>();
  for (const v of verificationData) {
    const key = buildEasternHourKey(v.forecastTimestamp);
    verificationMap.set(key, v);
  }

  let maxDiffFt: number | null = null;

  for (const point of timeline) {
    const pointTime = new Date(point.forecastTimestamp);
    if (pointTime.getTime() < now.getTime()) continue;
    if (pointTime.getTime() > endTime.getTime()) break;

    const key = buildEasternHourKey(pointTime);
    const verification = verificationMap.get(key);
    const stormglassFt =
      verification?.waveHeightFt != null
        ? parseFloat(String(verification.waveHeightFt))
        : null;
    const openMeteoFt = point.waveHeightFt != null ? point.waveHeightFt : null;

    if (openMeteoFt === null || stormglassFt === null) continue;

    const diffFt = Math.abs(openMeteoFt - stormglassFt);
    if (diffFt >= WAVE_HEIGHT_DISCREPANCY_THRESHOLD_FT) {
      if (maxDiffFt === null || diffFt > maxDiffFt) {
        maxDiffFt = diffFt;
      }
    }
  }

  return {
    hasLargeDiscrepancy: maxDiffFt !== null,
    maxDiffFt,
  };
}

/** Eastern timezone for day-key alignment with frontend (NY surf app). */
function toEasternDayKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`; // month/day are 2-digit
}

/**
 * Same as getWaveHeightDiscrepancy but keyed by calendar day (Eastern).
 * Use this to show a warning on specific forecast day cards.
 */
export async function getWaveHeightDiscrepancyByDay(
  spotId: number,
  timeline: ForecastTimelineResult[]
): Promise<Record<string, { hasLargeDiscrepancy: boolean; maxDiffFt: number | null }>> {
  const byDay: Record<string, { hasLargeDiscrepancy: boolean; maxDiffFt: number | null }> = {};
  if (timeline.length === 0) return byDay;

  const now = new Date();
  const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const verificationData = await getStormglassVerification(spotId, now, endTime);

  const verificationMap = new Map<string, StormglassVerification>();
  for (const v of verificationData) {
    const key = buildEasternHourKey(v.forecastTimestamp);
    verificationMap.set(key, v);
  }

  for (const point of timeline) {
    const pointTime = new Date(point.forecastTimestamp);
    if (pointTime.getTime() < now.getTime()) continue;

    const dayKey = toEasternDayKey(pointTime);
    if (!byDay[dayKey]) {
      byDay[dayKey] = { hasLargeDiscrepancy: false, maxDiffFt: null };
    }

    const key = buildEasternHourKey(pointTime);
    const verification = verificationMap.get(key);
    const stormglassFt =
      verification?.waveHeightFt != null ? parseFloat(String(verification.waveHeightFt)) : null;
    const openMeteoFt = point.waveHeightFt != null ? point.waveHeightFt : null;

    if (openMeteoFt === null || stormglassFt === null) continue;

    const diffFt = Math.abs(openMeteoFt - stormglassFt);
    if (diffFt >= WAVE_HEIGHT_DISCREPANCY_THRESHOLD_FT) {
      byDay[dayKey].hasLargeDiscrepancy = true;
      if (byDay[dayKey].maxDiffFt === null || diffFt > byDay[dayKey].maxDiffFt!) {
        byDay[dayKey].maxDiffFt = diffFt;
      }
    }
  }

  return byDay;
}
