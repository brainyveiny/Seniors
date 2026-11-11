import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isApiError,
  requireStudentApi,
  requireTeacherApi,
} from "@/infrastructure/seniors/seniors-api-auth";
import { submitAssignment } from "@/infrastructure/seniors/seniors-mutations";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { homeworkStatus } from "@/application/seniors/continue-learning";
import { trackSeniorsEvent } from "@/infrastructure/seniors/seniors-repository";
import { revalidateSeniorsDashboards } from "@/infrastructure/seniors/seniors-dashboard-cache";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const studentAuth = await requireStudentApi(request, slug);
  if (!isApiError(studentAuth)) {
    const prisma = getPrismaClient();
    const assignmentId = request.nextUrl.searchParams.get("id");
    if (assignmentId) {
      const assignment = await prisma.seniorsAssignment.findFirst({
        where: { id: assignmentId, tenantId: studentAuth.tenantId },
        include: {
          submissions: { where: { studentId: studentAuth.session.userId } },
        },
      });
      if (!assignment) {
        return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
      }
      const sub = assignment.submissions[0];
      return NextResponse.json({
        assignment: {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          subjectName: assignment.subjectName,
          chapterName: assignment.chapterName,
          dueAt: assignment.dueAt,
          questionCount: assignment.questionCount,
          attachmentUrls: assignment.attachmentUrls,
          status: homeworkStatus(assignment.dueAt),
          submissionStatus: (sub?.status as "pending" | "submitted" | "graded") ?? "pending",
          answerText: sub?.answerText ?? "",
          submissionAttachmentUrls: sub?.attachmentUrls ?? [],
          score: sub?.score ?? null,
          feedback: sub?.feedback ?? "",
        },
      });
    }

    const assignments = await prisma.seniorsAssignment.findMany({
      where: { tenantId: studentAuth.tenantId },
      include: { submissions: { where: { studentId: studentAuth.session.userId } } },
      orderBy: { dueAt: "asc" },
    });
    return NextResponse.json({
      assignments: assignments.map((a) => {
        const sub = a.submissions[0];
        return {
          id: a.id,
          title: a.title,
          subjectName: a.subjectName,
          chapterName: a.chapterName,
          dueAt: a.dueAt,
          questionCount: a.questionCount,
          status: homeworkStatus(a.dueAt),
          submissionStatus: (sub?.status as "pending" | "submitted" | "graded") ?? "pending",
        };
      }),
    });
  }

  const teacherAuth = await requireTeacherApi(request, slug);
  if (isApiError(teacherAuth)) return teacherAuth;
  return NextResponse.json({ error: "Use /assignments for teacher list" }, { status: 400 });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireStudentApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const body = (await request.json()) as {
      assignmentId?: string;
      answerText?: string;
      attachmentUrls?: string[];
    };
    if (!body.assignmentId) {
      return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
    }
    const answerText = body.answerText?.trim() ?? "";
    const attachmentUrls = body.attachmentUrls ?? [];
    if (!answerText && attachmentUrls.length === 0) {
      return NextResponse.json(
        { error: "Add your work text or upload at least one file" },
        { status: 400 },
      );
    }

    const submission = await submitAssignment(
      auth.tenantId,
      body.assignmentId,
      auth.session.userId,
      answerText || "Done",
      attachmentUrls,
    );

    void trackSeniorsEvent(auth.tenantId, "homework_submit", auth.session.userId, "student", {
      assignmentId: body.assignmentId,
    }).catch(() => {});

    revalidateSeniorsDashboards(auth.tenantId);
    return NextResponse.json({ ok: true, submission });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit homework";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
