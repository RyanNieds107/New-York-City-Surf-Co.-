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

  // Email HTML - Clean minimal design matching app aesthetic
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-left: 1px solid #e5e5e5; border-right: 1px solid #e5e5e5;">

        <!-- Header -->
        <div style="padding: 32px 24px 24px 24px; border-bottom: 1px solid #e5e5e5;">
            <div style="font-size: 32px; font-weight: 900; color: #000000; font-style: italic; letter-spacing: -1px;">
                SWELL ALERT
            </div>
            <div style="font-size: 11px; font-weight: 500; color: #666666; text-transform: uppercase; letter-spacing: 2px; margin-top: 8px;">
                Get notified when conditions are firing
            </div>
        </div>

        <!-- Section 01: Location -->
        <div style="padding: 24px; border-bottom: 1px solid #e5e5e5;">
            <div style="font-size: 11px; font-weight: 500; color: #666666; margin-bottom: 4px;">01</div>
            <div style="font-size: 14px; font-weight: 900; color: #000000; font-style: italic; margin-bottom: 12px;">SPOT</div>
            <div style="background: #000000; color: #ffffff; padding: 20px; text-align: center;">
                <div style="font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
                    ${spot.name.toUpperCase()}
                </div>
            </div>
        </div>

        <!-- Section 02: Conditions -->
        <div style="padding: 24px; border-bottom: 1px solid #e5e5e5;">
            <div style="font-size: 11px; font-weight: 500; color: #666666; margin-bottom: 4px;">02</div>
            <div style="font-size: 14px; font-weight: 900; color: #000000; font-style: italic; margin-bottom: 16px;">CONDITIONS</div>

            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 50%; padding-right: 12px; vertical-align: top;">
                        <div style="border: 1px solid #e5e5e5; padding: 16px;">
                            <div style="font-size: 10px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Wave Height</div>
                            <div style="font-size: 32px; font-weight: 900; color: #000000; line-height: 1;">${peakWaveHeightFt.toFixed(1)}<span style="font-size: 16px; font-weight: 600;">ft</span></div>
                        </div>
                    </td>
                    <td style="width: 50%; padding-left: 12px; vertical-align: top;">
                        <div style="border: 1px solid #e5e5e5; padding: 16px;">
                            <div style="font-size: 10px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Period</div>
                            <div style="font-size: 32px; font-weight: 900; color: #000000; line-height: 1;">${avgPeriodSec}<span style="font-size: 16px; font-weight: 600;">s</span></div>
                        </div>
                    </td>
                </tr>
            </table>
        </div>

        <!-- Section 03: Quality -->
        <div style="padding: 24px; border-bottom: 1px solid #e5e5e5;">
            <div style="font-size: 11px; font-weight: 500; color: #666666; margin-bottom: 4px;">03</div>
            <div style="font-size: 14px; font-weight: 900; color: #000000; font-style: italic; margin-bottom: 16px;">QUALITY SCORE</div>

            <table style="width: 100%;">
                <tr>
                    <td style="vertical-align: bottom;">
                        <div style="font-size: 64px; font-weight: 900; color: #000000; line-height: 1;">${peakQualityScore}<span style="font-size: 20px; color: #999999;">+</span></div>
                    </td>
                    <td style="text-align: right; vertical-align: bottom; padding-bottom: 8px;">
                        <div style="font-size: 12px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 1px;">${qualityLabel}</div>
                    </td>
                </tr>
            </table>

            <!-- Quality Bar -->
            <div style="margin-top: 16px; height: 8px; background: linear-gradient(to right, #f59e0b, #22c55e, #06b6d4); border-radius: 4px; position: relative;">
            </div>
            <table style="width: 100%; margin-top: 4px;">
                <tr>
                    <td style="font-size: 10px; color: #999999;">50</td>
                    <td style="font-size: 10px; color: #999999; text-align: right;">95</td>
                </tr>
            </table>
        </div>

        <!-- Section 04: Timing -->
        <div style="padding: 24px; border-bottom: 1px solid #e5e5e5;">
            <div style="font-size: 11px; font-weight: 500; color: #666666; margin-bottom: 4px;">04</div>
            <div style="font-size: 14px; font-weight: 900; color: #000000; font-style: italic; margin-bottom: 16px;">FORECAST WINDOW</div>

            <table style="width: 100%; margin-bottom: 12px;">
                <tr>
                    <td style="font-size: 11px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 1px; width: 70px;">Start</td>
                    <td style="font-size: 14px; font-weight: 600; color: #000000;">${dateStr}</td>
                </tr>
            </table>
            <table style="width: 100%; margin-bottom: 12px;">
                <tr>
                    <td style="font-size: 11px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 1px; width: 70px;">End</td>
                    <td style="font-size: 14px; font-weight: 600; color: #000000;">${endDateStr}</td>
                </tr>
            </table>
            <table style="width: 100%;">
                <tr>
                    <td style="font-size: 11px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 1px; width: 70px;">Duration</td>
                    <td style="font-size: 14px; font-weight: 900; color: #000000;">${durationText.toUpperCase()}</td>
                </tr>
            </table>
        </div>

        ${confidenceDetails ? `
        <!-- Section 05: Confidence -->
        <div style="padding: 24px; border-bottom: 1px solid #e5e5e5;">
            <div style="font-size: 11px; font-weight: 500; color: #666666; margin-bottom: 4px;">05</div>
            <div style="font-size: 14px; font-weight: 900; color: #000000; font-style: italic; margin-bottom: 16px;">CONFIDENCE</div>
            <div style="font-size: 18px; font-weight: 900; color: #000000; margin-bottom: 8px;">${confidenceDetails.level}</div>
            <div style="font-size: 13px; color: #666666; line-height: 1.5;">
                ${confidenceDetails.description}
            </div>
        </div>
        ` : ""}

        <!-- CTA Button -->
        <div style="padding: 32px 24px;">
            <a href="${process.env.APP_URL || "https://nycsurfco.com"}/spot/${spot.id}" style="display: block; background: #000000; color: #ffffff; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; padding: 18px 24px; text-decoration: none; text-align: center;">
                VIEW FULL FORECAST
            </a>
        </div>

        <!-- Footer -->
        <div style="padding: 24px; border-top: 1px solid #e5e5e5; text-align: center;">
            <div style="font-size: 11px; color: #999999; margin-bottom: 8px;">
                NYC SURF CO. | Hyper-local forecasting for NYC surfers
            </div>
            <a href="${process.env.APP_URL || "https://nycsurfco.com"}/dashboard" style="font-size: 11px; color: #666666; text-decoration: underline;">
                Manage your alerts
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

