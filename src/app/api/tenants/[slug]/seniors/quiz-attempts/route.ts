import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireStudentApi } from "@/infrastructure/seniors/seniors-api-auth";
import { submitQuizAttempt } from "@/infrastructure/seniors/seniors-mutations";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { trackSeniorsEvent } from "@/infrastructure/seniors/seniors-repository";
import { revalidateSeniorsDashboards } from "@/infrastructure/seniors/seniors-dashboard-cache";
import type { SeniorsQuizQuestion } from "@/domain/seniors/types";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireStudentApi(request, slug);
  if (isApiError(auth)) return auth;

  const quizId = request.nextUrl.searchParams.get("quizId");
  if (!quizId) {
    return NextResponse.json({ error: "quizId is required" }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const quiz = await prisma.seniorsQuiz.findFirst({
    where: { id: quizId, tenantId: auth.tenantId },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  const questions = (quiz.questions as unknown as SeniorsQuizQuestion[]) ?? [];
  const lastAttempt = await prisma.seniorsQuizAttempt.findFirst({
    where: { quizId, studentId: auth.session.userId, tenantId: auth.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      questions: questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        options: q.options,
      })),
    },
    lastAttempt: lastAttempt
      ? {
          id: lastAttempt.id,
          score: lastAttempt.score,
          maxScore: lastAttempt.maxScore,
          submittedAt: lastAttempt.submittedAt,
          answers: lastAttempt.answers,
        }
      : null,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireStudentApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const body = (await request.json()) as {
      quizId?: string;
      answers?: Record<string, number>;
    };
    if (!body.quizId || !body.answers) {
      return NextResponse.json({ error: "quizId and answers are required" }, { status: 400 });
    }

    const attempt = await submitQuizAttempt(
      auth.tenantId,
      body.quizId,
      auth.session.userId,
      body.answers,
    );

    void trackSeniorsEvent(auth.tenantId, "quiz_attempt", auth.session.userId, "student", {
      quizId: body.quizId,
      score: attempt.score,
      maxScore: attempt.maxScore,
    }).catch(() => {});

    revalidateSeniorsDashboards(auth.tenantId);
    return NextResponse.json({
      ok: true,
      attempt: {
        id: attempt.id,
        score: attempt.score,
        maxScore: attempt.maxScore,
        submittedAt: attempt.submittedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit quiz";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
