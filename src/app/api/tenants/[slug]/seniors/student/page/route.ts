import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireStudentApi } from "@/infrastructure/seniors/seniors-api-auth";
import { loadStudentDashboard } from "@/infrastructure/seniors/seniors-repository";
import { loadStudentTimetable } from "@/infrastructure/seniors/seniors-timetable";
import {
  loadStudentExamPrepData,
  loadStudentLearnData,
  loadStudentProgressData,
  loadStudentSchoolData,
} from "@/application/seniors/student-server";

type RouteContext = { params: Promise<{ slug: string }> };

const VIEWS = new Set(["home", "learn", "exam-prep", "school", "progress", "timetable"]);

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireStudentApi(request, slug);
  if (isApiError(auth)) return auth;

  const view = request.nextUrl.searchParams.get("view")?.trim() || "home";
  if (!VIEWS.has(view)) {
    return NextResponse.json({ error: "Unknown view" }, { status: 400 });
  }

  try {
    if (view === "learn") {
      const data = await loadStudentLearnData(slug);
      return NextResponse.json({ ok: true, view, data });
    }
    if (view === "exam-prep") {
      const data = await loadStudentExamPrepData(slug);
      return NextResponse.json({ ok: true, view, data });
    }
    if (view === "school") {
      const announcements = await loadStudentSchoolData(slug);
      return NextResponse.json({ ok: true, view, data: { announcements } });
    }
    if (view === "progress") {
      const data = await loadStudentProgressData(slug);
      return NextResponse.json({ ok: true, view, data });
    }
    if (view === "timetable") {
      const data = await loadStudentTimetable(auth.tenantId, auth.session.userId);
      return NextResponse.json({ ok: true, view, data });
    }

    const data = await loadStudentDashboard(
      slug,
      auth.tenantId,
      auth.session.userId,
      auth.session.fullName,
    );
    return NextResponse.json({ ok: true, view, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load student page";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
