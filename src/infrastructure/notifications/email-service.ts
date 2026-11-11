type SendResult = {
  status: "sent" | "queued_dev" | "failed";
  provider?: string;
  providerId?: string;
  errorMessage?: string;
  fromEmail?: string;
};

function platformFromEmail(): string {
  const raw =
    process.env.SENIORS_EMAIL_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "Seniors <noreply@example.com>";
  return raw.includes("<") ? raw : `Seniors <${raw}>`;
}

/** Platform OTP / system emails -uses env `RESEND_API_KEY`. */
export async function sendPlatformEmail(input: {
  to: string;
  subject: string;
  html: string;
  templateKey: string;
}): Promise<SendResult> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[email:dev] RESEND_API_KEY missing -", input.to, input.subject, input.templateKey);
      return { status: "queued_dev", provider: "dev", errorMessage: "RESEND_API_KEY is not set" };
    }
    return {
      status: "failed",
      provider: "resend",
      errorMessage: "RESEND_API_KEY is not set in environment",
    };
  }

  const fromEmail = platformFromEmail();
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    const data = (await response.json()) as { id?: string; message?: string };
    if (!response.ok) {
      return {
        status: "failed",
        provider: "resend",
        fromEmail,
        errorMessage: data.message ?? "Resend API error",
      };
    }
    return { status: "sent", provider: "resend", providerId: data.id, fromEmail };
  } catch (error) {
    return {
      status: "failed",
      provider: "resend",
      fromEmail,
      errorMessage: error instanceof Error ? error.message : "Resend failed",
    };
  }
}
