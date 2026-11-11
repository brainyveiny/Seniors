import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import type { SuperAdminSession } from "@/domain/entities/super-admin";
import {
  AUTH_SECRET,
  AUTH_SUPER_ADMIN_COOKIE,
} from "@/infrastructure/auth/auth-constants";
import { setCookieOnResponse } from "@/infrastructure/auth/response-cookies";

const secretKey = new TextEncoder().encode(AUTH_SECRET);

function isProd() {
  return process.env.NODE_ENV === "production";
}

async function signSuperAdminToken(session: SuperAdminSession): Promise<string> {
  return new SignJWT({
    userId: session.userId,
    role: "super-admin",
    email: session.email,
    fullName: session.fullName,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifySuperAdminToken(
  token: string,
): Promise<SuperAdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (
      payload.role !== "super-admin" ||
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.fullName !== "string"
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      role: "super-admin",
      email: payload.email,
      fullName: payload.fullName,
    };
  } catch {
    return null;
  }
}

export async function setSuperAdminSessionCookie(
  response: NextResponse,
  session: SuperAdminSession,
) {
  const token = await signSuperAdminToken(session);
  setCookieOnResponse(response, AUTH_SUPER_ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSuperAdminSessionCookie(response: NextResponse) {
  setCookieOnResponse(response, AUTH_SUPER_ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function getSuperAdminSessionFromRequest(
  request: NextRequest,
): Promise<SuperAdminSession | null> {
  const token = request.cookies.get(AUTH_SUPER_ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifySuperAdminToken(token);
}
