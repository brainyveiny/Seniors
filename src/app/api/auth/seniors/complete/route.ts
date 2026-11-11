import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SENIORS_ROLES,
  type SeniorsRole,
} from "@/infrastructure/auth/auth-constants";
import {
  clearAdminSessionCookie,
  clearParentSessionCookie,
  clearStudentSessionCookie,
  clearTeacherSessionCookie,
  setAdminSessionCookie,
  setParentSessionCookie,
  setStudentSessionCookie,
  setTeacherSessionCookie,
} from "@/infrastructure/auth/session";
import {
  clearSeniorsAuthTicketCookie,
  getSeniorsAuthTicketFromRequest,
  isJoinRequestRole,
  setSeniorsJoinRequestSessionCookie,
} from "@/infrastructure/auth/seniors-auth-session";
import { clearSuperAdminSessionCookie } from "@/infrastructure/auth/super-admin-session";
import { getPrismaClient, isDatabaseConfigured } from "@/infrastructure/database/prisma";
import { createSeniorsSchool } from "@/infrastructure/seniors/create-seniors-school";
import { createSchoolUser } from "@/infrastructure/seniors/seniors-mutations";
import { trackSeniorsEvent } from "@/infrastructure/seniors/seniors-repository";
import { submitSeniorsJoinRequest } from "@/infrastructure/seniors/seniors-join-requests";
import { revalidateSeniorsDashboards } from "@/infrastructure/seniors/seniors-dashboard-cache";
import {
  seniorsTenantPortalPath,
  SENIORS_REQUEST_STATUS_PATH,
  SENIORS_SCHOOL_COOKIE,
} from "@/shared/lib/seniors-platform-urls";

function isSeniorsRole(value: string): value is SeniorsRole {
  return (SENIORS_ROLES as readonly string[]).includes(value);
}

async function resolveChildStudentId(
  tenantId: string,
  childQuery: string | undefined,
): Promise<string | undefined> {
  if (!childQuery?.trim()) return undefined;
  const prisma = getPrismaClient();
  const q = childQuery.trim().toLowerCase();

  const byEmail = await prisma.platformUser.findFirst({
    where: { tenantId, userType: "student", email: q },
    select: { id: true },
  });
  if (byEmail) return byEmail.id;

  const byName = await prisma.platformUser.findFirst({
    where: {
      tenantId,
      userType: "student",
      fullName: { contains: childQuery.trim(), mode: "insensitive" },
    },
    select: { id: true },
  });
  return byName?.id;
}

async function setRoleSession(
  response: NextResponse,
  session: {
    userId: string;
    tenant: string;
    role: SeniorsRole;
    email: string;
    fullName: string;
  },
) {
  clearSuperAdminSessionCookie(response);
  clearAdminSessionCookie(response);
  clearStudentSessionCookie(response);
  clearParentSessionCookie(response);
  clearTeacherSessionCookie(response);

  response.cookies.set(SENIORS_SCHOOL_COOKIE, session.tenant, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  const payload = {
    userId: session.userId,
    tenant: session.tenant,
    role: session.role as "student" | "parent" | "teacher" | "school-admin",
    email: session.email,
    fullName: session.fullName,
  };

  if (session.role === "student") await setStudentSessionCookie(response, payload);
  else if (session.role === "parent") await setParentSessionCookie(response, payload);
  else if (session.role === "teacher") await setTeacherSessionCookie(response, payload);
  else if (session.role === "school-admin") await setAdminSessionCookie(response, payload);
}

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const ticket = await getSeniorsAuthTicketFromRequest(request);
    if (!ticket) {
      return NextResponse.json(
        { error: "Verify your email OTP first" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      role?: string;
      schoolCode?: string;
      schoolName?: string;
      fullName?: string;
      phone?: string;
      classLabel?: string;
      rollNumber?: string;
      subject?: string;
      childQuery?: string;
    };

    const role = body.role?.trim() ?? "";
    const schoolCode = body.schoolCode?.trim().toLowerCase() ?? "";
    const schoolName = body.schoolName?.trim() ?? "";
    const fullName = body.fullName?.trim() ?? "";
    const phone = body.phone?.trim() ?? "";

    if (!isSeniorsRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (!fullName) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }

    const email = ticket.email;
    const prisma = getPrismaClient();

    // School self-signup: create tenant + admin, then session
    if (ticket.mode === "signup" && role === "school-admin") {
      if (!schoolName) {
        return NextResponse.json({ error: "School name is required" }, { status: 400 });
      }
      if (!schoolCode) {
        return NextResponse.json({ error: "School code is required" }, { status: 400 });
      }

      const created = await createSeniorsSchool({
        schoolName,
        schoolCode,
        adminName: fullName,
        adminEmail: email,
        adminPassword: ticket.password,
        phone,
      });

      const response = NextResponse.json({
        ok: true,
        redirectTo: seniorsTenantPortalPath(schoolCode, "school-admin"),
        tenant: created.slug,
        user: {
          id: created.admin.id,
          fullName: created.admin.fullName,
          email: created.admin.email,
          role: "school-admin" as const,
        },
      });

      clearSeniorsAuthTicketCookie(response);
      await setRoleSession(response, {
        userId: created.admin.id,
        tenant: created.slug,
        role: "school-admin",
        email: created.admin.email,
        fullName: created.admin.fullName,
      });

      void trackSeniorsEvent(created.tenantId, "signup", created.admin.id, "school-admin").catch(
        () => {},
      );
      return response;
    }

    if (!schoolCode) {
      return NextResponse.json({ error: "School code is required" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: schoolCode } });
    if (!tenant || tenant.activeTemplateId !== "seniors-platform") {
      return NextResponse.json(
        { error: "School not found. Check your school code." },
        { status: 404 },
      );
    }

    if (ticket.mode === "login") {
      const user = await prisma.platformUser.findFirst({
        where: {
          tenantId: tenant.id,
          email,
          userType: role,
        },
      });

      if (!user || !user.passwordHash) {
        return NextResponse.json(
          {
            error: `No ${role.replace("-", " ")} account found for this email at this school`,
          },
          { status: 401 },
        );
      }

      await prisma.platformUser.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          ...(fullName ? { fullName } : {}),
          ...(phone ? { phone } : {}),
          emailVerified: true,
        },
      });

      const response = NextResponse.json({
        ok: true,
        redirectTo: seniorsTenantPortalPath(schoolCode, role),
        tenant: schoolCode,
        user: {
          id: user.id,
          fullName: fullName || user.fullName,
          email: user.email,
          role,
        },
      });

      clearSeniorsAuthTicketCookie(response);
      await setRoleSession(response, {
        userId: user.id,
        tenant: schoolCode,
        role,
        email: user.email,
        fullName: fullName || user.fullName,
      });

      void trackSeniorsEvent(tenant.id, "login", user.id, role).catch(() => {});
      return response;
    }

    if (isJoinRequestRole(role)) {
      const joinRequest = await submitSeniorsJoinRequest(tenant.id, {
        role,
        fullName,
        email,
        password: ticket.password,
        phone,
        requestedClassLabel: body.classLabel,
        rollNumber: body.rollNumber,
        requestedSubject: body.subject,
      });
      revalidateSeniorsDashboards(tenant.id);

      const response = NextResponse.json({
        ok: true,
        pendingApproval: true,
        redirectTo: SENIORS_REQUEST_STATUS_PATH,
        tenant: schoolCode,
        request: {
          id: joinRequest.id,
          status: joinRequest.status,
          role,
        },
      });

      clearSeniorsAuthTicketCookie(response);
      await setSeniorsJoinRequestSessionCookie(response, {
        purpose: "seniors-join-request",
        requestId: joinRequest.id,
        tenant: schoolCode,
        role,
        email,
        fullName,
      });

      void trackSeniorsEvent(tenant.id, "signup", joinRequest.id, role).catch(() => {});
      return response;
    }

    let classId: string | undefined;
    let childStudentId: string | undefined;

    if (role === "parent") {
      childStudentId = await resolveChildStudentId(tenant.id, body.childQuery);
      if (!childStudentId && body.childQuery?.trim()) {
        return NextResponse.json(
          {
            error:
              "No student found with that email or name. Ask the school to add your child first.",
          },
          { status: 400 },
        );
      }
    }

    const user = await createSchoolUser(tenant.id, {
      fullName,
      email,
      password: ticket.password,
      userType: role,
      phone,
      classId,
      rollNumber: body.rollNumber,
      childStudentId,
    });

    await prisma.platformUser.update({
      where: { id: user.id },
      data: { emailVerified: true, source: "self-signup" },
    });

    const response = NextResponse.json({
      ok: true,
      redirectTo: seniorsTenantPortalPath(schoolCode, role),
      tenant: schoolCode,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role,
      },
    });

    clearSeniorsAuthTicketCookie(response);
    await setRoleSession(response, {
      userId: user.id,
      tenant: schoolCode,
      role,
      email: user.email,
      fullName: user.fullName,
    });

    void trackSeniorsEvent(tenant.id, "signup", user.id, role).catch(() => {});
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete auth";
    const status = message.includes("already taken") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
