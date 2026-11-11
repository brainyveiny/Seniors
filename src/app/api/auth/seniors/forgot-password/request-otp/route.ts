import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SENIORS_ROLES } from "@/infrastructure/auth/auth-constants";
import { generateOtp } from "@/infrastructure/auth/phone";
import { setSeniorsOtpChallengeCookie } from "@/infrastructure/auth/seniors-auth-session";
import { getPrismaClient, isDatabaseConfigured } from "@/infrastructure/database/prisma";
import { sendPlatformEmail } from "@/infrastructure/notifications/email-service";
import { isDevOtpExposed } from "@/infrastructure/notifications/msg91-otp-service";

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase() ?? "";

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const users = await prisma.platformUser.findMany({
      where: {
        email,
        userType: { in: [...SENIORS_ROLES] },
        tenant: { activeTemplateId: "seniors-platform" },
      },
      select: { id: true },
      take: 1,
    });

    // Always look successful to avoid email enumeration -only send OTP if account exists.
    if (users.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "If an account exists for this email, we sent a reset code.",
      });
    }

    const otp = generateOtp();
    const html = `<h1>Reset your Seniors password</h1><p>Use this code to reset your password:</p><p style="font-size:28px;letter-spacing:4px;font-weight:700">${otp}</p><p>This code expires in 10 minutes. If you did not request this, ignore the email.</p>`;

    const emailResult = await sendPlatformEmail({
      to: email,
      subject: `Seniors password reset code: ${otp}`,
      html,
      templateKey: "seniors_forgot_otp",
    });

    const exposeDev =
      isDevOtpExposed() ||
      emailResult.status === "queued_dev" ||
      (emailResult.status === "failed" && process.env.NODE_ENV !== "production");

    if (emailResult.status === "failed") {
      console.error(
        "[seniors-forgot-otp] Resend failed",
        emailResult.errorMessage,
        "from=",
        emailResult.fromEmail,
      );
      if (process.env.NODE_ENV === "production" && !isDevOtpExposed()) {
        return NextResponse.json(
          { error: "Could not send OTP email. Try again later." },
          { status: 502 },
        );
      }
    }

    if (emailResult.status === "sent") {
      console.info("[seniors-forgot-otp] sent via Resend", email, emailResult.providerId);
    } else if (exposeDev) {
      console.info("[seniors-forgot-otp:dev]", email, "->", otp, emailResult.status);
    }

    const response = NextResponse.json({
      ok: true,
      message: "If an account exists for this email, we sent a reset code.",
      ...(exposeDev ? { devOtp: otp } : {}),
    });

    await setSeniorsOtpChallengeCookie(response, {
      purpose: "seniors-auth",
      email,
      otp,
      mode: "forgot",
      password: "",
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to request reset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
