import type { SeniorsRole } from "@/infrastructure/auth/auth-constants";
import {
  SENIORS_ROLE_LOGIN_PATHS,
  SENIORS_ROLE_REDIRECTS,
} from "@/infrastructure/auth/auth-constants";

export const SENIORS_PLATFORM_PREFIX = "/seniors";
export const SENIORS_SCHOOL_COOKIE = "seniors_school";
export const SENIORS_REQUEST_STATUS_PATH = "/seniors/request-status";

/**
 * Hierarchy:
 *   /seniors/th-admin/*     → Seniors product admin (above schools)
 *   /{tenant}/school-admin/* → Individual school ops portal
 *   /{tenant}/{student|teacher|parent}/* → Role portals (preferred)
 */

/** @deprecated Prefer seniorsTenantLoginPath(tenant, role) -platform login is hub-only. */
export const SENIORS_PLATFORM_LOGIN_PATHS: Record<SeniorsRole, string> = {
  student: "/seniors/login/student",
  parent: "/seniors/login/parent",
  teacher: "/seniors/login/teacher",
  "school-admin": "/seniors/login/school",
};

/** @deprecated Prefer seniorsTenantPortalPath(tenant, role). */
export const SENIORS_PLATFORM_REDIRECTS: Record<SeniorsRole, string> = {
  student: "/seniors/student/home",
  parent: "/seniors/parent/dashboard",
  teacher: "/seniors/teacher/dashboard",
  "school-admin": "/seniors/school-admin/dashboard",
};

/** Tenant-scoped portal home after login, e.g. /riverside-demo/student/home */
export function seniorsTenantPortalPath(tenant: string, role: SeniorsRole): string {
  const slug = tenant.trim().toLowerCase();
  return `/${slug}/${SENIORS_ROLE_REDIRECTS[role]}`;
}

/** Tenant-scoped login page, e.g. /riverside-demo/login/student */
export function seniorsTenantLoginPath(tenant: string, role: SeniorsRole): string {
  const slug = tenant.trim().toLowerCase();
  return `/${slug}/${SENIORS_ROLE_LOGIN_PATHS[role]}`;
}

/** Login URL with return path defaulting to the role portal home. */
export function seniorsTenantLoginRedirect(
  tenant: string,
  role: SeniorsRole,
  nextPath?: string,
): string {
  const login = seniorsTenantLoginPath(tenant, role);
  const next = nextPath ?? seniorsTenantPortalPath(tenant, role);
  return `${login}?next=${encodeURIComponent(next)}`;
}

/** Map /seniors/{area}/... platform path → /{tenant}/{area}/... when school is known. */
export function seniorsPlatformPathToTenant(pathname: string, tenant: string): string | null {
  if (!pathname.startsWith("/seniors/")) return null;
  const rest = pathname.slice("/seniors/".length);
  const area = rest.split("/").filter(Boolean)[0];
  if (
    area !== "student" &&
    area !== "teacher" &&
    area !== "parent" &&
    area !== "school-admin"
  ) {
    return null;
  }
  return seniorsTenantPortalPath(tenant, area === "school-admin" ? "school-admin" : area);
}

/** Seniors product (platform) admin -above schools */
export const SENIORS_PRODUCT_ADMIN_LOGIN = "/seniors/th-admin/login";
export const SENIORS_PRODUCT_ADMIN_HOME = "/seniors/th-admin/admin";
export function seniorsProductAdminPath(segment = ""): string {
  const raw = segment.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!raw) return SENIORS_PRODUCT_ADMIN_HOME;
  return `${SENIORS_PRODUCT_ADMIN_HOME}/${raw}`;
}

/**
 * Map a tenant-relative segment to a public `/seniors/...` URL (school portals).
 */
export function seniorsPlatformSitePath(segment = ""): string {
  const raw = segment.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!raw) return SENIORS_PLATFORM_PREFIX;

  if (raw === "login/school" || raw === "login/school-admin") {
    return SENIORS_PLATFORM_LOGIN_PATHS["school-admin"];
  }
  if (raw.startsWith("login/")) {
    return `/seniors/${raw}`;
  }

  if (raw.startsWith("school-admin")) {
    return `/seniors/${raw}`;
  }

  return `/seniors/${raw}`;
}

/** True for /seniors app paths (not marketing /seniors or /seniors/for/*). */
export function isSeniorsPlatformAppPath(pathname: string): boolean {
  if (pathname === "/seniors" || pathname === "/seniors/") return false;
  if (pathname.startsWith("/seniors/for")) return false;
  if (!pathname.startsWith("/seniors/")) return false;
  const rest = pathname.slice("/seniors/".length);
  const first = rest.split("/").filter(Boolean)[0];
  return (
    first === "th-admin" ||
    first === "login" ||
    first === "student" ||
    first === "teacher" ||
    first === "parent" ||
    first === "school-admin"
  );
}

export function isSeniorsProductAdminPath(pathname: string): boolean {
  return (
    pathname === "/seniors/th-admin" ||
    pathname.startsWith("/seniors/th-admin/")
  );
}

export function isSeniorsProductAdminLoginPath(pathname: string): boolean {
  return (
    pathname === "/seniors/th-admin/login" ||
    pathname.startsWith("/seniors/th-admin/login/")
  );
}

export function isSeniorsSchoolLoginPath(pathname: string): boolean {
  return (
    pathname === "/seniors/login/school" ||
    pathname.startsWith("/seniors/login/school/") ||
    pathname.startsWith("/seniors/login/student") ||
    pathname.startsWith("/seniors/login/teacher") ||
    pathname.startsWith("/seniors/login/parent") ||
    pathname === "/seniors/login" ||
    pathname.startsWith("/seniors/login/")
  );
}

export function isSeniorsPlatformLoginPath(pathname: string): boolean {
  return isSeniorsProductAdminLoginPath(pathname) || isSeniorsSchoolLoginPath(pathname);
}

/**
 * Rewrite school/role `/seniors/...` URLs → internal `/{tenant}/...`.
 * Product admin `/seniors/th-admin/admin` is a real app route -no rewrite.
 */
export function rewriteSeniorsPlatformToTenant(
  pathname: string,
  tenant: string,
): string | null {
  if (!isSeniorsPlatformAppPath(pathname)) return null;
  if (isSeniorsProductAdminPath(pathname)) return null; // real pages
  if (isSeniorsPlatformLoginPath(pathname)) return null;

  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "seniors" || !tenant) return null;

  // /seniors/school-admin/... → /{tenant}/school-admin/...
  if (parts[1] === "school-admin") {
    return `/${tenant}/${parts.slice(1).join("/")}`;
  }

  if (parts[1] === "student" || parts[1] === "teacher" || parts[1] === "parent") {
    return `/${tenant}/${parts.slice(1).join("/")}`;
  }

  return null;
}
