import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireSchoolAdminApi } from "@/infrastructure/seniors/seniors-api-auth";
import {
  clearClassTimetable,
  deleteClassTimetableSlot,
  loadClassTimetable,
  parseSchoolTimetableCsv,
  replaceClassTimetable,
  type ClassTimetableSlotInput,
} from "@/infrastructure/seniors/seniors-timetable";
import { revalidateSeniorsDashboards } from "@/infrastructure/seniors/seniors-dashboard-cache";
import { getPrismaClient } from "@/infrastructure/database/prisma";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireSchoolAdminApi(request, slug);
  if (isApiError(auth)) return auth;

  const classId = request.nextUrl.searchParams.get("classId")?.trim();
  if (!classId) {
    return NextResponse.json({ error: "classId required" }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const klass = await prisma.seniorsClass.findFirst({
    where: { id: classId, tenantId: auth.tenantId },
    select: { id: true, name: true, section: true },
  });
  if (!klass) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const periods = await loadClassTimetable(auth.tenantId, classId);
  return NextResponse.json({
    ok: true,
    class: klass,
    periods,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireSchoolAdminApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const body = (await request.json()) as {
      action?: string;
      classId?: string;
      slotId?: string;
      csv?: string;
      slots?: ClassTimetableSlotInput[];
    };

    const classId = body.classId?.trim();
    if (!classId) {
      return NextResponse.json({ error: "classId required" }, { status: 400 });
    }

    if (body.action === "clear") {
      await clearClassTimetable(auth.tenantId, classId);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, periods: [] });
    }

    if (body.action === "delete-slot") {
      const slotId = body.slotId?.trim();
      if (!slotId) {
        return NextResponse.json({ error: "slotId required" }, { status: 400 });
      }
      const periods = await deleteClassTimetableSlot(auth.tenantId, classId, slotId);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, periods });
    }

    if (body.action === "upload-csv") {
      if (!body.csv?.trim()) {
        return NextResponse.json({ error: "CSV text required" }, { status: 400 });
      }
      const slots = parseSchoolTimetableCsv(body.csv);
      const periods = await replaceClassTimetable(auth.tenantId, classId, slots);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, periods, imported: periods.length });
    }

    if (body.action === "replace" || Array.isArray(body.slots)) {
      const periods = await replaceClassTimetable(
        auth.tenantId,
        classId,
        body.slots ?? [],
      );
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, periods });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save timetable";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
