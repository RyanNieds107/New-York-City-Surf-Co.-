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
  } catch (error) {
    console.error("[Email] Error sending email:", error);
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
  }

  if (emails.length === 0) {
    return { successCount: 0, errorCount: 0 };
  }

  const from = process.env.EMAIL_FROM || "NYC Surf Co. <notifications@nycsurfco.com>";
  const BATCH_SIZE = 100;
  let totalSuccessCount = 0;
  let totalErrorCount = 0;

  // Chunk emails into batches of 100
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