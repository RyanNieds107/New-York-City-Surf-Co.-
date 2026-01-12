import { getAllActiveSwellAlerts, getAllSpots, checkIfAlertAlreadySent, logSwellAlertSent, updateSwellAlertLogEmailSent, updateSwellAlertLogSmsSent, getUserById, updateAlertLastScore } from "../db";
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
          const alreadySent = await checkIfAlertAlreadySent(
            alert.id,
            detectedSwell.spotId,
            detectedSwell.swellStartTime,
            detectedSwell.swellEndTime
          );

          if (alreadySent) {
            continue; // Skip if already notified for this exact swell window
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
 */
function selectBestSpotOnly(detectedSwells: DetectedSwell[]): DetectedSwell[] {
  if (detectedSwells.length === 0) return [];

  // Find the swell with the highest peak quality score
  const bestSwell = detectedSwells.reduce((best, current) => {
    return current.peakQualityScore > best.peakQualityScore ? current : best;
  }, detectedSwells[0]);

  return [bestSwell];
}

/**
 * Determines if a notification should be sent based on the alert's notification frequency.
 *
 * For "threshold" frequency:
 * - Only sends when score CROSSES from below to above threshold
 * - Updates lastNotifiedScore to track state
 * - Resets tracking when score drops below threshold
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

  // THRESHOLD ONLY: Only notify when score crosses from below to above threshold
  if (frequency === "threshold") {
    // Check if score is above threshold
    if (currentScore < threshold) {
      // Score is below threshold - reset tracking (update lastNotifiedScore to current)
      // This ensures next crossing will trigger a notification
      await updateAlertLastScore(alert.id, currentScore);
      console.log(`[Swell Alerts] Score ${currentScore} below threshold ${threshold}, resetting tracking`);
      return false;
    }

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

  // For all other frequencies, send if score meets threshold
  // (daily/twice/realtime digest logic would go here)
  return currentScore >= threshold;
}

