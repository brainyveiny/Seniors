import { NextResponse } from "next/server";
import {
  SUPER_ADMIN_BOOTSTRAP_EMAIL,
  SUPER_ADMIN_BOOTSTRAP_PASSWORD,
} from "@/infrastructure/auth/auth-constants";
import { hashPassword, verifyPassword } from "@/infrastructure/auth/password";
import {
  clearAdminSessionCookie,
  clearStudentSessionCookie,
} from "@/infrastructure/auth/session";
import { setSuperAdminSessionCookie } from "@/infrastructure/auth/super-admin-session";
import { getPrismaClient, isDatabaseConfigured } from "@/infrastructure/database/prisma";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();
    let admin = await prisma.platformSuperAdmin.findUnique({ where: { email } });

    if (!admin) {
      const count = await prisma.platformSuperAdmin.count();
      const canBootstrap =
        count === 0 &&
        SUPER_ADMIN_BOOTSTRAP_EMAIL &&
        SUPER_ADMIN_BOOTSTRAP_PASSWORD &&
        email === SUPER_ADMIN_BOOTSTRAP_EMAIL &&
        password === SUPER_ADMIN_BOOTSTRAP_PASSWORD;

      if (canBootstrap) {
        admin = await prisma.platformSuperAdmin.create({
          data: {
            fullName: "Platform Super Admin",
            email,
            passwordHash: await hashPassword(password),
            lastLoginAt: new Date(),
          },
        });
      } else {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
    }

    if (!admin.isActive) {
      return NextResponse.json({ error: "Account disabled" }, { status: 403 });
    }

    const valid = await verifyPassword(password, admin.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await prisma.platformSuperAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: admin.id,
        fullName: admin.fullName,
        email: admin.email,
        role: "super-admin",
      },
    });

    clearAdminSessionCookie(response);
    clearStudentSessionCookie(response);
    await setSuperAdminSessionCookie(response, {
      userId: admin.id,
      role: "super-admin",
      email: admin.email,
      fullName: admin.fullName,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
