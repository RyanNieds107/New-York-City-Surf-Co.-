import type { SwellAlert, SurfSpot } from "../../drizzle/schema";
import type { DetectedSwell } from "./swellDetection";

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
  
  // Format time window (e.g., "Sat 7AM-11AM")
  const formatTimeWindow = (): string => {
    const startDay = swellStartTime.toLocaleDateString("en-US", { weekday: "short" });
    const startHour = swellStartTime.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }).replace(" ", "");
    const endHour = swellEndTime.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }).replace(" ", "");
    return `${startDay} ${startHour}-${endHour}`;
  };

  // Format wave height range (e.g., "4-5ft")
  const waveHeight = Math.round(peakWaveHeightFt);
  const waveHeightRange = `${waveHeight}-${waveHeight + 1}ft`;

  // Quality label
  const getQualityLabel = (score: number): string => {
    if (score >= 80) return "FIRING";
    if (score >= 70) return "GREAT";
    if (score >= 60) return "GOOD";
    if (score >= 50) return "FAIR";
    return "POOR";
  };
  const qualityLabel = getQualityLabel(peakQualityScore);

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
    if (hours <= 120) return { percent: 65, message: "Early signal. Still time for changes." };
    return { percent: 50, message: "Long-range outlook. A lot can change." };
  };
  const confidence = getConfidence(hoursUntil);

  // Subject line - minimal
  const subject = `${spot.name}: ${waveHeightRange} ${qualityLabel} - ${formatTimeWindow()}`;

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
  const smsText = `${spot.name.toUpperCase()}
${formatTimeWindow()}: ${waveHeightRange} - ${qualityLabel}
${peakWaveHeightFt.toFixed(0)}ft @ ${avgPeriodSec}s | ${windLabel}
${confidence.percent}% confidence
${confidence.message}`;

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
                ${formatTimeWindow()}: ${waveHeightRange}<span class="badge">${qualityLabel}</span>
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

${formatTimeWindow()}: ${waveHeightRange} - ${qualityLabel}

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
