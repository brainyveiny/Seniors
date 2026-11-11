import { NextResponse } from "next/server";
import { verifyPassword } from "@/infrastructure/auth/password";
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
  setSeniorsJoinRequestSessionCookie,
} from "@/infrastructure/auth/seniors-auth-session";
import { clearSuperAdminSessionCookie } from "@/infrastructure/auth/super-admin-session";
import { getPrismaClient, isDatabaseConfigured } from "@/infrastructure/database/prisma";
import { findJoinRequestForLogin } from "@/infrastructure/seniors/seniors-join-requests";
import { trackSeniorsEvent } from "@/infrastructure/seniors/seniors-repository";
import {
  SENIORS_REQUEST_STATUS_PATH,
  SENIORS_SCHOOL_COOKIE,
  seniorsTenantPortalPath,
} from "@/shared/lib/seniors-platform-urls";

function isSeniorsRole(value: string): value is SeniorsRole {
  return (SENIORS_ROLES as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      tenant?: string;
      email?: string;
      password?: string;
      role?: string;
    };

    const tenantSlug = body.tenant?.trim().toLowerCase() || "";
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const expectedRole = body.role?.trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 },
      );
    }

    if (expectedRole && !isSeniorsRole(expectedRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const prisma = getPrismaClient();

    const candidates = await prisma.platformUser.findMany({
      where: {
        email,
        userType: expectedRole
          ? expectedRole
          : { in: [...SENIORS_ROLES] },
        tenant: {
          activeTemplateId: "seniors-platform",
          ...(tenantSlug ? { slug: tenantSlug } : {}),
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        userType: true,
        passwordHash: true,
        tenantId: true,
        tenant: { select: { slug: true, status: true } },
      },
      take: tenantSlug ? 4 : 8,
    });

    const matched: typeof candidates = [];
    for (const user of candidates) {
      if (user.passwordHash && (await verifyPassword(password, user.passwordHash))) {
        matched.push(user);
        // School already known -no need to bcrypt every other row
        if (tenantSlug) break;
      }
    }

    if (matched.length === 0) {
      const joinRole =
        expectedRole === "student" || expectedRole === "teacher"
          ? expectedRole
          : undefined;
      const joinRequest = await findJoinRequestForLogin(
        email,
        password,
        joinRole,
        tenantSlug || undefined,
      );

      if (joinRequest) {
        const role = joinRequest.role as "student" | "teacher";
        const resolvedTenant = joinRequest.tenant.slug;

        if (joinRequest.tenant.status === "suspended") {
          return NextResponse.json(
            { error: "This school's access is suspended. Please contact Seniors support." },
            { status: 403 },
          );
        }

        if (expectedRole && role !== expectedRole) {
          return NextResponse.json(
            {
              error: `This request is for a ${role}, not a ${expectedRole.replace("-", " ")}. Use the correct login page.`,
            },
            { status: 403 },
          );
        }

        const response = NextResponse.json({
          ok: true,
          pendingApproval: joinRequest.status !== "approved",
          user: {
            id: joinRequest.approvedUserId ?? joinRequest.id,
            fullName: joinRequest.fullName,
            email: joinRequest.email,
            role,
          },
          redirectTo:
            joinRequest.status === "approved"
              ? seniorsTenantPortalPath(resolvedTenant, role)
              : SENIORS_REQUEST_STATUS_PATH,
          tenant: resolvedTenant,
        });

        clearSuperAdminSessionCookie(response);
        clearAdminSessionCookie(response);
        clearStudentSessionCookie(response);
        clearParentSessionCookie(response);
        clearTeacherSessionCookie(response);

        if (joinRequest.status === "approved" && joinRequest.approvedUserId) {
          const user = await prisma.platformUser.findUnique({
            where: { id: joinRequest.approvedUserId },
          });
          if (!user) {
            return NextResponse.json({ error: "Approved account not found" }, { status: 404 });
          }

          void prisma.platformUser
            .update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() },
            })
            .catch(() => {});

          response.cookies.set(SENIORS_SCHOOL_COOKIE, resolvedTenant, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
          });

          const session = {
            userId: user.id,
            tenant: resolvedTenant,
            role,
            email: user.email,
            fullName: user.fullName,
          };

          if (role === "student") await setStudentSessionCookie(response, session);
          else await setTeacherSessionCookie(response, session);

          void trackSeniorsEvent(joinRequest.tenantId, "login", user.id, role).catch(() => {});
          return response;
        }

        await setSeniorsJoinRequestSessionCookie(response, {
          purpose: "seniors-join-request",
          requestId: joinRequest.id,
          tenant: resolvedTenant,
          role,
          email: joinRequest.email,
          fullName: joinRequest.fullName,
        });

        return response;
      }

      return NextResponse.json(
        {
          error: expectedRole
            ? `No ${expectedRole.replace("-", " ")} account found for this email`
            : "Invalid credentials",
        },
        { status: 401 },
      );
    }

    if (!tenantSlug && matched.length > 1) {
      const schools = [...new Set(matched.map((u) => u.tenant.slug))];
      return NextResponse.json(
        {
          error: "Multiple schools use this email. Enter your school code.",
          needsSchoolCode: true,
          schools,
        },
        { status: 400 },
      );
    }

    const user = matched[0]!;
    const role = user.userType as SeniorsRole;
    const resolvedTenant = user.tenant.slug;

    if (user.tenant.status === "suspended") {
      return NextResponse.json(
        { error: "This school's access is suspended. Please contact Seniors support." },
        { status: 403 },
      );
    }

    if (expectedRole && role !== expectedRole) {
      return NextResponse.json(
        {
          error: `This account is a ${role.replace("-", " ")}, not a ${expectedRole.replace("-", " ")}. Use the correct login page.`,
        },
        { status: 403 },
      );
    }

    void prisma.platformUser
      .update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
      .catch(() => {});

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role,
      },
      redirectTo: seniorsTenantPortalPath(resolvedTenant, role),
      tenant: resolvedTenant,
    });

    clearSuperAdminSessionCookie(response);
    clearAdminSessionCookie(response);
    clearStudentSessionCookie(response);
    clearParentSessionCookie(response);
    clearTeacherSessionCookie(response);

    response.cookies.set(SENIORS_SCHOOL_COOKIE, resolvedTenant, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    const session = {
      userId: user.id,
      tenant: resolvedTenant,
      role: role as "student" | "parent" | "teacher" | "school-admin",
      email: user.email,
      fullName: user.fullName,
    };

    if (role === "student") {
      await setStudentSessionCookie(response, session);
    } else if (role === "parent") {
      await setParentSessionCookie(response, session);
    } else if (role === "teacher") {
      await setTeacherSessionCookie(response, session);
    } else if (role === "school-admin") {
      await setAdminSessionCookie(response, session);
    }

    void trackSeniorsEvent(user.tenantId, "login", user.id, role).catch(() => {});

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
