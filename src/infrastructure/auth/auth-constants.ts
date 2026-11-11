export const AUTH_SECRET =
  process.env.AUTH_SECRET ?? "dev-only-change-auth-secret";

/** Client academy admin (tenant-scoped) */
export const AUTH_ADMIN_COOKIE = "th_admin_session";

/** Student on storefront */
export const AUTH_STUDENT_COOKIE = "th_student_session";

/** Seniors parent portal */
export const AUTH_PARENT_COOKIE = "th_parent_session";

/** Seniors teacher portal */
export const AUTH_TEACHER_COOKIE = "th_teacher_session";

/** Infra / platform super admin */
export const AUTH_SUPER_ADMIN_COOKIE = "th_super_admin_session";
/** Temporary onboarding auth (OTP-verified creator) */
export const AUTH_ONBOARDING_COOKIE = "th_onboarding_session";
/** Temporary OTP challenge state during onboarding */
export const AUTH_ONBOARDING_OTP_COOKIE = "th_onboarding_otp";

/** Seniors multi-step auth: OTP challenge */
export const AUTH_SENIORS_OTP_COOKIE = "th_seniors_otp";

/** Seniors multi-step auth: email-verified ticket (until complete) */
export const AUTH_SENIORS_AUTH_TICKET_COOKIE = "th_seniors_auth_ticket";

/** Limited session for pending student/teacher join requests */
export const AUTH_SENIORS_JOIN_REQUEST_COOKIE = "th_seniors_join_request";

export const TENANT_ADMIN_ROLES = ["admin", "sub-admin", "expert"] as const;

/** @deprecated use TENANT_ADMIN_ROLES */
export const ADMIN_AUTH_ROLES = TENANT_ADMIN_ROLES;

export const SENIORS_ROLES = [
  "student",
  "parent",
  "teacher",
  "school-admin",
] as const;

export type SeniorsRole = (typeof SENIORS_ROLES)[number];

export const SENIORS_ROLE_REDIRECTS: Record<SeniorsRole, string> = {
  student: "student/home",
  parent: "parent/dashboard",
  teacher: "teacher/dashboard",
  "school-admin": "school-admin/dashboard",
};

/** Public login path segment after /{tenant}/ */
export const SENIORS_ROLE_LOGIN_PATHS: Record<SeniorsRole, string> = {
  student: "login/student",
  parent: "login/parent",
  teacher: "login/teacher",
  "school-admin": "login/school",
};

export const SUPER_ADMIN_BOOTSTRAP_EMAIL =
  process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() ?? "";

export const SUPER_ADMIN_BOOTSTRAP_PASSWORD =
  process.env.SUPER_ADMIN_PASSWORD ?? "";
