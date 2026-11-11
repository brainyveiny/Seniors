import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireTeacherApi } from "@/infrastructure/seniors/seniors-api-auth";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { normalizeTopicDiagrams } from "@/domain/seniors/topic-diagrams";

type RouteContext = { params: Promise<{ slug: string; topicId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug, topicId } = await context.params;
  const auth = await requireTeacherApi(request, slug);
  if (isApiError(auth)) return auth;

  const prisma = getPrismaClient();
  const topic = await prisma.seniorsTopic.findFirst({
    where: { tenantId: auth.tenantId, id: topicId },
    include: {
      chapter: { include: { subject: true } },
      contents: { orderBy: { sortOrder: "asc" } },
      topicLinks: {
        include: { assignment: true },
      },
    },
  });

  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const quizRows = await prisma.seniorsQuiz.findMany({
    where: { tenantId: auth.tenantId, topicId: topic.id },
    orderBy: { updatedAt: "desc" },
  });

  const useDraft = Boolean(topic.draftUpdatedAt);
  const quizzes = quizRows.map((quiz) => {
    const quizDraft =
      quiz.status === "draft" &&
      Array.isArray(quiz.draftQuestions) &&
      quiz.draftQuestions.length > 0;
    return {
      id: quiz.id,
      title:
        quiz.status === "draft" && quiz.draftTitle.trim()
          ? quiz.draftTitle
          : quiz.title,
      questions: quizDraft ? quiz.draftQuestions : quiz.questions,
    };
  });

  return NextResponse.json({
    topic: {
      id: topic.id,
      slug: topic.slug,
      number: topic.number,
      title: topic.title,
      subjectName: topic.chapter.subject.name,
      chapterName: topic.chapter.name,
      chapterNumber: topic.chapter.number,
      learningObjective: useDraft ? topic.draftLearningObjective : topic.learningObjective,
      teacherExplanation: useDraft
        ? topic.draftTeacherExplanation
        : topic.teacherExplanation,
      keywords: useDraft ? topic.draftKeywords : topic.keywords,
      diagramUrl: useDraft ? topic.draftDiagramUrl : topic.diagramUrl,
      diagrams: useDraft
        ? normalizeTopicDiagrams(topic.draftDiagrams, topic.draftDiagramUrl)
        : normalizeTopicDiagrams(topic.diagrams, topic.diagramUrl),
      contentStatus:
        (useDraft ? topic.draftContentStatus : topic.contentStatus) || topic.contentStatus,
      contents: topic.contents.map((c) => ({
        id: c.id,
        contentType: c.contentType,
        title: c.title,
        body: c.body,
        fileUrl: c.fileUrl,
        uploadedByName: c.uploadedByName,
        updatedAt: c.updatedAt,
      })),
      homework: topic.topicLinks.map((l) => ({
        id: l.assignment.id,
        title: l.assignment.title,
        dueAt: l.assignment.dueAt,
        questionCount: l.assignment.questionCount,
      })),
      quizzes,
      quiz: quizzes[0] ?? null,
      prevSlug: null,
      nextSlug: null,
      prevTitle: null,
      nextTitle: null,
      topicPosition: 1,
      topicTotal: 1,
    },
  });
}
