import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { isApiError, requireTeacherApi } from "@/infrastructure/seniors/seniors-api-auth";
import { saveClassAttendance } from "@/infrastructure/seniors/seniors-attendance";
import { getTeacherScope } from "@/infrastructure/seniors/seniors-repository";
import { seniorsDashboardsTag } from "@/infrastructure/seniors/seniors-dashboard-cache";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireTeacherApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const body = await request.json();
    const classId = String(body.classId ?? "").trim();
    const dateStr = String(body.date ?? "").trim();
    const entries = Array.isArray(body.entries) ? body.entries : [];

    if (!classId || !dateStr) {
      return NextResponse.json({ error: "classId and date are required" }, { status: 400 });
    }

    const scope = await getTeacherScope(auth.tenantId, auth.session.userId);
    if (scope.hasAssignments && !scope.classIds.includes(classId)) {
      return NextResponse.json({ error: "You can only mark attendance for your classes" }, { status: 403 });
    }

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const result = await saveClassAttendance(
      auth.tenantId,
      classId,
      date,
      entries.map((e: { studentId: string; status: string; note?: string }) => ({
        studentId: String(e.studentId),
        status: e.status as "present" | "absent" | "late" | "holiday",
        note: e.note,
      })),
      auth.session.userId,
    );

    revalidateTag(seniorsDashboardsTag(auth.tenantId), { expire: 0 });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save attendance";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
