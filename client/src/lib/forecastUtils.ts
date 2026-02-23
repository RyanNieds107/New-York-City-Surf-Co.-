/**
 * Utility functions for working with forecast timeline data
 * 
 * @example
 * // Example: Selecting current conditions
 * // Given timeline with points at 9am, 2pm, 3pm, and now=2:53pm:
 * // - 9am is filtered out (> 1 hour ago, beyond threshold)
 * // - 2pm (53 min ago) and 3pm (7 min future) are both valid
 * // - Function returns 3pm as it has minimum absolute time difference (7 min vs 53 min)
 * 
 * const timeline = [
 *   { forecastTimestamp: new Date('2024-01-15T09:00:00Z'), waveHeightFt: 2.0 },
 *   { forecastTimestamp: new Date('2024-01-15T14:00:00Z'), waveHeightFt: 3.5 },
 *   { forecastTimestamp: new Date('2024-01-15T15:00:00Z'), waveHeightFt: 4.0 },
 * ];
 * const now = new Date('2024-01-15T14:53:00Z').getTime(); // 2:53pm
 * const current = selectCurrentTimelinePoint(timeline, now);
 * // Returns the 3pm point (nearest to now by absolute time difference)
 */

/**
 * Maximum age (in milliseconds) for a timeline point to be considered "current".
 * Points older than this threshold will be excluded from current conditions selection.
 */
export const CURRENT_CONDITIONS_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Selects the current conditions point from a timeline array.
 * 
 * Logic:
 * 1. Filters points to only include those within the max age threshold (recent/past and future)
 * 2. Selects the point nearest to "now" by absolute time difference
 * 
 * @param timeline - Array of forecast points with `forecastTimestamp` field
 * @param now - Current time (defaults to Date.now())
 * @returns The nearest valid point, or undefined if no valid points found
 * 
 * @example
 * // Given points at 9am, 2pm, 3pm and now=2:53pm:
 * // - 9am is filtered out (> 1 hour ago)
 * // - 2pm (53 min ago) and 3pm (7 min future) are valid
 * // - Returns 3pm as it has smaller absolute difference (7 min vs 53 min)
 */
export function selectCurrentTimelinePoint<T extends { forecastTimestamp: Date | string }>(
  timeline: T[] | undefined | null,
  now: number = Date.now()
): T | undefined {
  if (!timeline || timeline.length === 0) return undefined;

  const cutoffTime = now - CURRENT_CONDITIONS_MAX_AGE_MS;

  // Filter to only recent PAST points (within max age threshold, but not future forecasts)
  // CRITICAL: Current conditions should reflect what IS happening, not what WILL happen
  const validPoints = timeline.filter((point) => {
    const pointTime = new Date(point.forecastTimestamp).getTime();
    return pointTime >= cutoffTime && pointTime <= now; // Only past points, exclude future
  });

  if (validPoints.length === 0) return undefined;

  // Find the most recent point (closest to now, but not exceeding it)
  let nearestPoint = validPoints[0];
  let nearestPointTime = new Date(nearestPoint.forecastTimestamp).getTime();
  let nearestDiff = now - nearestPointTime; // Time difference (always positive since pointTime <= now)

  for (const point of validPoints) {
    const pointTime = new Date(point.forecastTimestamp).getTime();
    const diff = now - pointTime; // Time difference (always positive)
    if (diff < nearestDiff) {
      nearestDiff = diff;
      nearestPoint = point;
    }
  }

  return nearestPoint;
}

/**
 * Format surf height using a fixed label scale.
 * 
 * Converts numeric wave height (in feet) to one of the approved display labels.
 * No decimals, no free-form strings, no string parsing.
 * 
 * @param ft - Wave height in feet, or null
 * @returns One of the approved labels: Flat, 1ft, 1–2ft, 2-3ft, 3-4ft, 4-5ft, 4-6ft, 4-6ft+, 5-7ft, 6-8ft, 6-10ft, 8-12ft, 10-15ft
 */
export function formatSurfHeight(ft: number | null): string {
  if (ft == null || ft < 0.5) return "Flat";

  if (ft < 1.0) return "1ft";

  if (ft < 2.0) return "1–2ft";

  if (ft < 3.0) return "2-3ft";

  if (ft < 4.0) return "3-4ft";

  if (ft < 5.0) return "4-5ft";

  if (ft < 6.0) return "4-6ft";

  if (ft < 7.0) return "4-6ft+";

  if (ft < 8.0) return "5-7ft";

  if (ft < 10.0) return "6-8ft";

  if (ft < 12.0) return "6-10ft";

  if (ft < 15.0) return "8-12ft";

  return "10-15ft";
}

/**
 * Timeline point type for chart processing
 */
export interface TimelinePoint {
  forecastTimestamp: Date | string;
  breakingWaveHeightFt: number | null;
  dominantSwellHeightFt: number | null;
  waveHeightFt: number | null;
}

/**
 * Chart data point with Min/Avg/Max values
 */
export interface ChartDataPoint {
  timeLabel: string; // e.g., "Mo 1p", "Tu 1a"
  min: number;
  avg: number;
  max: number;
}

/**
 * Extended timeline point with quality data
 * Matches ForecastTimelineResult from backend
 */
export interface ExtendedTimelinePoint {
  forecastTimestamp: Date | string;
  hoursOut?: number;
  probabilityScore?: number;
  waveHeightTenthsFt?: number;
  confidenceBand?: "Low" | "Medium" | "High";
  usabilityIntermediate?: number;
  usabilityAdvanced?: number;
  // Day 1 MVP outputs
  breakingWaveHeightFt: number | null;
  quality_rating: string | null;
  quality_score: number | null;
  // Dominant swell (highest energy using H² × T formula)
  dominantSwellHeightFt: number | null;
  dominantSwellPeriodS: number | null;
  dominantSwellDirectionDeg?: number | null;
  dominantSwellType?: 'primary' | 'secondary' | 'wind' | null;
  dominantSwellLabel: string | null;
  // Wave data (primary swell)
  waveHeightFt: number | null;
  wavePeriodSec?: number | null;
  waveDirectionDeg?: number | null;
  // Secondary swell
  secondarySwellHeightFt?: number | null;
  secondarySwellPeriodS?: number | null;
  secondarySwellDirectionDeg?: number | null;
  // Wind waves
  windWaveHeightFt?: number | null;
  windWavePeriodS?: number | null;
  windWaveDirectionDeg?: number | null;
  // Wind data
  windSpeedMph?: number | null;
  windGustsMph?: number | null;
  windDirectionDeg?: number | null;
  windType?: "offshore" | "onshore" | "cross" | "side-offshore" | null;
  // Tide data
  tideHeightFt?: number | null;
  tidePhase?: "rising" | "falling" | "high" | "low" | null;
  // Temperature data
  waterTempF?: number | null;
  airTempF?: number | null;
  // ECMWF model data
  ecmwfWaveHeightFt?: number | null;
}

/**
 * Detailed chart data point for area chart with conditions
 * Condition matches standard quality score rating system:
 * - dontBother: 0-39
 * - worthALook: 40-59
 * - goSurf: 60-75
 * - firing: 76-90
 * - allTime: 91-100
 */
export interface AreaChartDataPoint {
  timestamp: Date;
  hour: number;
  dayLabel: string; // "WED 17", "THU 18"
  timeLabel: string; // "6am", "12pm"
  waveHeight: number;
  qualityScore: number;
  condition: 'dontBother' | 'worthALook' | 'goSurf' | 'firing' | 'allTime';
  swellLabel: string | null; // "Wind Swell", "Swell", or "Groundswell"
}

/**
 * Process timeline data into chart format with Min/Avg/Max for each time period.
 * Groups by day of week and time period (Morning 6am-12pm or Afternoon 12pm-6pm).
 * 
 * @param timeline - Array of forecast timeline points
 * @returns Array of chart data points sorted chronologically
 */
export function processTimelineForChart(timeline: TimelinePoint[]): ChartDataPoint[] {
  if (!timeline || timeline.length === 0) {
    return [];
  }

  // Day abbreviations
  const dayAbbr = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  
  // Group by day and time period
  const groups = new Map<string, number[]>();
  
  timeline.forEach((point) => {
    const date = new Date(point.forecastTimestamp);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = date.getHours();
    
    // Determine time period: Morning (6am-12pm) = "1a", Afternoon (12pm-6pm) = "1p"
    const timePeriod = hour >= 6 && hour < 12 ? '1a' : hour >= 12 && hour < 18 ? '1p' : null;
    
    // Skip if outside our time windows (6am-6pm)
    if (!timePeriod) return;
    
    // Get wave height - use breakingWaveHeightFt which accounts for period (3s wind chop != surfable waves)
    // 0 is a valid value meaning flat conditions, so we use explicit null check
    const height = point.breakingWaveHeightFt !== null ? point.breakingWaveHeightFt : (point.dominantSwellHeightFt ?? point.waveHeightFt);
    if (height === null) return;
    
    // Create group key: "Mo-1a", "Tu-1p", etc.
    const dayLabel = dayAbbr[dayOfWeek];
    const groupKey = `${dayLabel}-${timePeriod}`;
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(height);
  });
  
  // Calculate Min/Avg/Max for each group
  const chartData: ChartDataPoint[] = [];
  
  groups.forEach((heights, groupKey) => {
    if (heights.length === 0) return;
    
    const min = Math.min(...heights);
    const max = Math.max(...heights);
    const avg = heights.reduce((sum, h) => sum + h, 0) / heights.length;
    
    chartData.push({
      timeLabel: groupKey.replace('-', ' '), // "Mo 1a", "Tu 1p", etc.
      min,
      avg,
      max,
    });
  });
  
  // Sort chronologically
  // We need to sort by day of week and time period
  chartData.sort((a, b) => {
    const dayOrder: Record<string, number> = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };
    const periodOrder: Record<string, number> = { '1a': 0, '1p': 1 };
    
    const aDay = a.timeLabel.split(' ')[0];
    const bDay = b.timeLabel.split(' ')[0];
    const aPeriod = a.timeLabel.split(' ')[1];
    const bPeriod = b.timeLabel.split(' ')[1];
    
    const dayDiff = (dayOrder[aDay] ?? 0) - (dayOrder[bDay] ?? 0);
    if (dayDiff !== 0) return dayDiff;
    
    return (periodOrder[aPeriod] ?? 0) - (periodOrder[bPeriod] ?? 0);
  });
  
  return chartData;
}

/**
 * Determine condition based on quality score
 * Matches standard quality score rating system:
 * - 0-39: dontBother (Red)
 * - 40-59: worthALook (Yellow)
 * - 60-75: goSurf (Lime)
 * - 76-90: firing (Green)
 * - 91-100: allTime (Emerald)
 */
function getConditionFromScore(score: number | null): 'dontBother' | 'worthALook' | 'goSurf' | 'firing' | 'allTime' {
  if (score === null) return 'worthALook';
  if (score >= 91) return 'allTime';
  if (score >= 76) return 'firing';
  if (score >= 60) return 'goSurf';
  if (score >= 40) return 'worthALook';
  return 'dontBother';
}

/**
 * Process timeline data into detailed format for area chart.
 * Returns hourly data points with wave height and condition coloring.
 * Only includes data from current hour onwards (filters out past data).
 *
 * @param timeline - Array of extended forecast timeline points
 * @returns Array of area chart data points sorted chronologically
 */
export function processTimelineForAreaChart(timeline: ExtendedTimelinePoint[]): AreaChartDataPoint[] {
  if (!timeline || timeline.length === 0) {
    return [];
  }

  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // Get current time, rounded down to the current hour
  const now = new Date();
  const currentHourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);

  const chartData: AreaChartDataPoint[] = [];

  timeline.forEach((point) => {
    const date = new Date(point.forecastTimestamp);

    // Skip past data points (before current hour)
    if (date.getTime() < currentHourStart.getTime()) {
      return;
    }

    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();
    const hour = date.getHours();

    // Get wave height - use breakingWaveHeightFt which accounts for period (3s wind chop != surfable waves)
    // 0 is a valid value meaning flat conditions, so we use explicit null check
    const waveHeight = point.breakingWaveHeightFt !== null ? point.breakingWaveHeightFt : (point.dominantSwellHeightFt ?? point.waveHeightFt ?? 0);

    // Get swell label (use backend label if available, otherwise derive from period)
    let swellLabel = point.dominantSwellLabel;
    if (!swellLabel && point.dominantSwellPeriodS !== null) {
      // Fallback logic if the backend didn't provide a label (matches backend thresholds exactly)
      // Backend uses: period < 7 = "Wind Swell", period <= 12 = "Swell", else = "Groundswell"
      const period = point.dominantSwellPeriodS;
      swellLabel = period < 7 ? "Wind Swell" : period <= 12 ? "Swell" : "Groundswell";
    }
    
    // Debug logging for first point
    if (chartData.length === 0) {
      console.log('[processTimelineForAreaChart] First point debug:', {
        dominantSwellLabel: point.dominantSwellLabel,
        dominantSwellPeriodS: point.dominantSwellPeriodS,
        calculatedSwellLabel: swellLabel,
        hasDominantSwellLabel: 'dominantSwellLabel' in point,
        pointKeys: Object.keys(point),
      });
    }

    // Format time label (e.g., "6am", "12pm", "6pm")
    const hourLabel = hour === 0 ? '12am' : hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`;

    chartData.push({
      timestamp: date,
      hour,
      dayLabel: `${dayNames[dayOfWeek]} ${dayOfMonth}`,
      timeLabel: hourLabel,
      waveHeight,
      qualityScore: point.quality_score ?? 0,
      condition: getConditionFromScore(point.quality_score),
      swellLabel,
    });
  });

  // Sort by timestamp
  chartData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return chartData;
}

