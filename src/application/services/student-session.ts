"use client";

export interface StudentSession {
  studentId: string;
  fullName: string;
  email: string;
  tenant: string;
}

function storageKey(tenant: string) {
  return `learnhub-student-${tenant}`;
}

export function getStudentSession(tenant: string): StudentSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(tenant));
    if (!raw) return null;
    return JSON.parse(raw) as StudentSession;
  } catch {
    return null;
  }
}

export function setStudentSession(session: StudentSession) {
  localStorage.setItem(storageKey(session.tenant), JSON.stringify(session));
}

export function clearStudentSession(tenant: string) {
  localStorage.removeItem(storageKey(tenant));
}

export async function fetchStudentSessionFromServer(
  tenant: string,
): Promise<StudentSession | null> {
  const res = await fetch(
    `/api/auth/student/session?tenant=${encodeURIComponent(tenant)}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { session?: StudentSession | null };
  return data.session ?? null;
}

export async function logoutStudent(tenant: string) {
  await fetch("/api/auth/seniors/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "student" }),
  });
  clearStudentSession(tenant);
}
