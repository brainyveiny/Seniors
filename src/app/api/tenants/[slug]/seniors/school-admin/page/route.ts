import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireSchoolAdminApi } from "@/infrastructure/seniors/seniors-api-auth";
import {
  loadSchoolAdminDashboard,
  loadSchoolAdminSection,
} from "@/application/seniors/role-server";

type RouteContext = { params: Promise<{ slug: string }> };

const SECTIONS = [
  "teachers",
  "students",
  "attendance",
  "parent-services",
  "enquiries",
  "parents",
  "classes",
  "exams",
  "timetable",
  "content",
  "announcements",
] as const;

type Section = (typeof SECTIONS)[number];

function isSection(value: string): value is Section {
  return (SECTIONS as readonly string[]).includes(value);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireSchoolAdminApi(request, slug);
  if (isApiError(auth)) return auth;

  const view = request.nextUrl.searchParams.get("view")?.trim() || "dashboard";

  try {
    if (view === "dashboard") {
      const data = await loadSchoolAdminDashboard(slug);
      return NextResponse.json({ ok: true, view, data });
    }

    if (!isSection(view)) {
      return NextResponse.json({ error: "Unknown view" }, { status: 400 });
    }

    const loaded = await loadSchoolAdminSection(slug, view, {
      classId: request.nextUrl.searchParams.get("classId")?.trim() || undefined,
      date: request.nextUrl.searchParams.get("date")?.trim() || undefined,
    });
    const { session: _session, ...data } = loaded as { session?: unknown } & Record<
      string,
      unknown
    >;
    return NextResponse.json({ ok: true, view, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load school page";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
