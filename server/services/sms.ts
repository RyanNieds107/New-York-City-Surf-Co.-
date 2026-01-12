import { ENV } from "../_core/env";

export interface SMSOptions {
  phone: string; // E.164 format or plain number
  message: string;
}

/**
 * Sends an SMS notification via Quo (OpenPhone).
 * Placeholder implementation - configure with Quo API when ready.
 */
export async function sendSMS(options: SMSOptions): Promise<boolean> {
  const { phone, message } = options;

  // TODO: Configure Twilio/Quo/OpenPhone API credentials
  const apiKey = process.env.QUO_API_KEY || process.env.TWILIO_API_KEY || ENV.quoApiKey;
  const apiUrl = process.env.QUO_API_URL || "https://api.quo.com";

  // Clean phone number for logging
  const cleanPhone = phone.replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("1") ? `+${cleanPhone}` : `+1${cleanPhone}`;

  if (!apiKey) {
    // PLACEHOLDER: Log what would be sent until Twilio/Quo is configured
    console.log(`[SMS Placeholder] Would send to ${formattedPhone}: "${message.substring(0, 50)}..."`);
    console.warn("[SMS] No SMS API key configured. SMS sending disabled (placeholder mode).");
    return true; // Return true for testing - pretend SMS was sent
  }

  try {
    // Phone number already cleaned above

    // TODO: Replace with actual Quo/OpenPhone API endpoint
    // Example structure - adjust based on Quo API documentation
    const response = await fetch(`${apiUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: formattedPhone,
        body: message.substring(0, 160), // SMS max length (adjust if Quo supports longer)
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn(`[SMS] Failed to send SMS (${response.status}): ${errorText}`);
      return false;
    }

    console.log(`[SMS] Successfully sent SMS to ${formattedPhone}`);
    return true;
  } catch (error) {
    console.error("[SMS] Error sending SMS:", error);
    return false;
  }
}

