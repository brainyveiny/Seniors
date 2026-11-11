import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  clearSeniorsOtpChallengeCookie,
  getSeniorsOtpChallengeFromRequest,
  setSeniorsAuthTicketCookie,
} from "@/infrastructure/auth/seniors-auth-session";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; otp?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const otp = body.otp?.trim() ?? "";

    if (!email || !otp) {
      return NextResponse.json({ error: "email and otp are required" }, { status: 400 });
    }

    const challenge = await getSeniorsOtpChallengeFromRequest(request);
    if (
      !challenge ||
      challenge.mode === "forgot" ||
      challenge.email !== email ||
      challenge.otp !== otp
    ) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true, mode: challenge.mode });
    clearSeniorsOtpChallengeCookie(response);
    await setSeniorsAuthTicketCookie(response, {
      email: challenge.email,
      mode: challenge.mode,
      password: challenge.password,
      stage: "email_verified",
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify OTP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
