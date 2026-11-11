import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSuperAdminApi } from "@/infrastructure/auth/super-admin-guard";
import { setAdminSessionCookie } from "@/infrastructure/auth/session";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { logPlatformAction } from "@/infrastructure/seniors/platform-audit";
import {
  SENIORS_SCHOOL_COOKIE,
  seniorsTenantPortalPath,
} from "@/shared/lib/seniors-platform-urls";

type RouteContext = { params: Promise<{ id: string }> };

/** Opens the school-admin panel as one of the school's admins (session carries impersonatedBy). */
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { adminId?: string };

  const prisma = getPrismaClient();
  const tenant = await prisma.tenant.findFirst({
    where: { id, activeTemplateId: "seniors-platform" },
    select: { id: true, slug: true, platformName: true, status: true },
  });
  if (!tenant) return NextResponse.json({ error: "School not found" }, { status: 404 });
  if (tenant.status === "suspended") {
    return NextResponse.json(
      { error: "This school is suspended. Re-activate it before opening its panel." },
      { status: 409 },
    );
  }

  const admin = await prisma.platformUser.findFirst({
    where: {
      tenantId: tenant.id,
      userType: "school-admin",
      ...(body.adminId ? { id: body.adminId } : {}),
    },
    orderBy: { joinedAt: "asc" },
  });
  if (!admin) {
    return NextResponse.json({ error: "This school has no admin account yet" }, { status: 404 });
  }

  const response = NextResponse.json({
    ok: true,
    redirectTo: seniorsTenantPortalPath(tenant.slug, "school-admin"),
  });
  await setAdminSessionCookie(response, {
    userId: admin.id,
    tenant: tenant.slug,
    role: "school-admin",
    email: admin.email,
    fullName: admin.fullName,
    impersonatedBy: auth.userId,
  });
  response.cookies.set(SENIORS_SCHOOL_COOKIE, tenant.slug, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  await logPlatformAction(auth, "school.impersonate", {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    summary: `Opened ${tenant.platformName} admin panel as ${admin.email}`,
  });
  return response;
}
