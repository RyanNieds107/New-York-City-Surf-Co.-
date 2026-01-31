import type { SwellAlert, SurfSpot } from "../../drizzle/schema";
import type { DetectedSwell } from "./swellDetection";
import { formatDaylightTimeWindow, getLastLightForDate } from "../utils/sunTimes";

// Predefined wave height ranges based on surf reporting conventions
// Format: [min, max] - ranges chosen to match how surfers describe conditions
const WAVE_HEIGHT_RANGES: [number, number][] = [
  [2, 3], [3, 4], [4, 5], [4, 6], [5, 6],
  [5, 7], [6, 8], [6, 10], [8, 10], [6, 12]
];

/**
 * Maps forecast wave heights to the best matching predefined range.
 * Uses the min/max spread from the conditions to find the closest fit.
 */
function getWaveHeightRange(conditions: Array<{ waveHeight: number }>): string {
  if (conditions.length === 0) return "2-3ft";

  const heights = conditions.map(c => c.waveHeight);
  const minHeight = Math.floor(Math.min(...heights));
  const maxHeight = Math.ceil(Math.max(...heights));

  // Find the range that best fits our forecast spread
  // Score each range by how well it contains the forecast while being tight
  let bestRange = WAVE_HEIGHT_RANGES[0];
  let bestScore = Infinity;

  for (const [rangeMin, rangeMax] of WAVE_HEIGHT_RANGES) {
    // Check if range contains our forecast spread
    const containsMin = rangeMin <= minHeight;
    const containsMax = rangeMax >= maxHeight;

    if (containsMin && containsMax) {
      // Range contains our spread - prefer tighter ranges
      const rangeSize = rangeMax - rangeMin;
      const spreadSize = maxHeight - minHeight;
      const slack = rangeSize - spreadSize;

      if (slack < bestScore) {
        bestScore = slack;
        bestRange = [rangeMin, rangeMax];
      }
    } else if (bestScore === Infinity) {
      // No perfect fit yet - find closest match
      const distMin = Math.abs(rangeMin - minHeight);
      const distMax = Math.abs(rangeMax - maxHeight);
      const totalDist = distMin + distMax;

      if (totalDist < bestScore) {
        bestScore = totalDist;
        bestRange = [rangeMin, rangeMax];
      }
    }
  }

  return `${bestRange[0]}-${bestRange[1]}ft`;
}

// Day names for formatting
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface FormattedNotification {
  subject: string;
  emailHtml: string;
  emailText: string;
  smsText: string;
}

/**
 * Formats swell alert notifications - ruthlessly minimal.
 * The alert's job: Make someone decide "do I go?" 
 * Save the detailed breakdown for the full forecast page.
 */
export function formatSwellAlertNotification(
  detectedSwell: DetectedSwell,
  alert: SwellAlert,
  spot: SurfSpot
): FormattedNotification {
  const { peakWaveHeightFt, peakQualityScore, avgPeriodSec, swellStartTime, swellEndTime, conditions } =
    detectedSwell;

  // Get wind type from first condition (most relevant)
  const windType = conditions[0]?.windType || "variable";
  
  // Calculate hours until swell
  const hoursUntil = Math.round((swellStartTime.getTime() - Date.now()) / (1000 * 60 * 60));
  
  // Get spot coordinates for daylight calculations
  const lat = parseFloat(spot.latitude);
  const lng = parseFloat(spot.longitude);
  
  // Cap end time at last light (sunset) - don't show times after dark
  const lastLight = getLastLightForDate(swellEndTime, lat, lng);
  const effectiveEndTime = swellEndTime.getTime() > lastLight.getTime() ? lastLight : swellEndTime;
  
  // Format time window with daylight-aware labels (e.g., "Sat Morning-Afternoon")
  const formatTimeWindow = (): string => {
    return formatDaylightTimeWindow(swellStartTime, effectiveEndTime, lat, lng);
  };

  // Format time window for alerts - specific hours for short windows (<6 hours)
  const formatAlertTimeWindow = (): string => {
    const durationHours = (effectiveEndTime.getTime() - swellStartTime.getTime()) / (1000 * 60 * 60);

    // For short windows (< 6 hours), show specific times like "2PM-5PM"
    if (durationHours < 6) {
      const formatHour = (d: Date): string => {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          hour: 'numeric',
          hour12: true
        }).formatToParts(d);
        const hour = parts.find(p => p.type === 'hour')?.value || '12';
        const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value || 'AM';
        return `${hour}${dayPeriod}`;
      };
      return `${formatHour(swellStartTime)}-${formatHour(effectiveEndTime)}`;
    }

    // For longer windows, use daylight labels without day prefix (e.g., "Morning-Afternoon")
    const fullWindow = formatTimeWindow();
    // Remove day prefix (e.g., "Sat Morning-Afternoon" -> "Morning-Afternoon")
    const parts = fullWindow.split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : fullWindow;
  };

  // Format day of week and date (e.g., "Saturday 1/31")
  const dayOfWeek = DAY_NAMES[swellStartTime.getDay()];
  const dateFormatted = `${swellStartTime.getMonth() + 1}/${swellStartTime.getDate()}`;

  // Format wave height range using forecast spread
  const waveHeightRange = getWaveHeightRange(conditions);

  // Quality label - FIRING requires both high score AND minimum 4ft waves
  // Thresholds raised to ensure "GOOD" means genuinely good conditions (not just barely surfable)
  const getQualityLabel = (score: number, minWaveHeight: number): string => {
    if (score >= 80 && minWaveHeight >= 4) return "FIRING";
    if (score >= 75) return "GREAT";  // was 70
    if (score >= 65) return "GOOD";   // was 60
    if (score >= 50) return "FAIR";
    return "POOR";
  };
  const minWaveHeight = Math.min(...conditions.map(c => c.waveHeight));
  const qualityLabel = getQualityLabel(peakQualityScore, minWaveHeight);

  // Wind label (e.g., "NW Offshore")
  const getWindLabel = (type: string | null): string => {
    if (!type) return "Variable";
    switch (type) {
      case "offshore": return "Offshore";
      case "side-offshore": return "Side-offshore";
      case "side-onshore": return "Side-onshore";
      case "onshore": return "Onshore";
      default: return "Variable";
    }
  };
  const windLabel = getWindLabel(windType);

  // Confidence based on hours out (decreases with time)
  const getConfidence = (hours: number): { percent: number; message: string } => {
    if (hours <= 12) return { percent: 98, message: "Conditions are locked in. Go surf." };
    if (hours <= 24) return { percent: 95, message: "Forecast is looking solid. Get prepared." };
    if (hours <= 48) return { percent: 90, message: "Looking promising. Keep an eye on it." };
    if (hours <= 72) return { percent: 80, message: "Tracking a swell. Check back tomorrow." };
    if (hours <= 120) return { percent: 65, message: "Early signal. We are confident there will be swell in the water, but the wind factor remains unclear." };
    // Days 6-7 (>120 hours): Extended forecast - much less accurate
    return { percent: 25, message: "Extended forecast. Use as swell indicator only." };
  };
  const confidence = getConfidence(hoursUntil);

  // Subject line: SPOT - QUALITY TIME DAY DATE
  // Example: "LIDO BEACH - GOOD 2PM-5PM SATURDAY 2/1"
  const timeWindow = formatAlertTimeWindow();
  const subject = `${spot.name.toUpperCase()} - ${qualityLabel} ${timeWindow.toUpperCase()} ${dayOfWeek.toUpperCase()} ${dateFormatted}`;

  // Hours out text
  const hoursOutText = hoursUntil <= 1 ? "NOW" : `${hoursUntil}hrs out`;

  // Quality color for badge
  const getQualityColor = (score: number): string => {
    if (score >= 80) return "#059669"; // emerald
    if (score >= 70) return "#16a34a"; // green
    if (score >= 60) return "#84cc16"; // lime
    if (score >= 50) return "#eab308"; // yellow
    return "#ef4444"; // red
  };
  const qualityColor = getQualityColor(peakQualityScore);

  // SMS text (160 chars max)
  const smsText = `${spot.name.toUpperCase()} WILL BE ${qualityLabel}
${dayOfWeek} ${dateFormatted} - ${waveHeightRange} Waves
${peakWaveHeightFt.toFixed(0)}ft @ ${avgPeriodSec}s | ${windLabel}
${confidence.percent}% confidence`;

  // Email HTML - ruthlessly minimal
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 400px; margin: 0 auto; background: #fff; }
        .header { background: #000; color: #fff; padding: 16px 20px; }
        .spot-name { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin: 0; }
        .content { padding: 20px; }
        .main-line { font-size: 18px; font-weight: 700; color: #000; margin: 0 0 16px 0; }
        .badge { display: inline-block; background: ${qualityColor}; color: ${peakQualityScore >= 60 && peakQualityScore < 70 ? '#000' : '#fff'}; padding: 2px 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-left: 8px; }
        .details { font-size: 14px; color: #333; line-height: 1.6; margin: 0 0 16px 0; }
        .detail-row { margin: 4px 0; }
        .label { color: #666; }
        .confidence { background: #f0f0f0; padding: 12px; margin: 16px 0; }
        .confidence-header { font-size: 13px; font-weight: 600; color: #000; margin: 0 0 4px 0; }
        .confidence-message { font-size: 13px; color: #333; margin: 0; }
        .cta { display: block; background: #000; color: #fff; text-align: center; padding: 14px 20px; text-decoration: none; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
        .footer { padding: 16px 20px; text-align: center; font-size: 11px; color: #999; }
        .footer a { color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="spot-name">${spot.name}</h1>
        </div>
        <div class="content">
            <p class="main-line">
                ${dayOfWeek} ${dateFormatted}: ${waveHeightRange} Waves <span class="badge">${qualityLabel}</span>
            </p>
            <div class="details">
                <div class="detail-row"><span class="label">Swell:</span> ${peakWaveHeightFt.toFixed(0)}ft @ ${avgPeriodSec}s</div>
                <div class="detail-row"><span class="label">Wind:</span> ${windLabel}, ${hoursOutText}</div>
            </div>
            <div class="confidence">
                <p class="confidence-header">${confidence.percent}% confidence</p>
                <p class="confidence-message">${confidence.message}</p>
            </div>
        </div>
        <a href="${process.env.APP_URL || "https://nycsurfco.com"}/spot/${spot.id}" class="cta">View Forecast →</a>
        <div class="footer">
            <a href="${process.env.APP_URL || "https://nycsurfco.com"}/members">Manage Alerts</a> · NYC Surf Co.
        </div>
    </div>
</body>
</html>
  `.trim();

  // Email text version (fallback)
  const emailText = `
${spot.name.toUpperCase()}

${dayOfWeek} ${dateFormatted}: ${waveHeightRange} Waves (${qualityLabel})

Swell: ${peakWaveHeightFt.toFixed(0)}ft @ ${avgPeriodSec}s
Wind: ${windLabel}, ${hoursOutText}

${confidence.percent}% confidence - ${confidence.message}

View Forecast: ${process.env.APP_URL || "https://nycsurfco.com"}/spot/${spot.id}

---
Manage Alerts: ${process.env.APP_URL || "https://nycsurfco.com"}/members
  `.trim();

  return {
    subject,
    emailHtml,
    emailText,
    smsText,
  };
}
