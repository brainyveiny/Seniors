import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isApiError,
  requireStudentApi,
  requireTeacherApi,
} from "@/infrastructure/seniors/seniors-api-auth";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import {
  getActiveAcademicYearId,
  getTeacherScope,
} from "@/infrastructure/seniors/seniors-repository";
import { createCurriculumTopic } from "@/infrastructure/seniors/seniors-mutations";
import { revalidateSeniorsDashboards } from "@/infrastructure/seniors/seniors-dashboard-cache";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  let tenantId: string | null = null;
  let teacherUserId: string | null = null;
  let studentUserId: string | null = null;

  const teacher = await requireTeacherApi(request, slug);
  if (!isApiError(teacher)) {
    tenantId = teacher.tenantId;
    teacherUserId = teacher.session.userId;
  } else {
    const student = await requireStudentApi(request, slug);
    if (isApiError(student)) return student;
    tenantId = student.tenantId;
    studentUserId = student.session.userId;
  }

  const prisma = getPrismaClient();
  const yearId = await getActiveAcademicYearId(tenantId);

  let subjectIds: string[] | null = null;
  if (teacherUserId) {
    const scope = await getTeacherScope(tenantId, teacherUserId);
    if (scope.hasAssignments) subjectIds = scope.subjectIds;
  } else if (studentUserId) {
    const profile = await prisma.seniorsStudentProfile.findFirst({
      where: { tenantId, studentId: studentUserId },
      select: { classId: true },
    });
    if (profile?.classId) {
      const subjects = await prisma.seniorsSubject.findMany({
        where: { tenantId, classId: profile.classId },
        select: { id: true },
      });
      subjectIds = subjects.map((s) => s.id);
    }
  }

  const topics = await prisma.seniorsTopic.findMany({
    where: {
      tenantId,
      ...(yearId ? { academicYearId: yearId } : {}),
      ...(subjectIds ? { chapter: { subjectId: { in: subjectIds } } } : {}),
    },
    include: { chapter: { include: { subject: true } } },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({
    topics: topics.map((t) => ({
      id: t.id,
      slug: t.slug,
      number: t.number,
      title: t.title,
      contentStatus: t.contentStatus,
      subjectName: t.chapter.subject.name,
      chapterName: t.chapter.name,
      chapterNumber: t.chapter.number,
    })),
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireTeacherApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const body = (await request.json()) as {
      subjectId?: string;
      chapterId?: string;
      chapterName?: string;
      chapterNumber?: number;
      title?: string;
      number?: string;
    };

    if (!body.subjectId || !body.title?.trim()) {
      return NextResponse.json(
        { error: "subjectId and title are required" },
        { status: 400 },
      );
    }

    const scope = await getTeacherScope(auth.tenantId, auth.session.userId);
    if (scope.hasAssignments && !scope.subjectIds.includes(body.subjectId)) {
      return NextResponse.json(
        { error: "You are not assigned to this subject" },
        { status: 403 },
      );
    }

    const topic = await createCurriculumTopic(auth.tenantId, {
      subjectId: body.subjectId,
      chapterId: body.chapterId,
      chapterName: body.chapterName,
      chapterNumber: body.chapterNumber,
      title: body.title,
      number: body.number,
    });

    revalidateSeniorsDashboards(auth.tenantId);
    return NextResponse.json(
      {
        ok: true,
        topic: {
          id: topic.id,
          slug: topic.slug,
          title: topic.title,
          number: topic.number,
          subjectId: topic.chapter.subjectId,
          subjectName: topic.chapter.subject.name,
          chapterName: topic.chapter.name,
          contentStatus: topic.contentStatus,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create topic";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
