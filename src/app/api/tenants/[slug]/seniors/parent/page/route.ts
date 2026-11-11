import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireParentApi } from "@/infrastructure/seniors/seniors-api-auth";
import {
  loadParentChildrenData,
  loadParentDashboard,
} from "@/application/seniors/role-server";
import {
  loadParentAttendanceData,
  loadParentCalendarData,
  loadParentCatalogPageData,
  loadParentFeesPageData,
  loadParentHomeworkData,
  loadParentLeavePageData,
  loadParentLessonPlanData,
  loadParentProfileData,
  loadParentTestResultsData,
  loadParentTimetableData,
  loadParentTransportPageData,
} from "@/application/seniors/parent-portal-data";

type RouteContext = { params: Promise<{ slug: string }> };

const VIEWS = new Set([
  "dashboard",
  "children",
  "announcements",
  "homework",
  "test-results",
  "attendance",
  "profile",
  "timetable",
  "calendar",
  "lesson-plan",
  "leave",
  "fees",
  "transport",
  "hobby-club",
  "books",
  "elective",
  "uniform",
]);

const SECTION_LOADERS = {
  homework: loadParentHomeworkData,
  "test-results": loadParentTestResultsData,
  attendance: loadParentAttendanceData,
  profile: loadParentProfileData,
  timetable: loadParentTimetableData,
  calendar: loadParentCalendarData,
  "lesson-plan": loadParentLessonPlanData,
  leave: loadParentLeavePageData,
  fees: loadParentFeesPageData,
  transport: loadParentTransportPageData,
  "hobby-club": (t: string, p: string, c?: string) =>
    loadParentCatalogPageData(t, p, "hobby_club", c),
  books: (t: string, p: string, c?: string) =>
    loadParentCatalogPageData(t, p, "books_stationery", c),
  elective: (t: string, p: string, c?: string) =>
    loadParentCatalogPageData(t, p, "language_elective", c),
  uniform: (t: string, p: string, c?: string) =>
    loadParentCatalogPageData(t, p, "uniform", c),
} as const;

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireParentApi(request, slug);
  if (isApiError(auth)) return auth;

  const view = request.nextUrl.searchParams.get("view")?.trim() || "dashboard";
  const child = request.nextUrl.searchParams.get("child")?.trim() || undefined;
  if (!VIEWS.has(view)) {
    return NextResponse.json({ error: "Unknown view" }, { status: 400 });
  }

  try {
    if (view === "children") {
      const loaded = await loadParentChildrenData(slug);
      const { session: _session, ...data } = loaded;
      return NextResponse.json({ ok: true, view, data });
    }

    const loaded = await loadParentDashboard(slug, child);
    const { session, ...rest } = loaded;
    if (view === "announcements") {
      return NextResponse.json({
        ok: true,
        view,
        data: { announcements: rest.announcements },
      });
    }

    if (view === "dashboard") {
      return NextResponse.json({
        ok: true,
        view,
        data: {
          ...rest,
          session: { fullName: session.fullName },
        },
      });
    }

    const loader = SECTION_LOADERS[view as keyof typeof SECTION_LOADERS];
    const data = await loader(auth.tenantId, auth.session.userId, child);
    return NextResponse.json({
      ok: true,
      view,
      data: {
        ...data,
        session: { fullName: auth.session.fullName },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load parent page";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
