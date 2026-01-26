import { getAllActiveSwellAlerts, getAllSpots, checkIfAlertAlreadySent, logSwellAlertSent, updateSwellAlertLogEmailSent, updateSwellAlertLogSmsSent, getUserById, updateAlertLastScore, getLastAlertNotificationTime } from "../db";
import { detectUpcomingSwells, type DetectedSwell } from "../services/swellDetection";
import { sendEmail } from "../services/email";
import { sendSMS } from "../services/sms";
import { formatSwellAlertNotification } from "../services/notificationFormatter";
import type { SwellAlert, SurfSpot } from "../../drizzle/schema";

/**
 * Checks all active swell alerts and sends notifications for matching swells.
 * This function is called periodically by the background job scheduler.
 *
 * Supports multiple notification frequencies:
 * - "threshold": Only notify when score CROSSES from below to above threshold (once per crossing)
 * - "once": Daily digest (morning summary)
 * - "twice": AM + PM updates
 * - "realtime": As forecast updates
 * - "immediate": Send immediately when conditions match
 *
 * Also supports "Best Spot Only" mode when spotId is null - ranks all spots and notifies for the best one.
 */
export async function checkSwellAlerts(): Promise<void> {
  try {
    console.log("[Swell Alerts] Starting swell alert check...");

    const alerts = await getAllActiveSwellAlerts();
    const spots = await getAllSpots();

    if (alerts.length === 0) {
      console.log("[Swell Alerts] No active alerts to check");
      return;
    }

    console.log(`[Swell Alerts] Checking ${alerts.length} active alert(s)`);

    let notificationsSent = 0;
    let errors = 0;

    for (const alert of alerts) {
      try {
        // Detect swells matching this alert's criteria
        const now = new Date();
        let detectedSwells = await detectUpcomingSwells(alert, spots, now);

        // BEST SPOT ONLY LOGIC: If spotId is null, only keep the best scoring spot
        if (alert.spotId === null && detectedSwells.length > 1) {
          detectedSwells = selectBestSpotOnly(detectedSwells);
          console.log(`[Swell Alerts] Best spot selected: ${detectedSwells[0]?.spotId}`);
        }

        for (const detectedSwell of detectedSwells) {
          // THRESHOLD LOGIC: Check if we should send based on notification frequency
          const shouldSend = await shouldSendNotification(alert, detectedSwell, spots);

          if (!shouldSend) {
            continue;
          }

          // Check if we already sent a notification for this swell (duplicate protection)
          // Skip duplicate protection for realtime/immediate - they should send every time the job runs
          const frequency = alert.notificationFrequency || "immediate";
          const skipDuplicateCheck = frequency === "realtime" || frequency === "immediate";

          if (!skipDuplicateCheck) {
            const alreadySent = await checkIfAlertAlreadySent(
              alert.id,
              detectedSwell.spotId,
              detectedSwell.swellStartTime,
              detectedSwell.swellEndTime
            );

            if (alreadySent) {
              console.log(`[Swell Alerts] Skipping duplicate for alert ${alert.id} (frequency: ${frequency})`);
              continue; // Skip if already notified for this exact swell window
            }
          }

          // Get user info for email/phone
          const user = await getUserById(alert.userId);
          const spot = spots.find((s) => s.id === detectedSwell.spotId);

          if (!user || !spot) {
            console.warn(
              `[Swell Alerts] Missing user or spot data for alert ${alert.id}`
            );
            continue;
          }

          // Format notification based on user preferences
          const notification = formatSwellAlertNotification(detectedSwell, alert, spot);

          // Log the alert (create alert log entry)
          const alertLogId = await logSwellAlertSent({
            alertId: alert.id,
            userId: alert.userId,
            spotId: detectedSwell.spotId,
            swellStartTime: detectedSwell.swellStartTime,
            swellEndTime: detectedSwell.swellEndTime,
            peakWaveHeightFt: String(detectedSwell.peakWaveHeightFt),
            peakQualityScore: detectedSwell.peakQualityScore,
            avgPeriodSec: detectedSwell.avgPeriodSec,
          });

          // Send email if enabled
          if (alert.emailEnabled === 1 && user.email) {
            const emailSent = await sendEmail({
              to: user.email,
              subject: notification.subject,
              html: notification.emailHtml,
              text: notification.emailText,
            });

            if (emailSent && alertLogId) {
              await updateSwellAlertLogEmailSent(alertLogId);
            }
          }

          // Send SMS if enabled (placeholder until Twilio is configured)
          if (alert.smsEnabled === 1 && user.phone) {
            const smsSent = await sendSMS({
              phone: user.phone,
              message: notification.smsText,
            });

            if (smsSent && alertLogId) {
              await updateSwellAlertLogSmsSent(alertLogId);
            }
          }

          // Update lastNotifiedScore for threshold tracking
          await updateAlertLastScore(alert.id, detectedSwell.peakQualityScore);

          notificationsSent++;
          console.log(
            `[Swell Alerts] ✓ Sent notification for alert ${alert.id} (${spot.name}) - Score: ${detectedSwell.peakQualityScore}`
          );
        }
      } catch (error) {
        errors++;
        console.error(`[Swell Alerts] ✗ Error checking alert ${alert.id}:`, error);
      }
    }

    console.log(
      `[Swell Alerts] Completed: ${notificationsSent} notification(s) sent, ${errors} error(s)`
    );
  } catch (error) {
    console.error("[Swell Alerts] Fatal error during alert check:", error);
  }
}

/**
 * Selects only the best scoring spot from detected swells.
 * Used when user selects "Best Spot Only" (spotId is null).
 * Uses average quality score to select the best overall window,
 * not just the window with the highest single-hour peak.
 */
function selectBestSpotOnly(detectedSwells: DetectedSwell[]): DetectedSwell[] {
  if (detectedSwells.length === 0) return [];

  // Find the swell with the highest average quality score
  // This ensures we select the window with the best overall conditions,
  // not one with a single high spike but otherwise poor conditions
  const bestSwell = detectedSwells.reduce((best, current) => {
    return current.avgQualityScore > best.avgQualityScore ? current : best;
  }, detectedSwells[0]);

  return [bestSwell];
}

/**
 * Determines if a notification should be sent based on the alert's notification frequency.
 *
 * Frequency options:
 * - "threshold": Only notify when score CROSSES from below to above threshold (once per crossing)
 * - "once": Once daily - max 1 notification per 24 hours (morning preferred: 6-9 AM ET)
 * - "twice": Twice daily - max 1 notification per 12 hours (AM: 6-9 AM, PM: 4-7 PM ET)
 * - "realtime": As forecast updates - send whenever conditions match (respects duplicate protection)
 * - "immediate": Same as realtime - send immediately when conditions match
 */
async function shouldSendNotification(
  alert: SwellAlert,
  detectedSwell: DetectedSwell,
  spots: SurfSpot[]
): Promise<boolean> {
  const frequency = alert.notificationFrequency || "immediate";
  const currentScore = detectedSwell.peakQualityScore;
  const threshold = alert.minQualityScore || 0;
  const lastScore = alert.lastNotifiedScore ?? 0;
  const now = new Date();

  // First check: score must meet threshold for all frequency types
  if (currentScore < threshold) {
    // For threshold mode, reset tracking when score drops below
    if (frequency === "threshold") {
      await updateAlertLastScore(alert.id, currentScore);
      console.log(`[Swell Alerts] Score ${currentScore} below threshold ${threshold}, resetting tracking`);
    }
    return false;
  }

  // THRESHOLD ONLY: Only notify when score crosses from below to above threshold
  if (frequency === "threshold") {
    // Score is above threshold - check if this is a CROSSING
    if (lastScore < threshold && currentScore >= threshold) {
      // CROSSING DETECTED: Score went from below to above threshold
      console.log(`[Swell Alerts] THRESHOLD CROSSED: ${lastScore} -> ${currentScore} (threshold: ${threshold})`);
      return true;
    } else {
      // Already above threshold but not a new crossing - don't spam
      console.log(`[Swell Alerts] Already above threshold (last: ${lastScore}, current: ${currentScore}), skipping`);
      return false;
    }
  }

  // ONCE DAILY: Max 1 notification per 24 hours
  if (frequency === "once") {
    const lastNotificationTime = await getLastAlertNotificationTime(alert.id);
    
    if (lastNotificationTime) {
      const hoursSinceLastNotification = (now.getTime() - lastNotificationTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastNotification < 24) {
        console.log(`[Swell Alerts] Once daily: Last notification was ${hoursSinceLastNotification.toFixed(1)}h ago, skipping (need 24h)`);
        return false;
      }
    }
    
    // Check if we're in the morning window (6 AM - 10 AM ET)
    // Convert to Eastern Time (UTC-5 or UTC-4 depending on DST)
    const etHour = getEasternTimeHour(now);
    const isInMorningWindow = etHour >= 6 && etHour < 10;
    
    // If we haven't sent in 24+ hours and we're in morning window, send
    // Also send if we haven't sent in 30+ hours (fallback for missed morning)
    const lastNotificationHoursAgo = lastNotificationTime 
      ? (now.getTime() - lastNotificationTime.getTime()) / (1000 * 60 * 60)
      : Infinity;
    
    if (isInMorningWindow || lastNotificationHoursAgo >= 30) {
      console.log(`[Swell Alerts] Once daily: Sending notification (morning window: ${isInMorningWindow}, hours since last: ${lastNotificationHoursAgo.toFixed(1)})`);
      return true;
    } else {
      console.log(`[Swell Alerts] Once daily: Not in morning window (ET hour: ${etHour}), waiting`);
      return false;
    }
  }

  // TWICE DAILY: Max 1 notification per 12 hours
  if (frequency === "twice") {
    const lastNotificationTime = await getLastAlertNotificationTime(alert.id);
    
    if (lastNotificationTime) {
      const hoursSinceLastNotification = (now.getTime() - lastNotificationTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastNotification < 12) {
        console.log(`[Swell Alerts] Twice daily: Last notification was ${hoursSinceLastNotification.toFixed(1)}h ago, skipping (need 12h)`);
        return false;
      }
    }
    
    // Check if we're in AM window (6-10 AM) or PM window (4-8 PM) ET
    const etHour = getEasternTimeHour(now);
    const isInAMWindow = etHour >= 6 && etHour < 10;
    const isInPMWindow = etHour >= 16 && etHour < 20;
    
    // If we haven't sent in 12+ hours and we're in a notification window, send
    // Also send if we haven't sent in 18+ hours (fallback)
    const lastNotificationHoursAgo = lastNotificationTime 
      ? (now.getTime() - lastNotificationTime.getTime()) / (1000 * 60 * 60)
      : Infinity;
    
    if (isInAMWindow || isInPMWindow || lastNotificationHoursAgo >= 18) {
      console.log(`[Swell Alerts] Twice daily: Sending notification (AM: ${isInAMWindow}, PM: ${isInPMWindow}, hours since last: ${lastNotificationHoursAgo.toFixed(1)})`);
      return true;
    } else {
      console.log(`[Swell Alerts] Twice daily: Not in notification window (ET hour: ${etHour}), waiting`);
      return false;
    }
  }

  // REALTIME / IMMEDIATE: Send if conditions match (duplicate protection handled separately)
  // These modes will send whenever the job runs and conditions are met
  console.log(`[Swell Alerts] ${frequency}: Conditions met, sending notification`);
  return true;
}

/**
 * Gets the current hour in Eastern Time (ET).
 * Accounts for daylight saving time.
 */
function getEasternTimeHour(date: Date): number {
  // Create a formatter for Eastern Time
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false,
  });
  
  const etHourStr = formatter.format(date);
  return parseInt(etHourStr, 10);
}

