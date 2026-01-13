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

  // Email HTML - NYC Grit Design
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto;">

        <!-- Header -->
        <div style="background: #000000; border: 3px solid #333333; padding: 28px; margin-bottom: 4px;">
            <div style="font-size: 28px; font-weight: 900; color: #FFFFFF; text-align: center; letter-spacing: 2px;">
                NYC SURF CO.
            </div>
        </div>

        <!-- Alert Type Banner -->
        <div style="background: #2a2a2a; border-left: 4px solid #FFFFFF; padding: 14px 20px; margin-bottom: 4px;">
            <div style="font-size: 11px; font-weight: 700; color: #FFFFFF; text-transform: uppercase; letter-spacing: 3px;">
                SWELL ALERT
            </div>
        </div>

        <!-- Location -->
        <div style="background: #000000; border: 3px solid #333333; padding: 24px; margin-bottom: 4px;">
            <div style="font-size: 11px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Location</div>
            <div style="font-size: 26px; font-weight: 900; color: #FFFFFF; letter-spacing: 1px;">
                ${spot.name.toUpperCase()}
            </div>
        </div>

        <!-- Main Stats Grid -->
        <table style="width: 100%; margin-bottom: 4px; border-collapse: collapse;">
            <tr>
                <td style="width: 50%; padding-right: 2px;">
                    <div style="background: #000000; border: 3px solid #333333; padding: 20px;">
                        <div style="font-size: 10px; font-weight: 700; color: #666666; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Wave Height</div>
                        <div style="font-size: 42px; font-weight: 900; color: #FFFFFF; line-height: 1;">${peakWaveHeightFt.toFixed(1)}<span style="font-size: 20px; color: #666666;">ft</span></div>
                    </div>
                </td>
                <td style="width: 50%; padding-left: 2px;">
                    <div style="background: #000000; border: 3px solid #333333; padding: 20px;">
                        <div style="font-size: 10px; font-weight: 700; color: #666666; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Period</div>
                        <div style="font-size: 42px; font-weight: 900; color: #FFFFFF; line-height: 1;">${avgPeriodSec}<span style="font-size: 20px; color: #666666;">s</span></div>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Quality Score -->
        <div style="background: #000000; border: 3px solid #333333; padding: 24px; margin-bottom: 4px;">
            <div style="font-size: 10px; font-weight: 700; color: #666666; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Quality Score</div>
            <div style="font-size: 64px; font-weight: 900; color: #FFFFFF; line-height: 1;">${peakQualityScore}<span style="font-size: 24px; color: #444444;">/100</span></div>
        </div>

        <!-- Timing -->
        <div style="background: #000000; border: 3px solid #333333; padding: 20px; margin-bottom: 4px;">
            <table style="width: 100%; margin-bottom: 14px;">
                <tr>
                    <td style="font-size: 10px; font-weight: 700; color: #666666; text-transform: uppercase; letter-spacing: 2px; width: 70px; vertical-align: top; padding-top: 2px;">Start</td>
                    <td style="font-size: 15px; font-weight: 600; color: #FFFFFF;">${dateStr}</td>
                </tr>
            </table>
            <table style="width: 100%; margin-bottom: 14px;">
                <tr>
                    <td style="font-size: 10px; font-weight: 700; color: #666666; text-transform: uppercase; letter-spacing: 2px; width: 70px; vertical-align: top; padding-top: 2px;">End</td>
                    <td style="font-size: 15px; font-weight: 600; color: #FFFFFF;">${endDateStr}</td>
                </tr>
            </table>
            <div style="border-top: 1px solid #333333; padding-top: 14px;">
                <table style="width: 100%;">
                    <tr>
                        <td style="font-size: 10px; font-weight: 700; color: #666666; text-transform: uppercase; letter-spacing: 2px; width: 70px; vertical-align: top; padding-top: 2px;">Duration</td>
                        <td style="font-size: 18px; font-weight: 900; color: #FFFFFF;">${durationText.toUpperCase()}</td>
                    </tr>
                </table>
            </div>
        </div>

        ${confidenceDetails ? `
        <!-- Confidence Indicator -->
        <div style="background: #0a0a0a; border: 3px solid #333333; padding: 20px; margin-bottom: 4px;">
            <div style="font-size: 10px; font-weight: 700; color: #666666; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">Confidence</div>
            <div style="font-size: 20px; font-weight: 900; color: #FFFFFF; margin-bottom: 10px;">${confidenceDetails.level}</div>
            <div style="font-size: 13px; color: #888888; line-height: 1.5;">
                ${confidenceDetails.description}
            </div>
        </div>
        ` : ""}

        ${explanation ? `
        <!-- Explanation -->
        <div style="background: #0a0a0a; border: 3px solid #333333; padding: 20px; margin-bottom: 4px;">
            <div style="font-size: 13px; color: #888888; line-height: 1.5;">
                ${explanation}
            </div>
        </div>
        ` : ""}

        <!-- CTA Button -->
        <div style="padding: 24px 0; text-align: center;">
            <a href="${process.env.APP_URL || "https://nycsurfco.com"}/spots/${spot.id}" style="display: inline-block; background: #FFFFFF; color: #000000; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; padding: 16px 40px; text-decoration: none;">
                VIEW FORECAST
            </a>
        </div>

        <!-- Footer -->
        <div style="padding: 20px; text-align: center; border-top: 1px solid #333333;">
            <div style="font-size: 11px; color: #555555; margin-bottom: 8px; letter-spacing: 1px;">
                NYC SURF CO.
            </div>
            <a href="${process.env.APP_URL || "https://nycsurfco.com"}/dashboard" style="font-size: 11px; color: #444444; text-decoration: none;">
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

