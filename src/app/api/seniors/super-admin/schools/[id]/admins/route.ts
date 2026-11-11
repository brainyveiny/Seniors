import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listSchoolAdminAccounts } from "@/application/seniors/seniors-product-admin";
import { requireSuperAdminApi } from "@/infrastructure/auth/super-admin-guard";
import { logPlatformAction } from "@/infrastructure/seniors/platform-audit";
import { createSchoolAdminAccount } from "@/infrastructure/seniors/seniors-platform-mutations";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  return NextResponse.json({ admins: await listSchoolAdminAccounts(id) });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;

  try {
    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      password?: string;
      phone?: string;
    };
    const { school, user } = await createSchoolAdminAccount(id, {
      fullName: body.fullName ?? "",
      email: body.email ?? "",
      password: body.password ?? "",
      phone: body.phone,
    });
    await logPlatformAction(auth, "school-admin.create", {
      tenantId: id,
      tenantSlug: school.slug,
      summary: `Added school admin ${user.email} to ${school.platformName}`,
    });
    return NextResponse.json({ ok: true, admins: await listSchoolAdminAccounts(id) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add admin";
    return NextResponse.json({ error: message }, { status: message === "School not found" ? 404 : 400 });
  }
}
