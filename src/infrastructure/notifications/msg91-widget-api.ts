const MSG91_WIDGET_API = "https://control.msg91.com/api/v5/widget";

export function getMsg91WidgetServerConfig(): {
  widgetId: string;
  authToken: string;
} {
  const widgetId =
    process.env.MSG91_WIDGET_ID?.trim() ||
    process.env.NEXT_PUBLIC_MSG91_WIDGET_ID?.trim() ||
    "";
  const authToken =
    process.env.MSG91_WIDGET_AUTH_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_MSG91_WIDGET_AUTH_TOKEN?.trim() ||
    "";
  return { widgetId, authToken };
}

export function isMsg91WidgetServerConfigured(): boolean {
  const { widgetId, authToken } = getMsg91WidgetServerConfig();
  return Boolean(widgetId && authToken);
}

function widgetPayload(extra: Record<string, unknown>): Record<string, unknown> {
  const { widgetId, authToken } = getMsg91WidgetServerConfig();
  return { widgetId, tokenAuth: authToken, ...extra };
}

function pickId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export function isSuccessResponse(res: unknown): boolean {
  if (!res || typeof res !== "object") return false;
  const r = res as Record<string, unknown>;
  if (r.type === "error") return false;
  if (r.type === "success") return true;
  const msg = typeof r.message === "string" ? r.message.toLowerCase().trim() : "";
  return msg === "success" || msg === "otp sent successfully" || msg === "otp sent";
}

export function extractReqId(res: unknown): string | null {
  if (!res || typeof res !== "object") return null;
  const r = res as Record<string, unknown>;
  const keys = ["request_id", "reqId", "requestId", "requestid", "id"] as const;

  for (const key of keys) {
    const value = pickId(r[key]);
    if (value) return value;
  }

  if (r.data && typeof r.data === "object") {
    const d = r.data as Record<string, unknown>;
    for (const key of keys) {
      const value = pickId(d[key]);
      if (value) return value;
    }
  }

  return null;
}

export function extractAccessToken(res: unknown): string | null {
  if (!res || typeof res !== "object") return null;
  const r = res as Record<string, unknown>;
  if (typeof r.access_token === "string") return r.access_token;
  if (typeof r["access-token"] === "string") return r["access-token"];
  if (typeof r.token === "string") return r.token;
  if (r.data && typeof r.data === "object") {
    const d = r.data as Record<string, unknown>;
    if (typeof d.access_token === "string") return d.access_token;
    if (typeof d["access-token"] === "string") return d["access-token"];
    if (typeof d.token === "string") return d.token;
  }
  return null;
}

export function responseError(res: unknown, fallback: string): string {
  if (res && typeof res === "object") {
    const r = res as Record<string, unknown>;
    if (typeof r.message === "string" && r.message.trim()) return r.message;
  }
  return fallback;
}

export function isMsg91IpBlockedError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("ipblocked") || m.includes("ip blocked") || m.includes("ip is blocked");
}

export function formatMsg91Error(message: string): string {
  if (isMsg91IpBlockedError(message)) {
    return (
      "MSG91 ne request block ki (IP whitelist). MSG91 panel → Authkey → apni key edit karo → " +
      "whatismyip.com se apna public IP copy karke Whitelisted IPs mein add karo, ya testing ke liye IP Security OFF karo. " +
      "Widget Token (OTP → Tokens) par bhi IP restriction ho sakti hai."
    );
  }
  return message;
}

async function widgetPost(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${MSG91_WIDGET_API}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    throw new Error(`MSG91 network error: ${message}`);
  }

  try {
    return await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`MSG91 request failed (${response.status})`);
    }
    return {};
  }
}

export async function msg91WidgetApiSendOtp(identifier: string): Promise<string> {
  const payload = widgetPayload({ identifier });
  const endpoints = ["/sendOtp", "/sendOtpMobile"] as const;
  let lastError = "Failed to send OTP";

  for (const endpoint of endpoints) {
    const response = await widgetPost(endpoint, payload);
    if (isSuccessResponse(response)) {
      const reqId = extractReqId(response);
      if (reqId) return reqId;
      lastError = "MSG91 accepted the request but did not return a request id";
      break;
    }
    lastError = responseError(response, lastError);
    if (
      endpoint === "/sendOtp" &&
      lastError.toLowerCase().includes("mobile requests are not allowed")
    ) {
      continue;
    }
    break;
  }

  throw new Error(
    formatMsg91Error(
      `${lastError}. Check: Captcha OFF, IP whitelist in MSG91 Authkey/Token, OTP Widget subscription active.`,
    ),
  );
}

export async function msg91WidgetApiVerifyOtp(
  reqId: string,
  otp: string,
): Promise<string> {
  const response = await widgetPost("/verifyOtp", widgetPayload({ reqId, otp }));
  if (!isSuccessResponse(response)) {
    throw new Error(formatMsg91Error(responseError(response, "Invalid OTP")));
  }
  const accessToken = extractAccessToken(response);
  if (!accessToken) {
    throw new Error("MSG91 verification succeeded but no access token was returned.");
  }
  return accessToken;
}

export async function msg91WidgetApiRetryOtp(reqId: string): Promise<void> {
  const response = await widgetPost("/retryOtp", widgetPayload({ reqId }));
  if (!isSuccessResponse(response)) {
    throw new Error(formatMsg91Error(responseError(response, "Failed to resend OTP")));
  }
}
