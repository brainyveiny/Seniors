import { NextResponse } from "next/server";
import {
  SENIORS_ROLES,
  type SeniorsRole,
} from "@/infrastructure/auth/auth-constants";
import {
  clearAdminSessionCookie,
  clearParentSessionCookie,
  clearStudentSessionCookie,
  clearTeacherSessionCookie,
} from "@/infrastructure/auth/session";
import { SENIORS_SCHOOL_COOKIE } from "@/shared/lib/seniors-platform-urls";

function isSeniorsRole(value: string): value is SeniorsRole {
  return (SENIORS_ROLES as readonly string[]).includes(value);
}

function clearSchoolCookie(response: NextResponse) {
  response.cookies.set(SENIORS_SCHOOL_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });

  let role: string | undefined;
  try {
    const body = (await request.json()) as { role?: string };
    role = body.role?.trim();
  } catch {
    role = undefined;
  }

  if (role && isSeniorsRole(role)) {
    switch (role) {
      case "student":
        clearStudentSessionCookie(response);
        break;
      case "parent":
        clearParentSessionCookie(response);
        break;
      case "teacher":
        clearTeacherSessionCookie(response);
        break;
      case "school-admin":
        clearAdminSessionCookie(response);
        break;
    }
    clearSchoolCookie(response);
    return response;
  }

  clearStudentSessionCookie(response);
  clearParentSessionCookie(response);
  clearTeacherSessionCookie(response);
  clearAdminSessionCookie(response);
  clearSchoolCookie(response);
  return response;
}
