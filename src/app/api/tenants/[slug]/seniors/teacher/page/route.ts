import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireTeacherApi } from "@/infrastructure/seniors/seniors-api-auth";
import {
  loadTeacherAnnouncementsData,
  loadTeacherAssignmentsData,
  loadTeacherAttendanceData,
  loadTeacherClassworkData,
  loadTeacherContentData,
  loadTeacherDashboard,
  loadTeacherQuizzesData,
  loadTeacherStudentsData,
} from "@/application/seniors/role-server";

type RouteContext = { params: Promise<{ slug: string }> };

const VIEWS = new Set([
  "dashboard",
  "content",
  "assignments",
  "quizzes",
  "classwork",
  "attendance",
  "announcements",
  "students",
]);

/**
 * Lightweight JSON for teacher portal tabs.
 * Browser keeps an in-memory cache so sidebar clicks do not re-hit the DB.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireTeacherApi(request, slug);
  if (isApiError(auth)) return auth;

  const view = request.nextUrl.searchParams.get("view")?.trim() || "dashboard";
  if (!VIEWS.has(view)) {
    return NextResponse.json({ error: "Unknown view" }, { status: 400 });
  }

  try {
    const classId = request.nextUrl.searchParams.get("classId")?.trim() || null;
    const date = request.nextUrl.searchParams.get("date")?.trim() || null;
    const data =
      view === "dashboard"
        ? await loadTeacherDashboard(slug, classId)
        : view === "content"
          ? await loadTeacherContentData(slug)
          : view === "assignments"
            ? await loadTeacherAssignmentsData(slug)
            : view === "quizzes"
              ? await loadTeacherQuizzesData(slug)
              : view === "classwork"
                ? await loadTeacherClassworkData(slug)
                : view === "announcements"
                  ? await loadTeacherAnnouncementsData(slug)
                  : view === "attendance"
                    ? await loadTeacherAttendanceData(slug, {
                        classId: classId ?? undefined,
                        date: date ?? undefined,
                      })
                    : await loadTeacherStudentsData(slug);

    // Drop JWT session blob -clients only need display fields where applicable
    const { session, ...rest } = data as { session?: { fullName?: string } } & Record<
      string,
      unknown
    >;
    return NextResponse.json({
      ok: true,
      view,
      data: {
        ...rest,
        ...(view === "dashboard"
          ? { session: { fullName: session?.fullName ?? "Teacher" } }
          : {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load teacher page";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
