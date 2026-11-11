import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SuperAdminSession } from "@/domain/entities/super-admin";
import { TENANT_ADMIN_ROLES } from "@/infrastructure/auth/auth-constants";
import { getAdminSessionFromRequest, type AuthSession } from "@/infrastructure/auth/session";
import { getSuperAdminSessionFromRequest } from "@/infrastructure/auth/super-admin-session";

type GuardResult<T> =
  | { ok: true; session: T }
  | { ok: false; response: NextResponse };

export async function requireSuperAdmin(
  request: NextRequest,
): Promise<GuardResult<SuperAdminSession>> {
  const session = await getSuperAdminSessionFromRequest(request);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Super admin login required" }, { status: 401 }),
    };
  }
  return { ok: true, session };
}

export async function requireTenantAdmin(
  request: NextRequest,
  tenantSlug: string,
): Promise<GuardResult<AuthSession>> {
  const session = await getAdminSessionFromRequest(request);
  if (!session || session.tenant !== tenantSlug) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Tenant admin login required" }, { status: 401 }),
    };
  }

  const isTenantAdmin =
    session.role === "admin" ||
    session.role === "sub-admin" ||
    session.role === "expert";

  if (!isTenantAdmin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, session };
}

export function isTenantAdminRole(role: string): boolean {
  return (TENANT_ADMIN_ROLES as readonly string[]).includes(role);
}
