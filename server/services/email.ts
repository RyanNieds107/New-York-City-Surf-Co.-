import { ENV } from "../_core/env";
import { TRPCError } from "@trpc/server";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface BatchEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Sends an email notification.
 * Currently uses Resend (free tier: 100 emails/day).
 * Can be swapped for SendGrid, AWS SES, etc.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, html, text } = options;

  const apiKey = process.env.RESEND_API_KEY || ENV.resendApiKey;

  if (!apiKey) {
    console.warn("[Email] Resend API key not configured. Email sending disabled.");
    return false;
  }

  // Resend API endpoint
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "NYC Surf Co. <notifications@nycsurfco.com>",
        to: [to],
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML if no text provided
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn(
        `[Email] Failed to send email (${response.status}): ${JSON.stringify(errorData)}`
      );
      return false;
    }

    const data = await response.json().catch(() => ({}));
    console.log(`[Email] Successfully sent email to ${to} (ID: ${data.id || "unknown"})`);
    return true;
  } catch (error: any) {
    console.error("[Email] Failed to send email:", {
      to,
      subject,
      error: error?.message || "Unknown error",
      response: error?.response?.body || "No response body",
    });
    return false;
  }
}

/**
 * Sends batch emails using Resend batch API (up to 100 emails per batch).
 * Automatically chunks arrays larger than 100 into multiple batches.
 * Returns the number of successfully sent emails.
 */
export async function sendBatchEmails(
  emails: BatchEmailOptions[]
): Promise<{ successCount: number; errorCount: number }> {
  const apiKey = process.env.RESEND_API_KEY || ENV.resendApiKey;  if (!apiKey) {
    console.warn("[Email] Resend API key not configured. Batch email sending disabled.");
    return { successCount: 0, errorCount: emails.length };
  }  if (emails.length === 0) {
    return { successCount: 0, errorCount: 0 };
  }

  const from = process.env.EMAIL_FROM || "NYC Surf Co. <notifications@nycsurfco.com>";
  const BATCH_SIZE = 100;
  let totalSuccessCount = 0;
  let totalErrorCount = 0;  // Chunk emails into batches of 100
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    
    try {
      const batchPayload = batch.map((email) => ({
        from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text || email.html.replace(/<[^>]*>/g, ""),
      }));

      const response = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batchPayload),
      });

      if (!response.ok) {
        const errorData = await response.text().catch(() => "");
        console.warn(
          `[Email] Failed to send batch (${response.status}): ${errorData}`
        );
        totalErrorCount += batch.length;
        continue;
      }

      const data = await response.json().catch(() => ({}));
      const batchResult = Array.isArray(data?.data) ? data.data : [];
      totalSuccessCount += batchResult.length;
      totalErrorCount += batch.length - batchResult.length;
      
      console.log(
        `[Email] Successfully sent batch: ${batchResult.length}/${batch.length} emails (batch ${Math.floor(i / BATCH_SIZE) + 1})`
      );
    } catch (error) {
      console.error(`[Email] Error sending batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
      totalErrorCount += batch.length;
    }
  }

  return { successCount: totalSuccessCount, errorCount: totalErrorCount };
}

export interface MagicLinkEmailOptions {
  to: string;
  magicLinkUrl: string;
}

/**
 * Sends a magic link authentication email.
 * Branded email with NYC Surf Co. styling.
 */
export async function sendMagicLinkEmail(options: MagicLinkEmailOptions): Promise<boolean> {
  const { to, magicLinkUrl } = options;

  const subject = "Your NYC Surf Co login link";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to NYC Surf Co</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border: 2px solid #000000;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #000000; padding: 24px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; font-family: 'Bebas Neue', 'Oswald', Arial, sans-serif;">
                NYC SURF CO
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 16px 0; color: #000000; font-size: 24px; font-weight: 700;">
                Sign in to your account
              </h2>
              <p style="margin: 0 0 24px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Click the button below to securely sign in to the NYC Surf Co members portal. This link will expire in 24 hours.
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 32px 0;">
                    <a href="${magicLinkUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 16px 32px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      Sign In to Members Portal
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; color: #999999; font-size: 14px; line-height: 1.5;">
                If you didn't request this email, you can safely ignore it. Only a person with access to your email can sign in using this link.
              </p>

              <!-- Link fallback -->
              <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5; word-break: break-all;">
                Or copy and paste this URL into your browser:<br>
                <a href="${magicLinkUrl}" style="color: #666666;">${magicLinkUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f5; padding: 24px 32px; border-top: 2px solid #000000;">
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
                NYC Surf Co &bull; Long Island Surf Forecasts
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `Sign in to NYC Surf Co

Click this link to sign in to your account:
${magicLinkUrl}

This link expires in 24 hours.

If you didn't request this email, you can safely ignore it.

---
NYC Surf Co - Long Island Surf Forecasts`;

  return sendEmail({
    to,
    subject,
    html,
    text,
  });
}