import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listSuperAdmins } from "@/application/seniors/seniors-product-admin";
import { requireSuperAdminApi } from "@/infrastructure/auth/super-admin-guard";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { logPlatformAction } from "@/infrastructure/seniors/platform-audit";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;

  const body = (await request.json()) as { isActive?: boolean };
  if (typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "isActive is required" }, { status: 400 });
  }
  if (id === auth.userId && !body.isActive) {
    return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const target = await prisma.platformSuperAdmin.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Super admin not found" }, { status: 404 });
  if (!body.isActive) {
    const activeCount = await prisma.platformSuperAdmin.count({ where: { isActive: true } });
    if (activeCount <= 1) {
      return NextResponse.json({ error: "At least one active super admin is required" }, { status: 400 });
    }
  }

  await prisma.platformSuperAdmin.update({ where: { id }, data: { isActive: body.isActive } });
  await logPlatformAction(auth, "super-admin.update", {
    summary: `${body.isActive ? "Activated" : "Deactivated"} super admin ${target.email}`,
  });
  return NextResponse.json({ ok: true, admins: await listSuperAdmins() });
}
