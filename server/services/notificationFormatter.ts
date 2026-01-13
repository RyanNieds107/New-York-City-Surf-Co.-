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
  const waveHeightRange = `${waveHeight}-${waveHeight + 1}ft`;

  // Short date for subject line (e.g., "Jan 14")
  const subjectDateStr = swellStartTime.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  // Subject line - brutalist format
  const subject = `SWELL ALERT: ${spot.name} | ${waveHeightRange} ${qualityLabel} | ${subjectDateStr}`;

  // Preview text - dynamic based on conditions
  const getConfidencePhrase = (): string => {
    const hoursUntilSwell = (swellStartTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilSwell <= 24) return "Conditions are imminent.";
    if (hoursUntilSwell <= 72) return "Forecast is looking solid.";
    return "Tracking a promising swell.";
  };

  const getQualityPhrase = (score: number): string => {
    if (score >= 80) return "Excellent";
    if (score >= 70) return "Great";
    if (score >= 60) return "Good";
    return "Decent";
  };

  const previewText = `${getConfidencePhrase()} ${getQualityPhrase(peakQualityScore)} swell direction, ${avgPeriodSec}s period, and favorable wind setup.`;

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

  // Email HTML - Brutalist NYC grit aesthetic
  const surflineRating = getSurflineRating(peakQualityScore);
  const magicSeaweedStars = getMagicSeaweedStars(peakQualityScore);

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: 'Arial Black', Gadget, sans-serif;">
    <!-- Preview text (preheader) -->
    <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
        ${previewText}
    </div>
    <!-- Spacer to push hidden content -->
    <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    </div>
    <!-- Outer wrapper - 100% width -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a;">
        <tr>
            <td align="center">
                <!-- Inner container - max 600px -->
                <table width="600" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 3px solid #000000;">

                    <!-- Header -->
                    <tr>
                        <td style="padding: 24px; background-color: #000000;">
                            <table border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="font-family: 'Arial Black', Gadget, sans-serif; font-size: 28px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 3px;">
                                        SWELL ALERT
                                    </td>
                                </tr>
                                <tr><td height="8"></td></tr>
                                <tr>
                                    <td style="font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1px;">
                                        NYC SURF CO. // CONDITIONS FIRING
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Spacer -->
                    <tr><td height="20"></td></tr>

                    <!-- Section 01: Spot (tight inline container) -->
                    <tr>
                        <td style="padding: 0 24px;">
                            <table border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">
                                        01 // SPOT
                                    </td>
                                </tr>
                                <tr><td height="8"></td></tr>
                                <tr>
                                    <td>
                                        <table border="0" cellpadding="0" cellspacing="0" style="border: 3px solid #000000; background-color: #000000;">
                                            <tr>
                                                <td style="padding: 10px 20px; font-family: 'Arial Black', Gadget, sans-serif; font-size: 14px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px;">
                                                    ${spot.name.toUpperCase()}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Spacer -->
                    <tr><td height="24"></td></tr>

                    <!-- Section 02: Conditions -->
                    <tr>
                        <td style="padding: 0 24px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">
                                        02 // CONDITIONS
                                    </td>
                                </tr>
                                <tr><td height="12"></td></tr>
                                <tr>
                                    <td>
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td width="48%" valign="top">
                                                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 3px solid #000000;">
                                                        <tr>
                                                            <td style="padding: 16px;">
                                                                <table border="0" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td style="font-family: 'Courier New', Courier, monospace; font-size: 9px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">
                                                                            WAVE HEIGHT
                                                                        </td>
                                                                    </tr>
                                                                    <tr><td height="6"></td></tr>
                                                                    <tr>
                                                                        <td style="font-family: 'Arial Black', Gadget, sans-serif; font-size: 36px; font-weight: 900; color: #000000; line-height: 1;">
                                                                            ${peakWaveHeightFt.toFixed(1)}<span style="font-size: 16px;">FT</span>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <td width="4%"></td>
                                                <td width="48%" valign="top">
                                                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 3px solid #000000;">
                                                        <tr>
                                                            <td style="padding: 16px;">
                                                                <table border="0" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td style="font-family: 'Courier New', Courier, monospace; font-size: 9px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">
                                                                            PERIOD
                                                                        </td>
                                                                    </tr>
                                                                    <tr><td height="6"></td></tr>
                                                                    <tr>
                                                                        <td style="font-family: 'Arial Black', Gadget, sans-serif; font-size: 36px; font-weight: 900; color: #000000; line-height: 1;">
                                                                            ${avgPeriodSec}<span style="font-size: 16px;">S</span>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Spacer -->
                    <tr><td height="24"></td></tr>

                    <!-- Section 03: Quality Score -->
                    <tr>
                        <td style="padding: 0 24px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">
                                        03 // QUALITY SCORE
                                    </td>
                                </tr>
                                <tr><td height="12"></td></tr>
                                <tr>
                                    <td>
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 3px solid #000000;">
                                            <tr>
                                                <td style="padding: 20px;">
                                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                        <tr>
                                                            <td valign="bottom" style="font-family: 'Arial Black', Gadget, sans-serif; font-size: 56px; font-weight: 900; color: #000000; line-height: 1;">
                                                                ${peakQualityScore}
                                                            </td>
                                                            <td valign="bottom" align="right" style="font-family: 'Arial Black', Gadget, sans-serif; font-size: 18px; font-weight: 900; color: #000000; text-transform: uppercase; padding-bottom: 8px;">
                                                                ${qualityLabel}
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 0 20px 20px 20px;">
                                                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #e5e5e5;">
                                                        <tr>
                                                            <td width="${peakQualityScore}%" style="background-color: #000000; height: 8px;"></td>
                                                            <td width="${100 - peakQualityScore}%" style="height: 8px;"></td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Spacer -->
                    <tr><td height="24"></td></tr>

                    <!-- Section 04: Forecast Consensus -->
                    <tr>
                        <td style="padding: 0 24px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">
                                        04 // FORECAST CONSENSUS
                                    </td>
                                </tr>
                                <tr><td height="12"></td></tr>
                                <tr>
                                    <td>
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 3px solid #000000;">
                                            <tr>
                                                <td style="padding: 12px 16px; border-bottom: 2px solid #000000; font-family: 'Arial Black', Gadget, sans-serif; font-size: 12px; color: #000000; text-transform: uppercase;">
                                                    NYC SURF CO.
                                                </td>
                                                <td align="right" style="padding: 12px 16px; border-bottom: 2px solid #000000; font-family: 'Courier New', Courier, monospace; font-size: 14px; font-weight: bold; color: #000000;">
                                                    ${peakQualityScore}/100
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 16px; border-bottom: 2px solid #000000; font-family: 'Arial Black', Gadget, sans-serif; font-size: 12px; color: #000000; text-transform: uppercase;">
                                                    SURFLINE
                                                </td>
                                                <td align="right" style="padding: 12px 16px; border-bottom: 2px solid #000000; font-family: 'Courier New', Courier, monospace; font-size: 14px; font-weight: bold; color: #000000;">
                                                    ${surflineRating}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 16px; font-family: 'Arial Black', Gadget, sans-serif; font-size: 12px; color: #000000; text-transform: uppercase;">
                                                    MAGIC SEAWEED
                                                </td>
                                                <td align="right" style="padding: 12px 16px; font-family: 'Courier New', Courier, monospace; font-size: 14px; font-weight: bold; color: #000000;">
                                                    ${magicSeaweedStars}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Spacer -->
                    <tr><td height="24"></td></tr>

                    <!-- Section 05: Swell Source -->
                    <tr>
                        <td style="padding: 0 24px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">
                                        05 // SWELL SOURCE
                                    </td>
                                </tr>
                                <tr><td height="12"></td></tr>
                                <tr>
                                    <td>
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 3px solid #000000; background-color: #FFF9C4;">
                                            <tr>
                                                <td style="padding: 16px;">
                                                    <table border="0" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="font-family: 'Arial Black', Gadget, sans-serif; font-size: 14px; font-weight: 900; color: #000000; text-transform: uppercase;">
                                                                ${avgPeriodSec >= 12 ? "GROUNDSWELL" : avgPeriodSec >= 8 ? "MIXED SWELL" : "WINDSWELL"}
                                                            </td>
                                                        </tr>
                                                        <tr><td height="8"></td></tr>
                                                        <tr>
                                                            <td style="font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #333333; line-height: 1.5;">
                                                                ${avgPeriodSec >= 12
                                                                  ? "Long-period swell from a distant storm. Expect clean, organized waves with good power."
                                                                  : avgPeriodSec >= 8
                                                                    ? "Mixed energy from multiple sources. Conditions may be variable but surfable."
                                                                    : "Short-period wind swell. Waves may be choppy but can still offer fun sessions."}
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Spacer -->
                    <tr><td height="24"></td></tr>

                    <!-- Section 06: Timing -->
                    <tr>
                        <td style="padding: 0 24px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">
                                        06 // FORECAST WINDOW
                                    </td>
                                </tr>
                                <tr><td height="12"></td></tr>
                                <tr>
                                    <td>
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 3px solid #000000;">
                                            <tr>
                                                <td style="padding: 12px 16px; border-bottom: 2px solid #000000;">
                                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                        <tr>
                                                            <td style="font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #666666; text-transform: uppercase;">START</td>
                                                            <td align="right" style="font-family: 'Arial Black', Gadget, sans-serif; font-size: 13px; color: #000000;">${dateStr}</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 16px; border-bottom: 2px solid #000000;">
                                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                        <tr>
                                                            <td style="font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #666666; text-transform: uppercase;">END</td>
                                                            <td align="right" style="font-family: 'Arial Black', Gadget, sans-serif; font-size: 13px; color: #000000;">${endDateStr}</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 16px;">
                                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                        <tr>
                                                            <td style="font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #666666; text-transform: uppercase;">DURATION</td>
                                                            <td align="right" style="font-family: 'Arial Black', Gadget, sans-serif; font-size: 13px; font-weight: 900; color: #000000;">${durationText.toUpperCase()}</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    ${confidenceDetails ? `
                    <!-- Spacer -->
                    <tr><td height="24"></td></tr>

                    <!-- Section 07: Confidence -->
                    <tr>
                        <td style="padding: 0 24px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">
                                        07 // CONFIDENCE
                                    </td>
                                </tr>
                                <tr><td height="12"></td></tr>
                                <tr>
                                    <td>
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 3px solid #000000;">
                                            <tr>
                                                <td style="padding: 16px;">
                                                    <table border="0" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="font-family: 'Arial Black', Gadget, sans-serif; font-size: 18px; font-weight: 900; color: #000000; text-transform: uppercase;">
                                                                ${confidenceDetails.level}
                                                            </td>
                                                        </tr>
                                                        <tr><td height="8"></td></tr>
                                                        <tr>
                                                            <td style="font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #333333; line-height: 1.5;">
                                                                ${confidenceDetails.description}
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    ` : ""}

                    <!-- Spacer -->
                    <tr><td height="32"></td></tr>

                    <!-- CTA Button -->
                    <tr>
                        <td style="padding: 0 24px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <a href="${process.env.APP_URL || "https://nycsurfco.com"}/spot/${spot.id}" style="display: inline-block; background-color: #000000; border: 3px solid #000000; color: #ffffff; font-family: 'Arial Black', Gadget, sans-serif; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; padding: 16px 32px; text-decoration: none;">
                                            VIEW FULL FORECAST &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Spacer -->
                    <tr><td height="32"></td></tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px; background-color: #000000; border-top: 3px solid #000000;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #888888; text-transform: uppercase; letter-spacing: 1px;">
                                        NYC SURF CO. // HYPER-LOCAL FORECASTING
                                    </td>
                                </tr>
                                <tr><td height="12"></td></tr>
                                <tr>
                                    <td align="center">
                                        <a href="${process.env.APP_URL || "https://nycsurfco.com"}/dashboard" style="font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #666666; text-decoration: underline;">
                                            MANAGE YOUR ALERTS
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
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

