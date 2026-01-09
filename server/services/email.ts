import { ENV } from "../_core/env";
import { TRPCError } from "@trpc/server";

export interface EmailOptions {
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

