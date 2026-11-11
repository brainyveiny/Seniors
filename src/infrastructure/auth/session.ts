import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import {
  AUTH_ADMIN_COOKIE,
  AUTH_PARENT_COOKIE,
  AUTH_SECRET,
  AUTH_STUDENT_COOKIE,
  AUTH_TEACHER_COOKIE,
  type SeniorsRole,
} from "@/infrastructure/auth/auth-constants";
import { setCookieOnResponse } from "@/infrastructure/auth/response-cookies";

type Role =
  | "student"
  | "admin"
  | "sub-admin"
  | "expert"
  | SeniorsRole;

export interface AuthSession {
  userId: string;
  tenant: string;
  role: Role;
  email: string;
  fullName: string;
  /** Set when a platform super admin is managing this tenant via impersonation */
  impersonatedBy?: string;
}

const secretKey = new TextEncoder().encode(AUTH_SECRET);

async function signSessionToken(
  session: AuthSession,
  expiresIn: string,
): Promise<string> {
  const claims: Record<string, string> = {
    userId: session.userId,
    tenant: session.tenant,
    role: session.role,
    email: session.email,
    fullName: session.fullName,
  };
  if (session.impersonatedBy) {
    claims.impersonatedBy = session.impersonatedBy;
  }

  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

export async function createAdminSessionToken(
  session: AuthSession,
  expiresIn = "30d",
): Promise<string> {
  return signSessionToken(session, expiresIn);
}

export async function verifyAdminToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (
      typeof payload.userId !== "string" ||
      typeof payload.tenant !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.fullName !== "string"
    ) {
      return null;
    }

    const session: AuthSession = {
      userId: payload.userId,
      tenant: payload.tenant,
      role: payload.role as Role,
      email: payload.email,
      fullName: payload.fullName,
    };
    if (typeof payload.impersonatedBy === "string") {
      session.impersonatedBy = payload.impersonatedBy;
    }
    return session;
  } catch {
    return null;
  }
}

function isProd() {
  return process.env.NODE_ENV === "production";
}

export async function setAdminSessionCookie(
  response: NextResponse,
  session: AuthSession,
) {
  const token = await signSessionToken(session, "7d");
  setCookieOnResponse(response, AUTH_ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function setStudentSessionCookie(
  response: NextResponse,
  session: AuthSession,
) {
  const token = await signSessionToken(session, "30d");
  setCookieOnResponse(response, AUTH_STUDENT_COOKIE, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  setCookieOnResponse(response, AUTH_ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export function clearStudentSessionCookie(response: NextResponse) {
  setCookieOnResponse(response, AUTH_STUDENT_COOKIE, "", {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function setParentSessionCookie(
  response: NextResponse,
  session: AuthSession,
) {
  const token = await signSessionToken(session, "30d");
  setCookieOnResponse(response, AUTH_PARENT_COOKIE, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearParentSessionCookie(response: NextResponse) {
  setCookieOnResponse(response, AUTH_PARENT_COOKIE, "", {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function setTeacherSessionCookie(
  response: NextResponse,
  session: AuthSession,
) {
  const token = await signSessionToken(session, "7d");
  setCookieOnResponse(response, AUTH_TEACHER_COOKIE, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearTeacherSessionCookie(response: NextResponse) {
  setCookieOnResponse(response, AUTH_TEACHER_COOKIE, "", {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function getParentSessionFromRequest(
  request: NextRequest,
): Promise<AuthSession | null> {
  const token = request.cookies.get(AUTH_PARENT_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function getTeacherSessionFromRequest(
  request: NextRequest,
): Promise<AuthSession | null> {
  const token = request.cookies.get(AUTH_TEACHER_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function getParentSessionFromCookies(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_PARENT_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function getTeacherSessionFromCookies(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TEACHER_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function getAdminSessionFromRequest(
  request: NextRequest,
): Promise<AuthSession | null> {
  const bearer = request.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    const token = bearer.slice(7).trim();
    if (token) {
      const session = await verifyAdminToken(token);
      if (session) return session;
    }
  }

  const token = request.cookies.get(AUTH_ADMIN_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyAdminToken(token);
  if (!session) return null;
  return session;
}

export async function getStudentSessionFromRequest(
  request: NextRequest,
): Promise<AuthSession | null> {
  const token = request.cookies.get(AUTH_STUDENT_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyAdminToken(token);
  if (!session) return null;
  return session;
}

export async function getStudentSessionFromCookies(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_STUDENT_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyAdminToken(token);
  if (!session) return null;
  return session;
}
