import { getAllActiveSwellAlerts, getAllSpots, checkIfAlertAlreadySent, logSwellAlertSent, updateSwellAlertLogEmailSent, updateSwellAlertLogSmsSent, getUserById } from "../db";
import { detectUpcomingSwells } from "../services/swellDetection";
import { sendEmail } from "../services/email";
import { sendSMS } from "../services/sms";
import { formatSwellAlertNotification } from "../services/notificationFormatter";

/**
 * Checks all active swell alerts and sends notifications for matching swells.
 * This function is called periodically by the background job scheduler.
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
        // detectUpcomingSwells handles daysAdvanceNotice internally
        const now = new Date();
        const detectedSwells = await detectUpcomingSwells(alert, spots, now);

        for (const detectedSwell of detectedSwells) {
          // Check if we already sent a notification for this swell
          const alreadySent = await checkIfAlertAlreadySent(
            alert.id,
            detectedSwell.spotId,
            detectedSwell.swellStartTime,
            detectedSwell.swellEndTime
          );

          if (alreadySent) {
            continue; // Skip if already notified
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

          // Send SMS if enabled
          if (alert.smsEnabled === 1 && user.phone) {
            const smsSent = await sendSMS({
              phone: user.phone,
              message: notification.smsText,
            });

            if (smsSent && alertLogId) {
              await updateSwellAlertLogSmsSent(alertLogId);
            }
          }

          notificationsSent++;
          console.log(
            `[Swell Alerts] ✓ Sent notification for alert ${alert.id} (${spot.name})`
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

