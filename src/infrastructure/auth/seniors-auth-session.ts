import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import {
  AUTH_SECRET,
  AUTH_SENIORS_AUTH_TICKET_COOKIE,
  AUTH_SENIORS_JOIN_REQUEST_COOKIE,
  AUTH_SENIORS_OTP_COOKIE,
} from "@/infrastructure/auth/auth-constants";
import { setCookieOnResponse } from "@/infrastructure/auth/response-cookies";
import type { SeniorsRole } from "@/infrastructure/auth/auth-constants";

export type SeniorsAuthMode = "login" | "signup" | "forgot";

export interface SeniorsOtpChallenge {
  purpose: "seniors-auth";
  email: string;
  otp: string;
  mode: SeniorsAuthMode;
  /** Raw password for login/signup tickets; empty for forgot. */
  password: string;
}

export interface SeniorsAuthTicket {
  email: string;
  mode: SeniorsAuthMode;
  password: string;
  stage: "email_verified";
}

export interface SeniorsJoinRequestSession {
  purpose: "seniors-join-request";
  requestId: string;
  tenant: string;
  role: "student" | "teacher";
  email: string;
  fullName: string;
}

const secretKey = new TextEncoder().encode(AUTH_SECRET);

function isProd() {
  return process.env.NODE_ENV === "production";
}

function isAuthMode(value: unknown): value is SeniorsAuthMode {
  return value === "login" || value === "signup" || value === "forgot";
}

async function sign(payload: Record<string, unknown>, expiresIn: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

async function verify<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as T;
  } catch {
    return null;
  }
}

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 10,
};

export async function setSeniorsOtpChallengeCookie(
  response: NextResponse,
  challenge: SeniorsOtpChallenge,
) {
  const token = await sign(challenge as unknown as Record<string, unknown>, "10m");
  setCookieOnResponse(response, AUTH_SENIORS_OTP_COOKIE, token, {
    ...COOKIE_OPTS,
    secure: isProd(),
  });
}

export function clearSeniorsOtpChallengeCookie(response: NextResponse) {
  setCookieOnResponse(response, AUTH_SENIORS_OTP_COOKIE, "", {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function getSeniorsOtpChallengeFromRequest(
  request: NextRequest,
): Promise<SeniorsOtpChallenge | null> {
  const token = request.cookies.get(AUTH_SENIORS_OTP_COOKIE)?.value;
  if (!token) return null;
  const payload = await verify<SeniorsOtpChallenge>(token);
  if (
    !payload ||
    payload.purpose !== "seniors-auth" ||
    typeof payload.email !== "string" ||
    typeof payload.otp !== "string" ||
    typeof payload.password !== "string" ||
    !isAuthMode(payload.mode)
  ) {
    return null;
  }
  return payload;
}

export async function setSeniorsAuthTicketCookie(
  response: NextResponse,
  ticket: SeniorsAuthTicket,
) {
  const token = await sign(ticket as unknown as Record<string, unknown>, "10m");
  setCookieOnResponse(response, AUTH_SENIORS_AUTH_TICKET_COOKIE, token, {
    ...COOKIE_OPTS,
    secure: isProd(),
  });
}

export function clearSeniorsAuthTicketCookie(response: NextResponse) {
  setCookieOnResponse(response, AUTH_SENIORS_AUTH_TICKET_COOKIE, "", {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function getSeniorsAuthTicketFromRequest(
  request: NextRequest,
): Promise<SeniorsAuthTicket | null> {
  const token = request.cookies.get(AUTH_SENIORS_AUTH_TICKET_COOKIE)?.value;
  if (!token) return null;
  const payload = await verify<SeniorsAuthTicket>(token);
  if (
    !payload ||
    payload.stage !== "email_verified" ||
    typeof payload.email !== "string" ||
    typeof payload.password !== "string" ||
    !isAuthMode(payload.mode)
  ) {
    return null;
  }
  return payload;
}

const JOIN_REQUEST_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export async function setSeniorsJoinRequestSessionCookie(
  response: NextResponse,
  session: SeniorsJoinRequestSession,
) {
  const token = await sign(session as unknown as Record<string, unknown>, "30d");
  setCookieOnResponse(response, AUTH_SENIORS_JOIN_REQUEST_COOKIE, token, {
    ...JOIN_REQUEST_COOKIE_OPTS,
    secure: isProd(),
  });
}

export function clearSeniorsJoinRequestSessionCookie(response: NextResponse) {
  setCookieOnResponse(response, AUTH_SENIORS_JOIN_REQUEST_COOKIE, "", {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function getSeniorsJoinRequestSessionFromRequest(
  request: NextRequest,
): Promise<SeniorsJoinRequestSession | null> {
  const token = request.cookies.get(AUTH_SENIORS_JOIN_REQUEST_COOKIE)?.value;
  if (!token) return null;
  const payload = await verify<SeniorsJoinRequestSession>(token);
  if (
    !payload ||
    payload.purpose !== "seniors-join-request" ||
    typeof payload.requestId !== "string" ||
    typeof payload.tenant !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.fullName !== "string" ||
    (payload.role !== "student" && payload.role !== "teacher")
  ) {
    return null;
  }
  return payload;
}

export function isJoinRequestRole(role: SeniorsRole): role is "student" | "teacher" {
  return role === "student" || role === "teacher";
}
