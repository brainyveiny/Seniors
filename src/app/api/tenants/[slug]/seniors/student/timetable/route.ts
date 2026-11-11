import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireStudentApi } from "@/infrastructure/seniors/seniors-api-auth";
import {
  clearPersonalTimetable,
  copySchoolTimetableToPersonal,
  deletePersonalTimetableSlot,
  loadStudentTimetable,
  upsertPersonalTimetableSlot,
} from "@/infrastructure/seniors/seniors-timetable";
import { revalidateSeniorsDashboards } from "@/infrastructure/seniors/seniors-dashboard-cache";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireStudentApi(request, slug);
  if (isApiError(auth)) return auth;

  const data = await loadStudentTimetable(auth.tenantId, auth.session.userId);
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireStudentApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const body = (await request.json()) as {
      action?: string;
      id?: string;
      dayOfWeek?: number;
      periodIndex?: number;
      startTime?: string;
      endTime?: string;
      subjectName?: string;
      teacherName?: string;
      room?: string;
      note?: string;
      isBreak?: boolean;
    };

    if (body.action === "copy-school") {
      const personalPeriods = await copySchoolTimetableToPersonal(
        auth.tenantId,
        auth.session.userId,
      );
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, personalPeriods });
    }

    if (body.action === "delete") {
      if (!body.id) {
        return NextResponse.json({ error: "Slot id required" }, { status: 400 });
      }
      await deletePersonalTimetableSlot(auth.tenantId, auth.session.userId, body.id);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "clear-all") {
      await clearPersonalTimetable(auth.tenantId, auth.session.userId);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true });
    }

    if (body.dayOfWeek == null || !body.startTime || !body.endTime) {
      return NextResponse.json({ error: "Missing slot fields" }, { status: 400 });
    }

    const slot = await upsertPersonalTimetableSlot(auth.tenantId, auth.session.userId, {
      id: body.id,
      dayOfWeek: Number(body.dayOfWeek),
      periodIndex: body.periodIndex != null ? Number(body.periodIndex) : undefined,
      startTime: String(body.startTime),
      endTime: String(body.endTime),
      subjectName: String(body.subjectName ?? ""),
      teacherName: body.teacherName,
      room: body.room,
      note: body.note,
      isBreak: body.isBreak,
    });
    revalidateSeniorsDashboards(auth.tenantId);
    return NextResponse.json({ ok: true, slot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save slot";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
