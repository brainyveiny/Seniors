import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  clearSeniorsJoinRequestSessionCookie,
  getSeniorsJoinRequestSessionFromRequest,
} from "@/infrastructure/auth/seniors-auth-session";
import {
  clearAdminSessionCookie,
  clearParentSessionCookie,
  clearStudentSessionCookie,
  clearTeacherSessionCookie,
  setStudentSessionCookie,
  setTeacherSessionCookie,
} from "@/infrastructure/auth/session";
import { clearSuperAdminSessionCookie } from "@/infrastructure/auth/super-admin-session";
import { getPrismaClient, isDatabaseConfigured } from "@/infrastructure/database/prisma";
import { trackSeniorsEvent } from "@/infrastructure/seniors/seniors-repository";
import {
  SENIORS_SCHOOL_COOKIE,
  seniorsTenantPortalPath,
} from "@/shared/lib/seniors-platform-urls";

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const session = await getSeniorsJoinRequestSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No active join request session" }, { status: 401 });
  }

  const prisma = getPrismaClient();
  const joinRequest = await prisma.seniorsJoinRequest.findFirst({
    where: { id: session.requestId, status: "approved" },
    include: { tenant: { select: { slug: true } } },
  });

  if (!joinRequest || joinRequest.tenant.slug !== session.tenant) {
    return NextResponse.json(
      { error: "Your request is not approved yet" },
      { status: 403 },
    );
  }

  if (!joinRequest.approvedUserId) {
    return NextResponse.json({ error: "Approved account not found" }, { status: 404 });
  }

  const user = await prisma.platformUser.findUnique({
    where: { id: joinRequest.approvedUserId },
  });
  if (!user) {
    return NextResponse.json({ error: "Approved account not found" }, { status: 404 });
  }

  const role = joinRequest.role as "student" | "teacher";
  const tenant = joinRequest.tenant.slug;

  await prisma.platformUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const response = NextResponse.json({
    ok: true,
    redirectTo: seniorsTenantPortalPath(tenant, role),
    tenant,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role,
    },
  });

  clearSuperAdminSessionCookie(response);
  clearAdminSessionCookie(response);
  clearStudentSessionCookie(response);
  clearParentSessionCookie(response);
  clearTeacherSessionCookie(response);
  clearSeniorsJoinRequestSessionCookie(response);

  response.cookies.set(SENIORS_SCHOOL_COOKIE, tenant, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  const roleSession = {
    userId: user.id,
    tenant,
    role,
    email: user.email,
    fullName: user.fullName,
  };

  if (role === "student") await setStudentSessionCookie(response, roleSession);
  else await setTeacherSessionCookie(response, roleSession);

  void trackSeniorsEvent(joinRequest.tenantId, "login", user.id, role).catch(() => {});
  return response;
}
