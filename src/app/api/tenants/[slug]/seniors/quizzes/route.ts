import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireTeacherApi } from "@/infrastructure/seniors/seniors-api-auth";
import {
  createQuiz,
  deleteQuiz,
  updateQuizDraft,
} from "@/infrastructure/seniors/seniors-mutations";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { trackSeniorsEvent } from "@/infrastructure/seniors/seniors-repository";
import { revalidateSeniorsDashboards } from "@/infrastructure/seniors/seniors-dashboard-cache";
import type { SeniorsQuizQuestion } from "@/domain/seniors/types";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireTeacherApi(request, slug);
  if (isApiError(auth)) return auth;

  const prisma = getPrismaClient();
  const quizzes = await prisma.seniorsQuiz.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: { updatedAt: "desc" },
    include: {
      topic: { include: { chapter: { include: { subject: true } } } },
      attempts: { select: { id: true, score: true, maxScore: true, studentId: true } },
    },
  });

  return NextResponse.json({
    quizzes: quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      topicId: q.topicId,
      topicTitle: q.topic.title,
      subjectName: q.topic.chapter.subject.name,
      chapterName: q.topic.chapter.name,
      questionCount: Array.isArray(q.questions) ? q.questions.length : 0,
      attemptCount: q.attempts.length,
      updatedAt: q.updatedAt,
    })),
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireTeacherApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const body = (await request.json()) as {
      topicId?: string;
      title?: string;
      questions?: SeniorsQuizQuestion[];
    };

    if (!body.topicId || !body.title?.trim() || !body.questions?.length) {
      return NextResponse.json(
        { error: "topicId, title and at least one question are required" },
        { status: 400 },
      );
    }

    for (const q of body.questions) {
      if (!q.prompt?.trim() || !q.options?.length || q.correctIndex == null) {
        return NextResponse.json(
          { error: "Each question needs prompt, options and correctIndex" },
          { status: 400 },
        );
      }
    }

    const quiz = await createQuiz(auth.tenantId, {
      topicId: body.topicId,
      title: body.title,
      questions: body.questions,
      mode: "draft",
    });

    void trackSeniorsEvent(auth.tenantId, "quiz_create", auth.session.userId, "teacher", {
      quizId: quiz.id,
    }).catch(() => {});

    revalidateSeniorsDashboards(auth.tenantId);
    return NextResponse.json({ ok: true, quiz }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save quiz";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireTeacherApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const body = (await request.json()) as {
      quizId?: string;
      topicId?: string;
      title?: string;
      questions?: SeniorsQuizQuestion[];
    };

    if (!body.quizId || !body.title?.trim() || !body.questions?.length) {
      return NextResponse.json(
        { error: "quizId, title and at least one question are required" },
        { status: 400 },
      );
    }

    const quiz = await updateQuizDraft(auth.tenantId, {
      quizId: body.quizId,
      title: body.title,
      questions: body.questions,
      mode: "draft",
    });

    revalidateSeniorsDashboards(auth.tenantId);
    return NextResponse.json({ ok: true, quiz });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save quiz draft";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireTeacherApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const quizId = request.nextUrl.searchParams.get("quizId");
    if (!quizId) {
      return NextResponse.json({ error: "quizId is required" }, { status: 400 });
    }
    await deleteQuiz(auth.tenantId, quizId);
    revalidateSeniorsDashboards(auth.tenantId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete quiz";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
