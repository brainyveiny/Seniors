import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listSuperAdmins } from "@/application/seniors/seniors-product-admin";
import { hashPassword } from "@/infrastructure/auth/password";
import { requireSuperAdminApi } from "@/infrastructure/auth/super-admin-guard";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { logPlatformAction } from "@/infrastructure/seniors/platform-audit";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ admins: await listSuperAdmins() });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as { fullName?: string; email?: string; password?: string };
    const fullName = body.fullName?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password?.trim() ?? "";
    if (!fullName || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Name and a valid email are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    if (await prisma.platformSuperAdmin.findUnique({ where: { email }, select: { id: true } })) {
      return NextResponse.json({ error: "A super admin with this email already exists" }, { status: 409 });
    }
    await prisma.platformSuperAdmin.create({
      data: { fullName, email, passwordHash: await hashPassword(password) },
    });
    await logPlatformAction(auth, "super-admin.create", { summary: `Added super admin ${email}` });
    return NextResponse.json({ ok: true, admins: await listSuperAdmins() }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add super admin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
