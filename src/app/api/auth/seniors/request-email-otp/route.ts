import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SENIORS_ROLES } from "@/infrastructure/auth/auth-constants";
import { verifyPassword } from "@/infrastructure/auth/password";
import { generateOtp } from "@/infrastructure/auth/phone";
import {
  setSeniorsOtpChallengeCookie,
  type SeniorsAuthMode,
} from "@/infrastructure/auth/seniors-auth-session";
import { getPrismaClient, isDatabaseConfigured } from "@/infrastructure/database/prisma";
import { sendPlatformEmail } from "@/infrastructure/notifications/email-service";
import { isDevOtpExposed } from "@/infrastructure/notifications/msg91-otp-service";

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      mode?: SeniorsAuthMode;
    };

    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password?.trim() ?? "";
    const mode: SeniorsAuthMode = body.mode === "signup" ? "signup" : "login";

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();

    if (mode === "login") {
      const candidates = await prisma.platformUser.findMany({
        where: {
          email,
          userType: { in: [...SENIORS_ROLES] },
          tenant: { activeTemplateId: "seniors-platform" },
        },
        select: { passwordHash: true },
      });

      let matched = false;
      for (const user of candidates) {
        if (user.passwordHash && (await verifyPassword(password, user.passwordHash))) {
          matched = true;
          break;
        }
      }
      if (!matched) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
    }

    const otp = generateOtp();
    const html = `<h1>Your verification code</h1><p>Use this code to continue signing in to Seniors:</p><p style="font-size:28px;letter-spacing:4px;font-weight:700">${otp}</p><p>This code expires in 10 minutes.</p>`;

    const emailResult = await sendPlatformEmail({
      to: email,
      subject: `Your Seniors verification code: ${otp}`,
      html,
      templateKey: "seniors_email_otp",
    });

    const exposeDev =
      isDevOtpExposed() ||
      emailResult.status === "queued_dev" ||
      (emailResult.status === "failed" && process.env.NODE_ENV !== "production");

    if (emailResult.status === "failed") {
      console.error(
        "[seniors-otp] Resend failed",
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
      console.info("[seniors-otp] sent via Resend", email, emailResult.providerId);
    } else if (exposeDev) {
      console.info("[seniors-otp:dev]", email, "->", otp, emailResult.status);
    }

    const response = NextResponse.json({
      ok: true,
      ...(exposeDev ? { devOtp: otp } : {}),
    });

    await setSeniorsOtpChallengeCookie(response, {
      purpose: "seniors-auth",
      email,
      otp,
      mode,
      password,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to request OTP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
