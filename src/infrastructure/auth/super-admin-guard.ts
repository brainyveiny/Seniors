import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { SuperAdminSession } from "@/domain/entities/super-admin";
import { AUTH_SUPER_ADMIN_COOKIE } from "@/infrastructure/auth/auth-constants";
import { verifySuperAdminToken } from "@/infrastructure/auth/super-admin-session";
import { getPrismaClient, isDatabaseConfigured } from "@/infrastructure/database/prisma";
import { SENIORS_PRODUCT_ADMIN_LOGIN } from "@/shared/lib/seniors-platform-urls";

/** JWTs live 7 days, so deactivated super admins are rejected by a DB check. */
async function resolveActiveSuperAdmin(): Promise<SuperAdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SUPER_ADMIN_COOKIE)?.value;
  const session = token ? await verifySuperAdminToken(token) : null;
  if (!session) return null;
  const admin = await getPrismaClient().platformSuperAdmin.findUnique({
    where: { id: session.userId },
    select: { isActive: true },
  });
  return admin?.isActive ? session : null;
}

export async function requireSuperAdminApi(): Promise<SuperAdminSession | NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const session = await resolveActiveSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Super admin login required" }, { status: 401 });
  }
  return session;
}

export async function requireSuperAdminPage(): Promise<SuperAdminSession> {
  const session = await resolveActiveSuperAdmin();
  if (!session) redirect(SENIORS_PRODUCT_ADMIN_LOGIN);
  return session;
}
