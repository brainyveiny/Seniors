import { toMsg91Mobile } from "@/infrastructure/auth/phone";
import { formatMsg91Error } from "@/infrastructure/notifications/msg91-widget-api";

export { toMsg91Mobile };

/** True when MSG91 can deliver real SMS (auth key + DLT template). */
export function isMsg91Configured(): boolean {
  return Boolean(
    process.env.MSG91_AUTH_KEY?.trim() && process.env.MSG91_OTP_TEMPLATE_ID?.trim(),
  );
}

/** Local-only: log OTP to console / API response instead of sending SMS. */
export function isDevOtpExposed(): boolean {
  return process.env.SHOW_DEV_OTP === "true";
}

type Msg91Response = {
  type?: string;
  message?: string;
  request_id?: string;
};

/**
 * Sends a 6-digit OTP via MSG91. Verification stays in our httpOnly OTP cookie.
 * In development without MSG91 keys, logs OTP to the server console instead.
 */
export async function sendMsg91Otp(phone: string, otp: string): Promise<void> {
  const authkey = process.env.MSG91_AUTH_KEY?.trim();
  const templateId = process.env.MSG91_OTP_TEMPLATE_ID?.trim();

  if (!authkey) {
    if (isDevOtpExposed()) {
      console.info("[msg91:dev] OTP for", toMsg91Mobile(phone), "->", otp);
      return;
    }
    throw new Error(
      "SMS OTP is not configured. Set MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID in .env, or configure the MSG91 OTP Widget.",
    );
  }

  if (!templateId) {
    if (isDevOtpExposed()) {
      console.info(
        "[msg91:dev] MSG91_AUTH_KEY set but no template -OTP for",
        toMsg91Mobile(phone),
        "->",
        otp,
      );
      return;
    }
    throw new Error(
      "MSG91_OTP_TEMPLATE_ID is not set. For testing use the OTP Widget with MSG91 default template (no .env template needed).",
    );
  }

  const mobile = toMsg91Mobile(phone);
  if (mobile.length < 12) {
    throw new Error("Invalid mobile number for MSG91");
  }

  const response = await fetch("https://control.msg91.com/api/v5/otp", {
    method: "POST",
    headers: {
      authkey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      template_id: templateId,
      mobile,
      otp,
      ...(process.env.MSG91_SENDER_ID?.trim()
        ? { sender: process.env.MSG91_SENDER_ID.trim() }
        : {}),
    }),
  });

  let data: Msg91Response = {};
  try {
    data = (await response.json()) as Msg91Response;
  } catch {
    /* non-JSON body */
  }

  if (!response.ok || data.type === "error") {
    throw new Error(
      formatMsg91Error(data.message ?? `MSG91 OTP failed (${response.status})`),
    );
  }
}
