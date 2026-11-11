import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_ADMIN_COOKIE,
  AUTH_PARENT_COOKIE,
  AUTH_STUDENT_COOKIE,
  AUTH_SUPER_ADMIN_COOKIE,
  AUTH_TEACHER_COOKIE,
} from "@/infrastructure/auth/auth-constants";
import { LEGACY_PORTAL_REDIRECTS } from "@/shared/lib/seniors-routes";
import {
  isSeniorsPlatformAppPath,
  isSeniorsPlatformLoginPath,
  isSeniorsProductAdminLoginPath,
  isSeniorsProductAdminPath,
  rewriteSeniorsPlatformToTenant,
  seniorsPlatformPathToTenant,
  seniorsTenantLoginPath,
  SENIORS_PRODUCT_ADMIN_LOGIN,
  SENIORS_REQUEST_STATUS_PATH,
  SENIORS_SCHOOL_COOKIE,
} from "@/shared/lib/seniors-platform-urls";
import { verifyAdminToken } from "@/infrastructure/auth/session";
import { verifySuperAdminToken } from "@/infrastructure/auth/super-admin-session";

const RESERVED = new Set(["api", "seniors", "_next", "favicon.ico"]);

/** Set on /seniors/* → /{tenant}/* rewrite so middleware re-entry skips JWT work. */
const SENIORS_REWRITE_HEADER = "x-seniors-platform-rewrite";

type SeniorsArea = "school-admin" | "student" | "teacher" | "parent";

function seniorsAreaFromPath(pathname: string): SeniorsArea | null {
  const area = pathname.split("/").filter(Boolean)[1];
  if (
    area === "school-admin" ||
    area === "student" ||
    area === "teacher" ||
    area === "parent"
  ) {
    return area;
  }
  return null;
}

function cookieNameForSeniorsArea(area: SeniorsArea): string {
  switch (area) {
    case "school-admin":
      return AUTH_ADMIN_COOKIE;
    case "student":
      return AUTH_STUDENT_COOKIE;
    case "teacher":
      return AUTH_TEACHER_COOKIE;
    case "parent":
      return AUTH_PARENT_COOKIE;
  }
}

function loginPathForSeniorsArea(area: SeniorsArea, tenant: string | null): string {
  if (tenant) return seniorsTenantLoginPath(tenant, area);
  return "/seniors/login";
}

function isSessionAllowedForArea(
  session: { tenant: string; role: string } | null,
  tenant: string,
  area: SeniorsArea,
): boolean {
  if (!session || session.tenant !== tenant) return false;
  if (area === "school-admin") {
    return session.role === "school-admin" || session.role === "admin";
  }
  return session.role === area;
}

async function handleSeniorsPlatformApp(
  request: NextRequest,
  pathname: string,
): Promise<NextResponse> {
  const schoolFromQueryOrCookie =
    request.nextUrl.searchParams.get("school")?.trim().toLowerCase() ||
    request.cookies.get(SENIORS_SCHOOL_COOKIE)?.value?.trim().toLowerCase() ||
    null;

  // Platform role login URLs → tenant login when school is known, else login hub
  if (
    isSeniorsPlatformLoginPath(pathname) &&
    pathname !== "/seniors/login" &&
    !pathname.startsWith("/seniors/login/school") &&
    pathname !== SENIORS_REQUEST_STATUS_PATH
  ) {
    const roleSegment = pathname.replace("/seniors/login/", "").split("/")[0];
    const roleMap: Record<string, SeniorsArea | null> = {
      student: "student",
      teacher: "teacher",
      parent: "parent",
    };
    const area = roleMap[roleSegment] ?? null;
    if (area && schoolFromQueryOrCookie) {
      const url = request.nextUrl.clone();
      url.pathname = seniorsTenantLoginPath(schoolFromQueryOrCookie, area);
      const next = url.searchParams.get("next");
      if (next?.startsWith("/seniors/")) {
        const tenantNext = seniorsPlatformPathToTenant(next, schoolFromQueryOrCookie);
        if (tenantNext) url.searchParams.set("next", tenantNext);
        else url.searchParams.delete("next");
      }
      url.searchParams.delete("school");
      return NextResponse.redirect(url);
    }
    if (area) {
      const url = request.nextUrl.clone();
      url.pathname = "/seniors/login";
      return NextResponse.redirect(url);
    }
  }

  // Login and join-request status pages -no rewrite
  if (
    isSeniorsPlatformLoginPath(pathname) ||
    pathname === SENIORS_REQUEST_STATUS_PATH ||
    pathname.startsWith(`${SENIORS_REQUEST_STATUS_PATH}/`)
  ) {
    return NextResponse.next();
  }

  // Seniors product admin (above schools) -super-admin auth
  if (isSeniorsProductAdminPath(pathname) && !isSeniorsProductAdminLoginPath(pathname)) {
    const token = request.cookies.get(AUTH_SUPER_ADMIN_COOKIE)?.value;
    if (!token || !(await verifySuperAdminToken(token))) {
      const url = request.nextUrl.clone();
      url.pathname = SENIORS_PRODUCT_ADMIN_LOGIN;
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const area = seniorsAreaFromPath(pathname);

  let session: Awaited<ReturnType<typeof verifyAdminToken>> = null;
  if (area) {
    const token = request.cookies.get(cookieNameForSeniorsArea(area))?.value;
    if (token) {
      session = await verifyAdminToken(token);
    }
  }

  const tenant = session?.tenant || schoolFromQueryOrCookie;

  if (!tenant) {
    const url = request.nextUrl.clone();
    url.pathname = area ? loginPathForSeniorsArea(area, null) : "/seniors";
    if (area) {
      url.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(url);
  }

  if (area && !isSessionAllowedForArea(session, tenant, area)) {
    const url = request.nextUrl.clone();
    url.pathname = loginPathForSeniorsArea(area, tenant);
    const tenantNext = seniorsPlatformPathToTenant(pathname, tenant) ?? pathname;
    url.searchParams.set("next", tenantNext);
    return NextResponse.redirect(url);
  }

  const rewritePath = rewriteSeniorsPlatformToTenant(pathname, tenant);
  if (!rewritePath) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = rewritePath;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(SENIORS_REWRITE_HEADER, "1");
  return NextResponse.rewrite(url, {
    request: { headers: requestHeaders },
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/seniors";
    return NextResponse.redirect(url);
  }

  if (isSeniorsPlatformAppPath(pathname)) {
    return handleSeniorsPlatformApp(request, pathname);
  }

  // Rewrite re-entry from /seniors/* → /{tenant}/{role}/* -auth already checked
  if (request.headers.get(SENIORS_REWRITE_HEADER) === "1") {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const tenant = segments[0];
  if (!tenant || RESERVED.has(tenant)) {
    return NextResponse.next();
  }

  // Legacy Seniors portal URLs → current role routes
  if (segments[1] === "portal") {
    const portalPrefix = segments.slice(1).join("/");
    const base = Object.keys(LEGACY_PORTAL_REDIRECTS)
      .sort((a, b) => b.length - a.length)
      .find((key) => portalPrefix === key || portalPrefix.startsWith(`${key}/`));
    if (base) {
      const rest = portalPrefix.slice(base.length);
      const url = request.nextUrl.clone();
      url.pathname = `/${tenant}/${LEGACY_PORTAL_REDIRECTS[base]}${rest}`;
      return NextResponse.redirect(url, 301);
    }
  }

  // Note: do NOT soft-redirect /{tenant}/student|school-admin|... → /seniors/...
  // Middleware rewrites /seniors/* → /{tenant}/*, and Next re-runs middleware on the
  // rewrite target -a soft redirect would infinite-loop.
  const area = seniorsAreaFromPath(pathname);
  if (area) {
    const token = request.cookies.get(cookieNameForSeniorsArea(area))?.value;
    const session = token ? await verifyAdminToken(token) : null;
    if (!isSessionAllowedForArea(session, tenant, area)) {
      const url = request.nextUrl.clone();
      url.pathname = seniorsTenantLoginPath(tenant, area);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
