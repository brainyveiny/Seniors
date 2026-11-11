import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getAdminSessionFromRequest,
  getParentSessionFromRequest,
  getStudentSessionFromRequest,
  getTeacherSessionFromRequest,
  type AuthSession,
} from "@/infrastructure/auth/session";
import { findTenantBySlug } from "@/infrastructure/database/tenant-repository";
import { isDatabaseConfigured } from "@/infrastructure/database/prisma";
import { seniorsUserStillExists } from "@/infrastructure/seniors/seniors-user-guard";

export async function requireDb() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  return null;
}

export async function resolveTenant(slug: string) {
  return findTenantBySlug(slug);
}

function accountRemoved() {
  return NextResponse.json(
    { error: "Account no longer exists", removed: true },
    { status: 401 },
  );
}

export async function requireTeacherApi(
  request: NextRequest,
  slug: string,
): Promise<{ session: AuthSession; tenantId: string } | NextResponse> {
  const dbErr = await requireDb();
  if (dbErr) return dbErr;
  const session = await getTeacherSessionFromRequest(request);
  if (!session || session.tenant !== slug || session.role !== "teacher") {
    return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  }
  const tenant = await resolveTenant(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  if (!(await seniorsUserStillExists(tenant.id, session.userId, "teacher"))) {
    return accountRemoved();
  }
  return { session, tenantId: tenant.id };
}

export async function requireStudentApi(
  request: NextRequest,
  slug: string,
): Promise<{ session: AuthSession; tenantId: string } | NextResponse> {
  const dbErr = await requireDb();
  if (dbErr) return dbErr;
  const session = await getStudentSessionFromRequest(request);
  if (!session || session.tenant !== slug || session.role !== "student") {
    return NextResponse.json({ error: "Student login required" }, { status: 401 });
  }
  const tenant = await resolveTenant(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  if (!(await seniorsUserStillExists(tenant.id, session.userId, "student"))) {
    return accountRemoved();
  }
  return { session, tenantId: tenant.id };
}

export async function requireSchoolAdminApi(
  request: NextRequest,
  slug: string,
): Promise<{ session: AuthSession; tenantId: string } | NextResponse> {
  const dbErr = await requireDb();
  if (dbErr) return dbErr;
  const session = await getAdminSessionFromRequest(request);
  if (!session || session.tenant !== slug || session.role !== "school-admin") {
    return NextResponse.json({ error: "School admin login required" }, { status: 401 });
  }
  const tenant = await resolveTenant(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  if (!(await seniorsUserStillExists(tenant.id, session.userId, "school-admin"))) {
    return accountRemoved();
  }
  return { session, tenantId: tenant.id };
}

export async function requireParentApi(
  request: NextRequest,
  slug: string,
): Promise<{ session: AuthSession; tenantId: string } | NextResponse> {
  const dbErr = await requireDb();
  if (dbErr) return dbErr;
  const session = await getParentSessionFromRequest(request);
  if (!session || session.tenant !== slug || session.role !== "parent") {
    return NextResponse.json({ error: "Parent login required" }, { status: 401 });
  }
  const tenant = await resolveTenant(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  if (!(await seniorsUserStillExists(tenant.id, session.userId, "parent"))) {
    return accountRemoved();
  }
  return { session, tenantId: tenant.id };
}

/** Resolve whichever Seniors portal session matches this tenant. */
export async function requireSeniorsPortalApi(
  request: NextRequest,
  slug: string,
  preferredRole?: string | null,
): Promise<{ session: AuthSession; tenantId: string } | NextResponse> {
  const order =
    preferredRole === "teacher"
      ? (["teacher", "student", "parent", "school-admin"] as const)
      : preferredRole === "parent"
        ? (["parent", "student", "teacher", "school-admin"] as const)
        : preferredRole === "school-admin"
          ? (["school-admin", "student", "teacher", "parent"] as const)
          : preferredRole === "student"
            ? (["student", "teacher", "parent", "school-admin"] as const)
            : (["student", "teacher", "parent", "school-admin"] as const);

  for (const role of order) {
    const auth =
      role === "student"
        ? await requireStudentApi(request, slug)
        : role === "teacher"
          ? await requireTeacherApi(request, slug)
          : role === "parent"
            ? await requireParentApi(request, slug)
            : await requireSchoolAdminApi(request, slug);
    if (!isApiError(auth)) return auth;
  }
  return NextResponse.json({ error: "Login required" }, { status: 401 });
}

export function isApiError(
  value: { session: AuthSession; tenantId: string } | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}
