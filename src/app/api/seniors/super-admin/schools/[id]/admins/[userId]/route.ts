import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listSchoolAdminAccounts } from "@/application/seniors/seniors-product-admin";
import { requireSuperAdminApi } from "@/infrastructure/auth/super-admin-guard";
import { logPlatformAction } from "@/infrastructure/seniors/platform-audit";
import {
  deleteSchoolAdminAccount,
  updateSchoolAdminAccount,
} from "@/infrastructure/seniors/seniors-platform-mutations";

type RouteContext = { params: Promise<{ id: string; userId: string }> };

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.endsWith("not found") ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;
  const { id, userId } = await context.params;

  try {
    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      phone?: string;
      password?: string;
    };
    const { school, user } = await updateSchoolAdminAccount(id, userId, body);
    const resetPassword = body.password !== undefined;
    await logPlatformAction(auth, resetPassword ? "school-admin.reset-password" : "school-admin.update", {
      tenantId: id,
      tenantSlug: school.slug,
      summary: resetPassword
        ? `Reset password for ${user.email}`
        : `Updated school admin ${user.email}`,
    });
    return NextResponse.json({ ok: true, admins: await listSchoolAdminAccounts(id) });
  } catch (error) {
    return errorResponse(error, "Failed to update admin");
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;
  const { id, userId } = await context.params;

  try {
    const { school, email } = await deleteSchoolAdminAccount(id, userId);
    await logPlatformAction(auth, "school-admin.delete", {
      tenantId: id,
      tenantSlug: school.slug,
      summary: `Removed school admin ${email}`,
    });
    return NextResponse.json({ ok: true, admins: await listSchoolAdminAccounts(id) });
  } catch (error) {
    return errorResponse(error, "Failed to remove admin");
  }
}
