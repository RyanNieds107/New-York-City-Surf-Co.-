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

  // Get quality score color
  const getQualityColor = (score: number) => {
    if (score >= 70) return "#00FF00";
    if (score >= 50) return "#FFD700";
    return "#FF6B6B";
  };

  // Get confidence level details
  const getConfidenceDetails = () => {
    const hoursUntilSwell = (swellStartTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilSwell <= 24) {
      return { level: "VERY HIGH", description: "Conditions are imminent. Excellent swell direction, period, and wind setup." };
    } else if (hoursUntilSwell <= 72) {
      return { level: "HIGH", description: "Forecast is looking solid. Good confidence in predicted conditions." };
    }
    return { level: "MEDIUM", description: "Forecast may change as we get closer. Keep an eye on updates." };
  };

  const confidenceDetails = alert.includeConfidenceIntervals === 1 ? getConfidenceDetails() : null;
  const qualityColor = getQualityColor(peakQualityScore);

  // Email HTML - Brutalist Card Design
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto;">

        <!-- Header -->
        <div style="background: #FFFFFF; border: 4px solid #000000; padding: 24px; margin-bottom: 8px;">
            <div style="font-size: 32px; font-weight: 900; color: #000000; text-align: center;">
                🏄 NYC SURF CO.
            </div>
        </div>

        <!-- Alert Type Banner -->
        <div style="background: #FFD700; border: 4px solid #000000; padding: 16px; margin-bottom: 8px;">
            <div style="font-size: 14px; font-weight: 700; color: #000000; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                ⚡ SWELL ALERT
            </div>
        </div>

        <!-- Location -->
        <div style="background: #FFFFFF; border: 4px solid #000000; padding: 24px; margin-bottom: 8px;">
            <div style="font-size: 28px; font-weight: 900; color: #000000;">
                ${spot.name.toUpperCase()}
            </div>
        </div>

        <!-- Main Stats Grid -->
        <table style="width: 100%; margin-bottom: 8px; border-collapse: collapse;">
            <tr>
                <td style="width: 50%; padding-right: 4px;">
                    <div style="background: #FFFFFF; border: 4px solid #000000; padding: 20px;">
                        <div style="font-size: 12px; font-weight: 700; color: #666666; text-transform: uppercase; margin-bottom: 4px;">Wave Height</div>
                        <div style="font-size: 36px; font-weight: 900; color: #000000; line-height: 1;">${peakWaveHeightFt.toFixed(1)}ft</div>
                    </div>
                </td>
                <td style="width: 50%; padding-left: 4px;">
                    <div style="background: #FFFFFF; border: 4px solid #000000; padding: 20px;">
                        <div style="font-size: 12px; font-weight: 700; color: #666666; text-transform: uppercase; margin-bottom: 4px;">Period</div>
                        <div style="font-size: 36px; font-weight: 900; color: #000000; line-height: 1;">${avgPeriodSec}s</div>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Quality Score -->
        <div style="background: ${qualityColor}; border: 4px solid #000000; padding: 24px; margin-bottom: 8px;">
            <div style="font-size: 14px; font-weight: 700; color: #000000; text-transform: uppercase; margin-bottom: 8px;">Quality Score</div>
            <div style="font-size: 56px; font-weight: 900; color: #000000; line-height: 1;">${peakQualityScore}<span style="font-size: 28px; opacity: 0.5;">/100</span></div>
        </div>

        <!-- Timing -->
        <div style="background: #FFFFFF; border: 4px solid #000000; padding: 20px; margin-bottom: 8px;">
            <table style="width: 100%; margin-bottom: 12px;">
                <tr>
                    <td style="font-size: 12px; font-weight: 700; color: #666666; text-transform: uppercase; width: 60px;">Start</td>
                    <td style="font-size: 16px; font-weight: 700; color: #000000;">${dateStr}</td>
                </tr>
            </table>
            <table style="width: 100%; margin-bottom: 12px;">
                <tr>
                    <td style="font-size: 12px; font-weight: 700; color: #666666; text-transform: uppercase; width: 60px;">End</td>
                    <td style="font-size: 16px; font-weight: 700; color: #000000;">${endDateStr}</td>
                </tr>
            </table>
            <div style="border-top: 2px solid #000000; padding-top: 12px; margin-top: 12px;">
                <div style="font-size: 12px; font-weight: 700; color: #666666; text-transform: uppercase; margin-bottom: 4px;">Duration</div>
                <div style="font-size: 20px; font-weight: 900; color: #000000;">${durationText.toUpperCase()}</div>
            </div>
        </div>

        ${confidenceDetails ? `
        <!-- Confidence Indicator -->
        <div style="background: #E3F2FD; border: 4px solid #000000; padding: 20px; margin-bottom: 8px;">
            <table style="width: 100%; margin-bottom: 12px;">
                <tr>
                    <td style="width: 40px; vertical-align: top; font-size: 24px;">🎯</td>
                    <td style="vertical-align: top;">
                        <div style="font-size: 12px; font-weight: 700; color: #1976D2; text-transform: uppercase;">Confidence Level</div>
                        <div style="font-size: 18px; font-weight: 900; color: #000000;">${confidenceDetails.level}</div>
                    </td>
                </tr>
            </table>
            <div style="font-size: 13px; color: #000000; line-height: 1.5;">
                ${confidenceDetails.description}
            </div>
        </div>
        ` : ""}

        ${explanation ? `
        <!-- Explanation -->
        <div style="background: #F0F4F8; border: 4px solid #000000; padding: 20px; margin-bottom: 8px;">
            <div style="font-size: 13px; color: #000000; line-height: 1.5;">
                ${explanation}
            </div>
        </div>
        ` : ""}

        <!-- CTA Button -->
        <div style="background: #FFFFFF; border: 4px solid #000000; padding: 24px; text-align: center;">
            <a href="${process.env.APP_URL || "https://nycsurfco.com"}/spots/${spot.id}" style="display: inline-block; background: #000000; color: #FFFFFF; font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; padding: 16px 32px; text-decoration: none; border: 4px solid #000000;">
                VIEW FULL FORECAST →
            </a>
        </div>

        <!-- Footer -->
        <div style="padding: 20px; text-align: center;">
            <div style="font-size: 12px; color: #666666; margin-bottom: 8px;">
                NYC Surf Co. | Hyper-local forecasting for NYC Surfers
            </div>
            <a href="${process.env.APP_URL || "https://nycsurfco.com"}/dashboard" style="font-size: 12px; color: #888888; text-decoration: underline;">
                Manage Your Alerts
            </a>
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

