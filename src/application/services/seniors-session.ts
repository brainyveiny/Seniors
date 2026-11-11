"use client";

import type { SeniorsRole } from "@/infrastructure/auth/auth-constants";
import { clearStudentSession } from "@/application/services/student-session";
import { SENIORS_PLATFORM_PREFIX } from "@/shared/lib/seniors-platform-urls";

export function redirectAfterSeniorsLogout() {
  window.location.href = SENIORS_PLATFORM_PREFIX;
}

/** Set before redirect so the student portal can play the login coin burst. */
export const SENIORS_STUDENT_LOGIN_BURST_KEY = "seniors-student-login-burst";

export function markSeniorsStudentLoginBurst() {
  try {
    sessionStorage.setItem(SENIORS_STUDENT_LOGIN_BURST_KEY, "1");
  } catch {
    // ignore
  }
}

export function consumeSeniorsStudentLoginBurst() {
  try {
    if (sessionStorage.getItem(SENIORS_STUDENT_LOGIN_BURST_KEY) !== "1") return false;
    sessionStorage.removeItem(SENIORS_STUDENT_LOGIN_BURST_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Full document navigation after login/signup so the new session cookie is sent immediately. */
export function enterSeniorsApp(path: string, options?: { studentLoginBurst?: boolean }) {
  if (options?.studentLoginBurst) markSeniorsStudentLoginBurst();
  const href = path.startsWith("/") ? path : `/${path}`;
  window.location.replace(href);
}

export async function logoutSeniorsRole(tenant: string, role: SeniorsRole) {
  await fetch("/api/auth/seniors/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (role === "student") {
    clearStudentSession(tenant);
  }
}

export async function logoutSeniorsRoleAndGoHome(tenant: string, role: SeniorsRole) {
  await logoutSeniorsRole(tenant, role);
  redirectAfterSeniorsLogout();
}

