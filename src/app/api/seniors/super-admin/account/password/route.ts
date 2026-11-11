import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { hashPassword, verifyPassword } from "@/infrastructure/auth/password";
import { requireSuperAdminApi } from "@/infrastructure/auth/super-admin-guard";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { logPlatformAction } from "@/infrastructure/seniors/platform-audit";

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword?.trim() ?? "";
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const admin = await prisma.platformSuperAdmin.findUnique({ where: { id: auth.userId } });
  if (!admin || !(await verifyPassword(currentPassword, admin.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  await prisma.platformSuperAdmin.update({
    where: { id: admin.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  await logPlatformAction(auth, "super-admin.password", { summary: "Changed own password" });
  return NextResponse.json({ ok: true });
}
