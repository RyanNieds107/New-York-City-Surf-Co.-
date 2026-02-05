import { getPendingReportPrompts, markPromptSent, getUserById, getSpotById } from "../db";
import { sendEmail } from "../services/email";

/**
 * Checks for forecast views from 24 hours ago and sends report prompts.
 * Runs every hour (cron: 0 * * * *).
 */
export async function sendReportPrompts(): Promise<void> {
  try {
    console.log("[Report Prompts] Starting report prompt check...");

    const pendingViews = await getPendingReportPrompts();

    if (pendingViews.length === 0) {
      console.log("[Report Prompts] No pending prompts");
      return;
    }

    console.log(`[Report Prompts] Found ${pendingViews.length} pending prompt(s)`);

    let sent = 0;
    let failed = 0;

    for (const view of pendingViews) {
      try {
        const user = await getUserById(view.userId);
        const spot = await getSpotById(view.spotId);

        if (!user || !user.email || !spot) {
          console.warn(`[Report Prompts] Missing user or spot for view ${view.id}`);
          failed++;
          continue;
        }

        // Format email
        const baseUrl = process.env.BASE_URL || process.env.VITE_BASE_URL || "https://www.nycsurfco.com";
        const reportUrl = `${baseUrl}/report/submit?spotId=${spot.id}&sessionDate=${view.forecastTime.toISOString()}&viewId=${view.id}`;

        const subject = `How was ${spot.name}?`;

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>How was your session?</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border: 2px solid #000000;">

          <!-- Header -->
          <tr>
            <td style="background-color: #000000; padding: 24px 32px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">
                NYC SURF CO
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 16px 0; color: #000000; font-size: 24px; font-weight: 700;">
                How was ${spot.name}?
              </h2>
              <p style="margin: 0 0 24px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                You checked the forecast yesterday. Help the community by sharing how your session went.
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px 0;">
                    <a href="${reportUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 16px 32px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      Submit 10-Second Report →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.5;">
                Your reports help improve forecasts and guide fellow surfers. Takes less than 10 seconds.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f5; padding: 24px 32px; border-top: 2px solid #000000;">
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                NYC Surf Co · Long Island Surf Forecasts
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `.trim();

        const text = `
How was ${spot.name}?

You checked the forecast yesterday. Help the community by sharing how your session went.

Submit your 10-second report: ${reportUrl}

Your reports help improve forecasts and guide fellow surfers.

---
NYC Surf Co - Long Island Surf Forecasts
        `.trim();

        // Send email
        const emailSent = await sendEmail({
          to: user.email,
          subject,
          html,
          text,
        });

        if (emailSent) {
          await markPromptSent(view.id);
          sent++;
          console.log(`[Report Prompts] ✓ Sent prompt to ${user.email} for ${spot.name}`);
        } else {
          failed++;
          console.warn(`[Report Prompts] Failed to send prompt to ${user.email}`);
        }

      } catch (error) {
        failed++;
        console.error(`[Report Prompts] Error processing view ${view.id}:`, error);
      }
    }

    console.log(`[Report Prompts] Completed: ${sent} sent, ${failed} failed`);

  } catch (error) {
    console.error("[Report Prompts] Fatal error:", error);
  }
}
