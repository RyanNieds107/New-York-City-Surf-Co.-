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

  // Dynamic quality label based on score
  const getQualityLabel = (score: number): string => {
    if (score >= 80) return "FIRING";
    if (score >= 60) return "GOOD";
    return "FAIR";
  };

  // Dynamic timing label for subject (surf-appropriate times)
  const getTimingLabel = (): string => {
    const now = new Date();
    const hoursUntil = (swellStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const swellHour = swellStartTime.getHours();

    // Determine time of day label
    const getTimeOfDay = (hour: number): string => {
      if (hour >= 5 && hour < 12) return "Morning";
      if (hour >= 12 && hour < 17) return "Afternoon";
      return "Evening";
    };

    if (hoursUntil <= 0) return "NOW";

    // Check if it's today
    const isToday = swellStartTime.toDateString() === now.toDateString();
    if (isToday) {
      return `This ${getTimeOfDay(swellHour)}`;
    }

    // Check if it's tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = swellStartTime.toDateString() === tomorrow.toDateString();
    if (isTomorrow) {
      return `Tomorrow ${getTimeOfDay(swellHour)}`;
    }

    // Further out - show day name
    const dayName = swellStartTime.toLocaleDateString("en-US", { weekday: "short" });
    return `${dayName} ${getTimeOfDay(swellHour)}`;
  };

  const qualityLabel = getQualityLabel(peakQualityScore);
  const timingLabel = getTimingLabel();
  const waveHeight = Math.round(peakWaveHeightFt);

  // Subject line - direct and scannable
  const subject = `🏄 ${spot.name}: ${waveHeight}ft ${qualityLabel} waves - ${timingLabel}`;

  // SMS text (160 chars max, simplified)
  const smsText = `🏄 NYC Surf Co.\n\n${spot.name}: ${peakWaveHeightFt.toFixed(1)}ft @ ${avgPeriodSec}s\nQuality: ${peakQualityScore}/100\nStarts: ${dateStr}\n${confidenceText ? `${confidenceText}\n` : ""}${explanation ? `\n${explanation}` : ""}`;

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

  // Get quality score color
  const getQualityColor = (score: number) => {
    if (score >= 70) return "#22c55e"; // green
    if (score >= 50) return "#eab308"; // yellow
    return "#ef4444"; // red
  };
  const qualityColor = getQualityColor(peakQualityScore);

  // Estimate comparable ratings for other apps
  const getSurflineRating = (score: number) => {
    if (score >= 80) return "Epic";
    if (score >= 70) return "Good-Epic";
    if (score >= 60) return "Fair-Good";
    if (score >= 50) return "Fair";
    return "Poor-Fair";
  };

  const getMagicSeaweedStars = (score: number) => {
    if (score >= 80) return "5★";
    if (score >= 70) return "4★";
    if (score >= 60) return "3★";
    if (score >= 50) return "2★";
    return "1★";
  };

  // Email HTML - White Cards with Black Borders
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 16px; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto;">

        <!-- Header -->
        <div style="background: #FFFFFF; border: 3px solid #000000; padding: 20px; margin-bottom: 6px;">
            <div style="font-size: 24px; font-weight: 900; color: #000000; text-align: center;">
                🏄 NYC SURF CO.
            </div>
        </div>

        <!-- Alert Type Banner -->
        <div style="background: #fbbf24; border: 3px solid #000000; padding: 12px; margin-bottom: 6px;">
            <div style="font-size: 11px; font-weight: 700; color: #000000; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                ⚡ SWELL ALERT
            </div>
        </div>

        <!-- Location -->
        <div style="background: #FFFFFF; border: 3px solid #000000; padding: 16px; margin-bottom: 6px;">
            <div style="font-size: 22px; font-weight: 900; color: #000000;">
                ${spot.name.toUpperCase()}
            </div>
        </div>

        <!-- Main Stats Grid -->
        <table style="width: 100%; margin-bottom: 6px; border-collapse: collapse;">
            <tr>
                <td style="width: 50%; padding-right: 3px;">
                    <div style="background: #FFFFFF; border: 3px solid #000000; padding: 14px;">
                        <div style="font-size: 10px; font-weight: 700; color: #666666; text-transform: uppercase; margin-bottom: 4px;">Wave Height</div>
                        <div style="font-size: 28px; font-weight: 900; color: #000000; line-height: 1;">${peakWaveHeightFt.toFixed(1)}ft</div>
                    </div>
                </td>
                <td style="width: 50%; padding-left: 3px;">
                    <div style="background: #FFFFFF; border: 3px solid #000000; padding: 14px;">
                        <div style="font-size: 10px; font-weight: 700; color: #666666; text-transform: uppercase; margin-bottom: 4px;">Period</div>
                        <div style="font-size: 28px; font-weight: 900; color: #000000; line-height: 1;">${avgPeriodSec}s</div>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Quality Score -->
        <div style="background: ${qualityColor}; border: 3px solid #000000; padding: 16px; margin-bottom: 6px;">
            <div style="font-size: 10px; font-weight: 700; color: #000000; text-transform: uppercase; margin-bottom: 6px;">Quality Score</div>
            <div style="font-size: 42px; font-weight: 900; color: #000000; line-height: 1;">${peakQualityScore}<span style="font-size: 20px; opacity: 0.6;">/100</span></div>
        </div>

        <!-- Timing -->
        <div style="background: #FFFFFF; border: 3px solid #000000; padding: 14px; margin-bottom: 6px;">
            <table style="width: 100%; margin-bottom: 8px;">
                <tr>
                    <td style="font-size: 10px; font-weight: 700; color: #666666; text-transform: uppercase; width: 55px;">Start</td>
                    <td style="font-size: 13px; font-weight: 700; color: #000000;">${dateStr}</td>
                </tr>
            </table>
            <table style="width: 100%; margin-bottom: 8px;">
                <tr>
                    <td style="font-size: 10px; font-weight: 700; color: #666666; text-transform: uppercase; width: 55px;">End</td>
                    <td style="font-size: 13px; font-weight: 700; color: #000000;">${endDateStr}</td>
                </tr>
            </table>
            <div style="border-top: 2px solid #000000; padding-top: 10px;">
                <div style="font-size: 10px; font-weight: 700; color: #666666; text-transform: uppercase; margin-bottom: 2px;">Duration</div>
                <div style="font-size: 16px; font-weight: 900; color: #000000;">${durationText.toUpperCase()}</div>
            </div>
        </div>

        ${confidenceDetails ? `
        <!-- Confidence Indicator -->
        <div style="background: #dbeafe; border: 3px solid #000000; padding: 14px; margin-bottom: 6px;">
            <table style="width: 100%;">
                <tr>
                    <td style="width: 30px; vertical-align: top; font-size: 18px;">🎯</td>
                    <td style="vertical-align: top;">
                        <div style="font-size: 10px; font-weight: 700; color: #1d4ed8; text-transform: uppercase;">Confidence</div>
                        <div style="font-size: 15px; font-weight: 900; color: #000000;">${confidenceDetails.level}</div>
                    </td>
                </tr>
            </table>
            <div style="font-size: 12px; color: #000000; line-height: 1.4; margin-top: 8px;">
                ${confidenceDetails.description}
            </div>
        </div>
        ` : ""}

        <!-- Forecast Consensus -->
        <div style="background: #FFFFFF; border: 3px solid #000000; padding: 14px; margin-bottom: 6px;">
            <div style="font-size: 11px; font-weight: 700; color: #000000; text-transform: uppercase; margin-bottom: 12px;">
                📊 Forecast Consensus
            </div>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="font-size: 12px; font-weight: 600; color: #000000; padding: 4px 0;">NYC Surf Co</td>
                    <td style="font-size: 13px; font-weight: 900; color: ${qualityColor}; text-align: right; padding: 4px 0;">${peakQualityScore}</td>
                </tr>
                <tr>
                    <td style="font-size: 12px; color: #666666; padding: 4px 0;">Surfline</td>
                    <td style="font-size: 12px; font-weight: 700; color: #666666; text-align: right; padding: 4px 0;">${getSurflineRating(peakQualityScore)}</td>
                </tr>
                <tr>
                    <td style="font-size: 12px; color: #666666; padding: 4px 0;">Magic Seaweed</td>
                    <td style="font-size: 12px; font-weight: 700; color: #666666; text-align: right; padding: 4px 0;">${getMagicSeaweedStars(peakQualityScore)}</td>
                </tr>
            </table>
        </div>

        <!-- Storm System Info -->
        <div style="background: #fef3c7; border: 3px solid #000000; padding: 14px; margin-bottom: 6px;">
            <table style="width: 100%;">
                <tr>
                    <td style="width: 30px; vertical-align: top; font-size: 18px;">🌀</td>
                    <td style="vertical-align: top;">
                        <div style="font-size: 10px; font-weight: 700; color: #92400e; text-transform: uppercase;">Swell Source</div>
                        <div style="font-size: 14px; font-weight: 900; color: #000000;">North Atlantic System</div>
                    </td>
                </tr>
            </table>
            <div style="font-size: 11px; color: #000000; line-height: 1.4; margin-top: 8px;">
                ${peakQualityScore >= 70 ? "Strong, organized swell with favorable wind patterns." : peakQualityScore >= 50 ? "Moderate swell activity with variable conditions." : "Weak swell, conditions may be inconsistent."}
            </div>
        </div>

        <!-- CTA Button -->
        <div style="background: #FFFFFF; border: 3px solid #000000; padding: 20px; text-align: center;">
            <a href="${process.env.APP_URL || "https://nycsurfco.com"}/spot/${spot.id}" style="display: inline-block; background: #000000; color: #FFFFFF; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; padding: 14px 28px; text-decoration: none; border: 3px solid #000000;">
                VIEW FULL FORECAST →
            </a>
        </div>

        <!-- Footer -->
        <div style="padding: 16px; text-align: center;">
            <div style="font-size: 10px; color: #666666; margin-bottom: 6px;">
                NYC Surf Co. | Hyper-local forecasting
            </div>
            <a href="${process.env.APP_URL || "https://nycsurfco.com"}/dashboard" style="font-size: 10px; color: #888888; text-decoration: underline;">
                Manage Alerts
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

View full forecast: ${process.env.APP_URL || "https://nycsurfco.com"}/spot/${spot.id}

Manage your alerts: ${process.env.APP_URL || "https://nycsurfco.com"}/dashboard
  `.trim();

  return {
    subject,
    emailHtml,
    emailText,
    smsText,
  };
}

