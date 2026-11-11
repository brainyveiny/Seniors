import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireTeacherApi } from "@/infrastructure/seniors/seniors-api-auth";
import {
  reorderTopicContent,
  updateTopicDraft,
} from "@/infrastructure/seniors/seniors-mutations";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import {
  normalizeTopicDiagrams,
  type TopicDiagramItem,
} from "@/domain/seniors/topic-diagrams";
import { revalidateSeniorsDashboards } from "@/infrastructure/seniors/seniors-dashboard-cache";

type RouteContext = { params: Promise<{ slug: string; topicId: string }> };

function withDraft<T>(draftValue: T, publishedValue: T, hasDraft: boolean) {
  return hasDraft ? draftValue : publishedValue;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug, topicId } = await context.params;
  const auth = await requireTeacherApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const prisma = getPrismaClient();
  const topic = await prisma.seniorsTopic.findFirst({
    where: { tenantId: auth.tenantId, id: topicId },
    include: {
      chapter: { include: { subject: true } },
      contents: { orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }] },
    },
  });
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const quizRows = await prisma.seniorsQuiz.findMany({
    where: { tenantId: auth.tenantId, topicId: topic.id },
    orderBy: { updatedAt: "desc" },
  });

  const hasDraft = Boolean(topic.draftUpdatedAt);
  const diagrams = hasDraft
    ? normalizeTopicDiagrams(topic.draftDiagrams, topic.draftDiagramUrl)
    : normalizeTopicDiagrams(topic.diagrams, topic.diagramUrl);

  const quizzes = quizRows.map((quiz) => {
    const useDraft =
      quiz.status === "draft" &&
      Array.isArray(quiz.draftQuestions) &&
      quiz.draftQuestions.length > 0;
    return {
      id: quiz.id,
      title:
        quiz.status === "draft" && quiz.draftTitle.trim()
          ? quiz.draftTitle
          : quiz.title,
      status: quiz.status,
      questions: useDraft ? quiz.draftQuestions : quiz.questions,
      draftUpdatedAt: quiz.draftUpdatedAt,
      publishedAt: quiz.publishedAt,
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
        draftUpdatedAt: topic.draftUpdatedAt,
        publishedAt: topic.publishedAt,
        learningObjective: withDraft(
          topic.draftLearningObjective,
          topic.learningObjective,
          hasDraft,
        ),
        teacherExplanation: withDraft(
          topic.draftTeacherExplanation,
          topic.teacherExplanation,
          hasDraft,
        ),
        keywords: withDraft(topic.draftKeywords, topic.keywords, hasDraft),
        diagramUrl: diagrams[0]?.url ?? "",
        diagrams,
        contentStatus:
          withDraft(topic.draftContentStatus, topic.contentStatus, hasDraft) || "missing",
        markingScheme: withDraft(topic.draftMarkingScheme, topic.markingScheme, hasDraft),
        answerFormat: withDraft(topic.draftAnswerFormat, topic.answerFormat, hasDraft),
        revisionChecklist: withDraft(
          topic.draftRevisionChecklist,
          topic.revisionChecklist,
          hasDraft,
        ),
      },
      contents: topic.contents.map((content) => ({
        id: content.id,
        title: content.title,
        body: content.body,
        contentType: content.contentType,
        fileUrl: content.fileUrl,
        bodyFormat: content.bodyFormat,
        status: content.status,
        sortOrder: content.sortOrder,
        uploadedByName: content.uploadedByName,
        updatedAt: content.updatedAt,
      })),
      quizzes,
      quiz: quizzes[0] ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load topic";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { slug, topicId } = await context.params;
  const auth = await requireTeacherApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const body = (await request.json()) as {
      action?: "update-draft" | "reorder-content";
      learningObjective?: string;
      teacherExplanation?: string;
      keywords?: string[];
      diagramUrl?: string;
      diagrams?: TopicDiagramItem[];
      revisionChecklist?: string[];
      markingScheme?: string;
      answerFormat?: string;
      contentStatus?: string;
      contentIds?: string[];
    };

    if (body.action === "reorder-content") {
      await reorderTopicContent(auth.tenantId, topicId, body.contentIds ?? []);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true });
    }

    const topic = await updateTopicDraft(auth.tenantId, {
      topicId,
      learningObjective: body.learningObjective,
      teacherExplanation: body.teacherExplanation,
      keywords: body.keywords,
      diagramUrl: body.diagramUrl,
      diagrams: body.diagrams,
      revisionChecklist: body.revisionChecklist,
      markingScheme: body.markingScheme,
      answerFormat: body.answerFormat,
      contentStatus: body.contentStatus,
    });

    revalidateSeniorsDashboards(auth.tenantId);
    return NextResponse.json({ ok: true, topic });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save topic draft";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
