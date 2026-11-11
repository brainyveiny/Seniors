import { NextResponse } from "next/server";
import { clearSuperAdminSessionCookie } from "@/infrastructure/auth/super-admin-session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSuperAdminSessionCookie(response);
  return response;
}
