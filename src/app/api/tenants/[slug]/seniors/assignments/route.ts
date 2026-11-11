import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireTeacherApi } from "@/infrastructure/seniors/seniors-api-auth";
import {
  createAssignment,
  gradeSubmission,
} from "@/infrastructure/seniors/seniors-mutations";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { trackSeniorsEvent } from "@/infrastructure/seniors/seniors-repository";
import { revalidateSeniorsDashboards } from "@/infrastructure/seniors/seniors-dashboard-cache";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireTeacherApi(request, slug);
  if (isApiError(auth)) return auth;

  const prisma = getPrismaClient();
  const assignments = await prisma.seniorsAssignment.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: { dueAt: "asc" },
    include: {
      submissions: true,
      topicLinks: { include: { topic: true } },
    },
  });

  return NextResponse.json({
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      subjectName: a.subjectName,
      chapterName: a.chapterName,
      dueAt: a.dueAt,
      questionCount: a.questionCount,
      attachmentUrls: a.attachmentUrls,
      createdByName: a.createdByName,
      topicIds: a.topicLinks.map((l) => l.topicId),
      submissions: a.submissions.map((s) => ({
        id: s.id,
        studentId: s.studentId,
        status: s.status,
        answerText: s.answerText,
        attachmentUrls: s.attachmentUrls,
        score: s.score,
        feedback: s.feedback,
        submittedAt: s.submittedAt,
      })),
    })),
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireTeacherApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const body = (await request.json()) as {
      action?: "create" | "grade";
      title?: string;
      description?: string;
      subjectName?: string;
      chapterName?: string;
      dueAt?: string;
      questionCount?: number;
      topicIds?: string[];
      targetClassId?: string | null;
      attachmentUrls?: string[];
      submissionId?: string;
      score?: number;
      feedback?: string;
    };

    if (body.action === "grade") {
      if (!body.submissionId || body.score === undefined) {
        return NextResponse.json(
          { error: "submissionId and score are required" },
          { status: 400 },
        );
      }
      const submission = await gradeSubmission(auth.tenantId, body.submissionId, {
        score: Number(body.score),
        feedback: body.feedback,
        gradedByName: auth.session.fullName,
      });
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, submission });
    }

    if (!body.title?.trim() || !body.dueAt) {
      return NextResponse.json({ error: "title and dueAt are required" }, { status: 400 });
    }

    const assignment = await createAssignment(auth.tenantId, {
      title: body.title,
      description: body.description,
      subjectName: body.subjectName,
      chapterName: body.chapterName,
      dueAt: body.dueAt,
      questionCount: body.questionCount,
      topicIds: body.topicIds,
      targetClassId: body.targetClassId,
      attachmentUrls: body.attachmentUrls,
      createdById: auth.session.userId,
      createdByName: auth.session.fullName,
    });

    void trackSeniorsEvent(auth.tenantId, "assignment_create", auth.session.userId, "teacher", {
      assignmentId: assignment.id,
    }).catch(() => {});

    revalidateSeniorsDashboards(auth.tenantId);
    return NextResponse.json({ ok: true, assignment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save assignment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
