import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SENIORS_ROLES } from "@/infrastructure/auth/auth-constants";
import { hashPassword } from "@/infrastructure/auth/password";
import {
  clearSeniorsAuthTicketCookie,
  getSeniorsAuthTicketFromRequest,
} from "@/infrastructure/auth/seniors-auth-session";
import { getPrismaClient, isDatabaseConfigured } from "@/infrastructure/database/prisma";

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const ticket = await getSeniorsAuthTicketFromRequest(request);
    if (!ticket || ticket.mode !== "forgot") {
      return NextResponse.json(
        { error: "Verify your email OTP first" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      newPassword?: string;
      schoolCode?: string;
    };

    const newPassword = body.newPassword?.trim() ?? "";
    const schoolCode = body.schoolCode?.trim().toLowerCase() ?? "";

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();
    const users = await prisma.platformUser.findMany({
      where: {
        email: ticket.email,
        userType: { in: [...SENIORS_ROLES] },
        tenant: {
          activeTemplateId: "seniors-platform",
          ...(schoolCode ? { slug: schoolCode } : {}),
        },
      },
      select: { id: true, tenant: { select: { slug: true } } },
    });

    if (users.length === 0) {
      return NextResponse.json(
        {
          error: schoolCode
            ? "No account found for this email at that school"
            : "No Seniors account found for this email",
        },
        { status: 404 },
      );
    }

    if (!schoolCode && users.length > 1) {
      const schools = [...new Set(users.map((u) => u.tenant.slug))];
      return NextResponse.json(
        {
          error: "Multiple schools use this email. Enter your school code.",
          needsSchoolCode: true,
          schools,
        },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.platformUser.updateMany({
      where: { id: { in: users.map((u) => u.id) } },
      data: { passwordHash },
    });

    const response = NextResponse.json({
      ok: true,
      message: "Password updated. You can sign in now.",
    });
    clearSeniorsAuthTicketCookie(response);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
