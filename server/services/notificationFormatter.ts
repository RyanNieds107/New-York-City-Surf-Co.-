import type { SwellAlert, SurfSpot } from "../../drizzle/schema";
import type { DetectedSwell } from "./swellDetection";

export interface FormattedNotification {
  subject: string;
  emailHtml: string;
  emailText: string;
  smsText: string;
}

/**
 * Formats swell alert notifications based on user preferences.
 * Includes/excludes confidence intervals and explanations as configured.
 */
export function formatSwellAlertNotification(
  detectedSwell: DetectedSwell,
  alert: SwellAlert,
  spot: SurfSpot
): FormattedNotification {
  const { peakWaveHeightFt, peakQualityScore, avgPeriodSec, swellStartTime, swellEndTime } =
    detectedSwell;

  const dateStr = swellStartTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const endDateStr = swellEndTime.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // Build explanation if requested
  let explanation = "";
  if (alert.includeExplanation === 1) {
    if (peakQualityScore >= 70) {
      explanation = "Excellent conditions expected! Ideal swell direction, period, and wind setup.";
    } else if (peakQualityScore >= 60) {
      explanation = "Great conditions for this spot. Good swell size and period with favorable winds.";
    } else if (peakQualityScore >= 50) {
      explanation = "Surfable conditions. Worth checking out if you're in the area.";
    }
  }

  // Build confidence info if requested
  let confidenceText = "";
  if (alert.includeConfidenceIntervals === 1) {
    // Simple confidence estimation based on how far out the forecast is
    const hoursUntilSwell = (swellStartTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilSwell > 72) {
      confidenceText = "Confidence: Medium (forecast may change as we get closer)";
    } else if (hoursUntilSwell > 24) {
      confidenceText = "Confidence: High (forecast is looking solid)";
    } else {
      confidenceText = "Confidence: Very High (conditions are imminent)";
    }
  }

  // Format wave height range
  const hoursDuration =
    (swellEndTime.getTime() - swellStartTime.getTime()) / (1000 * 60 * 60);
  const durationText = hoursDuration >= 24
    ? `${Math.round(hoursDuration / 24)} days`
    : `${Math.round(hoursDuration)} hours`;

  // Subject line
  const subject = `🏄 ${spot.name}: ${peakWaveHeightFt.toFixed(1)}ft @ ${avgPeriodSec}s - Quality ${peakQualityScore}/100`;

  // SMS text (160 chars max, simplified)
  const smsText = `🏄 NYC Surf Co.\n\n${spot.name}: ${peakWaveHeightFt.toFixed(1)}ft @ ${avgPeriodSec}s\nQuality: ${peakQualityScore}/100\nStarts: ${dateStr}\n${confidenceText ? `${confidenceText}\n` : ""}${explanation ? `\n${explanation}` : ""}`;

  // Email HTML
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000; color: #fff; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .spot-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
    .conditions { background: #fff; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .metric:last-child { border-bottom: none; }
    .metric-label { font-weight: 600; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏄 NYC Surf Co.</h1>
      <p>Swell Alert</p>
    </div>
    <div class="content">
      <div class="spot-name">${spot.name}</div>
      
      <div class="conditions">
        <div class="metric">
          <span class="metric-label">Wave Height:</span>
          <span>${peakWaveHeightFt.toFixed(1)}ft</span>
        </div>
        <div class="metric">
          <span class="metric-label">Period:</span>
          <span>${avgPeriodSec}s</span>
        </div>
        <div class="metric">
          <span class="metric-label">Quality Score:</span>
          <span>${peakQualityScore}/100</span>
        </div>
        <div class="metric">
          <span class="metric-label">Duration:</span>
          <span>${durationText}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Start:</span>
          <span>${dateStr}</span>
        </div>
        <div class="metric">
          <span class="metric-label">End:</span>
          <span>${endDateStr}</span>
        </div>
      </div>

      ${confidenceText ? `<p style="margin: 15px 0; padding: 10px; background: #e3f2fd; border-radius: 4px;">${confidenceText}</p>` : ""}
      
      ${explanation ? `<p style="margin: 15px 0; padding: 10px; background: #f0f4f8; border-radius: 4px;">${explanation}</p>` : ""}

      <p style="margin-top: 20px;">
        <a href="${process.env.APP_URL || "https://nycsurfco.com"}/spots/${spot.id}" 
           style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 4px;">
          View Full Forecast
        </a>
      </p>
    </div>
    <div class="footer">
      <p>NYC Surf Co. | Hyper-local forecasting for NYC Surfers</p>
      <p><a href="${process.env.APP_URL || "https://nycsurfco.com"}/dashboard">Manage Your Alerts</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();

  // Email text version (fallback)
  const emailText = `
NYC Surf Co. - Swell Alert

${spot.name}

Conditions:
- Wave Height: ${peakWaveHeightFt.toFixed(1)}ft
- Period: ${avgPeriodSec}s
- Quality Score: ${peakQualityScore}/100
- Duration: ${durationText}
- Start: ${dateStr}
- End: ${endDateStr}

${confidenceText ? `${confidenceText}\n` : ""}
${explanation ? `${explanation}\n` : ""}

View full forecast: ${process.env.APP_URL || "https://nycsurfco.com"}/spots/${spot.id}

Manage your alerts: ${process.env.APP_URL || "https://nycsurfco.com"}/dashboard
  `.trim();

  return {
    subject,
    emailHtml,
    emailText,
    smsText,
  };
}

