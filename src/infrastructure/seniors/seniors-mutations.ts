import { getPrismaClient } from "@/infrastructure/database/prisma";
import { hashPassword } from "@/infrastructure/auth/password";
import { getActiveAcademicYearId } from "@/infrastructure/seniors/seniors-repository";
import type { SeniorsQuizQuestion } from "@/domain/seniors/types";
import {
  diagramsPayload,
  normalizeTopicDiagrams,
  type TopicDiagramItem,
} from "@/domain/seniors/topic-diagrams";
import type { Prisma } from "@prisma/client";

function newUserId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function createTopicContent(
  tenantId: string,
  input: {
    topicId: string;
    contentType: string;
    title: string;
    body?: string;
    fileUrl?: string;
    uploadedById?: string;
    uploadedByName?: string;
    status?: "draft" | "published";
    bodyFormat?: string;
    markingScheme?: string;
    answerFormat?: string;
    keywords?: string[];
    learningObjective?: string;
    revisionChecklist?: string[];
    teacherExplanation?: string;
    diagramUrl?: string;
    diagrams?: TopicDiagramItem[];
    contentStatus?: string;
  },
) {
  const prisma = getPrismaClient();
  const topic = await prisma.seniorsTopic.findFirst({
    where: { id: input.topicId, tenantId },
  });
  if (!topic) throw new Error("Topic not found");

  const content = await prisma.seniorsTopicContent.create({
    data: {
      tenantId,
      topicId: topic.id,
      academicYearId: topic.academicYearId,
      contentType: input.contentType,
      title: input.title.trim(),
      body: input.body?.trim() ?? "",
      fileUrl: input.fileUrl?.trim() ?? "",
      uploadedById: input.uploadedById,
      uploadedByName: input.uploadedByName ?? "",
      status: input.status ?? "draft",
      bodyFormat: input.bodyFormat?.trim() || "html",
      publishedAt: input.status === "published" ? new Date() : null,
    },
  });

  const diagramUpdate =
    input.diagrams !== undefined
      ? diagramsPayload(input.diagrams)
      : input.diagramUrl !== undefined
        ? diagramsPayload([{ url: input.diagramUrl, caption: "" }])
        : null;

  await prisma.seniorsTopic.update({
    where: { id: topic.id },
    data: {
      ...(input.learningObjective !== undefined
        ? { draftLearningObjective: input.learningObjective }
        : {}),
      ...(input.markingScheme !== undefined ? { draftMarkingScheme: input.markingScheme } : {}),
      ...(input.answerFormat !== undefined ? { draftAnswerFormat: input.answerFormat } : {}),
      ...(input.keywords !== undefined ? { draftKeywords: input.keywords } : {}),
      ...(input.revisionChecklist !== undefined
        ? { draftRevisionChecklist: input.revisionChecklist }
        : {}),
      ...(input.teacherExplanation !== undefined
        ? { draftTeacherExplanation: input.teacherExplanation }
        : {}),
      ...(diagramUpdate
        ? {
            draftDiagramUrl: diagramUpdate.diagramUrl,
            draftDiagrams: diagramUpdate.diagrams as Prisma.InputJsonValue,
          }
        : {}),
      ...(input.contentStatus !== undefined ? { draftContentStatus: input.contentStatus } : {}),
      draftUpdatedAt: new Date(),
    },
  });

  return content;
}

export async function updateTopicDraft(
  tenantId: string,
  input: {
    topicId: string;
    learningObjective?: string;
    teacherExplanation?: string;
    keywords?: string[];
    diagramUrl?: string;
    diagrams?: TopicDiagramItem[];
    revisionChecklist?: string[];
    markingScheme?: string;
    answerFormat?: string;
    contentStatus?: string;
  },
) {
  const prisma = getPrismaClient();
  const topic = await prisma.seniorsTopic.findFirst({
    where: { id: input.topicId, tenantId },
  });
  if (!topic) throw new Error("Topic not found");

  const resolvedDiagrams =
    input.diagrams !== undefined
      ? diagramsPayload(input.diagrams)
      : input.diagramUrl !== undefined
        ? diagramsPayload([{ url: input.diagramUrl.trim(), caption: "" }])
        : null;

  return prisma.seniorsTopic.update({
    where: { id: topic.id },
    data: {
      ...(input.learningObjective !== undefined
        ? { draftLearningObjective: input.learningObjective.trim() }
        : {}),
      ...(input.teacherExplanation !== undefined
        ? { draftTeacherExplanation: input.teacherExplanation.trim() }
        : {}),
      ...(input.keywords !== undefined ? { draftKeywords: input.keywords } : {}),
      ...(resolvedDiagrams
        ? {
            draftDiagramUrl: resolvedDiagrams.diagramUrl,
            draftDiagrams: resolvedDiagrams.diagrams as Prisma.InputJsonValue,
          }
        : {}),
      ...(input.revisionChecklist !== undefined
        ? { draftRevisionChecklist: input.revisionChecklist }
        : {}),
      ...(input.markingScheme !== undefined ? { draftMarkingScheme: input.markingScheme } : {}),
      ...(input.answerFormat !== undefined ? { draftAnswerFormat: input.answerFormat } : {}),
      ...(input.contentStatus !== undefined ? { draftContentStatus: input.contentStatus } : {}),
      draftUpdatedAt: new Date(),
    },
  });
}

export async function updateTopicContent(
  tenantId: string,
  input: {
    contentId: string;
    title?: string;
    body?: string;
    contentType?: string;
    fileUrl?: string;
    sortOrder?: number;
  },
) {
  const prisma = getPrismaClient();
  const existing = await prisma.seniorsTopicContent.findFirst({
    where: { id: input.contentId, tenantId },
  });
  if (!existing) throw new Error("Content not found");

  return prisma.seniorsTopicContent.update({
    where: { id: existing.id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.contentType !== undefined ? { contentType: input.contentType } : {}),
      ...(input.fileUrl !== undefined ? { fileUrl: input.fileUrl.trim() } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      status: "draft",
      publishedAt: null,
    },
  });
}

export async function deleteTopicContent(tenantId: string, contentId: string) {
  const prisma = getPrismaClient();
  const existing = await prisma.seniorsTopicContent.findFirst({
    where: { id: contentId, tenantId },
  });
  if (!existing) throw new Error("Content not found");
  await prisma.seniorsTopicContent.delete({ where: { id: existing.id } });
}

export async function reorderTopicContent(
  tenantId: string,
  topicId: string,
  contentIds: string[],
) {
  const prisma = getPrismaClient();
  const items = await prisma.seniorsTopicContent.findMany({
    where: { tenantId, topicId, id: { in: contentIds } },
    select: { id: true },
  });
  if (items.length !== contentIds.length) throw new Error("Some content items were not found");

  await prisma.$transaction(
    contentIds.map((id, index) =>
      prisma.seniorsTopicContent.update({
        where: { id },
        data: { sortOrder: index + 1, status: "draft", publishedAt: null },
      }),
    ),
  );
}

export async function createAssignment(
  tenantId: string,
  input: {
    title: string;
    description?: string;
    subjectName?: string;
    chapterName?: string;
    dueAt: string | Date;
    questionCount?: number;
    topicIds?: string[];
    targetClassId?: string | null;
    attachmentUrls?: string[];
    createdById?: string;
    createdByName?: string;
  },
) {
  const prisma = getPrismaClient();
  const academicYearId = await getActiveAcademicYearId(tenantId);
  if (!academicYearId) throw new Error("No active academic year");

  if (input.targetClassId) {
    const klass = await prisma.seniorsClass.findFirst({
      where: { id: input.targetClassId, tenantId },
    });
    if (!klass) throw new Error("Target class not found");
  }

  const attachmentUrls = (input.attachmentUrls ?? [])
    .map((url) => url.trim())
    .filter(Boolean);

  const assignment = await prisma.seniorsAssignment.create({
    data: {
      tenantId,
      academicYearId,
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      subjectName: input.subjectName?.trim() ?? "",
      chapterName: input.chapterName?.trim() ?? "",
      targetClassId: input.targetClassId || null,
      dueAt: new Date(input.dueAt),
      questionCount: input.questionCount ?? 0,
      attachmentUrls,
      createdById: input.createdById,
      createdByName: input.createdByName ?? "",
      topicLinks: input.topicIds?.length
        ? {
            create: input.topicIds.map((topicId) => ({ topicId })),
          }
        : undefined,
    },
  });
  return assignment;
}

type SchoolExamInput = {
  title: string;
  subjectName?: string;
  examAt: string | Date;
  targetClassId?: string | null;
};

async function resolveExamClass(
  tenantId: string,
  targetClassId?: string | null,
) {
  if (!targetClassId) return null;
  const klass = await getPrismaClient().seniorsClass.findFirst({
    where: { id: targetClassId, tenantId },
    select: { id: true, name: true, section: true },
  });
  if (!klass) throw new Error("Target class not found");
  return klass;
}

export async function createSchoolExam(
  tenantId: string,
  input: SchoolExamInput,
) {
  const title = input.title.trim();
  const examAt = new Date(input.examAt);
  if (!title) throw new Error("Exam title is required");
  if (Number.isNaN(examAt.getTime())) throw new Error("Valid exam date is required");

  const klass = await resolveExamClass(tenantId, input.targetClassId);
  return getPrismaClient().seniorsExam.create({
    data: {
      tenantId,
      title,
      subjectName: input.subjectName?.trim() ?? "",
      examAt,
      targetClassId: klass?.id ?? null,
      className: klass ? `${klass.name}${klass.section ? ` ${klass.section}` : ""}` : "",
    },
  });
}

export async function updateSchoolExam(
  tenantId: string,
  examId: string,
  input: SchoolExamInput,
) {
  const prisma = getPrismaClient();
  const existing = await prisma.seniorsExam.findFirst({
    where: { id: examId, tenantId },
    select: { id: true },
  });
  if (!existing) throw new Error("Exam not found");

  const title = input.title.trim();
  const examAt = new Date(input.examAt);
  if (!title) throw new Error("Exam title is required");
  if (Number.isNaN(examAt.getTime())) throw new Error("Valid exam date is required");

  const klass = await resolveExamClass(tenantId, input.targetClassId);
  return prisma.seniorsExam.update({
    where: { id: existing.id },
    data: {
      title,
      subjectName: input.subjectName?.trim() ?? "",
      examAt,
      targetClassId: klass?.id ?? null,
      className: klass ? `${klass.name}${klass.section ? ` ${klass.section}` : ""}` : "",
    },
  });
}

export async function deleteSchoolExam(tenantId: string, examId: string) {
  const prisma = getPrismaClient();
  const existing = await prisma.seniorsExam.findFirst({
    where: { id: examId, tenantId },
    select: { id: true },
  });
  if (!existing) throw new Error("Exam not found");
  await prisma.seniorsExam.delete({ where: { id: existing.id } });
}

export async function deleteSchoolExams(tenantId: string, examIds: string[]) {
  const prisma = getPrismaClient();
  const unique = [...new Set(examIds.map((id) => id.trim()).filter(Boolean))];
  const deleted: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  for (const id of unique) {
    try {
      await deleteSchoolExam(tenantId, id);
      deleted.push(id);
    } catch (error) {
      skipped.push({
        id,
        reason: error instanceof Error ? error.message : "Failed",
      });
    }
  }
  return { deleted, skipped };
}

export async function updateSchoolExamsClass(
  tenantId: string,
  examIds: string[],
  targetClassId: string | null,
) {
  const prisma = getPrismaClient();
  const unique = [...new Set(examIds.map((id) => id.trim()).filter(Boolean))];
  const klass = await resolveExamClass(tenantId, targetClassId);
  const classLabel = klass
    ? `${klass.name}${klass.section ? ` ${klass.section}` : ""}`
    : "Whole school";
  const updated: string[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const id of unique) {
    const existing = await prisma.seniorsExam.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) {
      skipped.push({ id, reason: "Exam not found" });
      continue;
    }
    await prisma.seniorsExam.update({
      where: { id },
      data: {
        targetClassId: klass?.id ?? null,
        className: klass ? classLabel : "",
      },
    });
    updated.push(id);
  }

  return { updated, skipped, classLabel, targetClassId: klass?.id ?? null };
}

export async function createQuiz(
  tenantId: string,
  input: {
    topicId: string;
    title: string;
    questions: SeniorsQuizQuestion[];
    mode?: "draft" | "published";
  },
) {
  const prisma = getPrismaClient();
  const topic = await prisma.seniorsTopic.findFirst({
    where: { id: input.topicId, tenantId },
  });
  if (!topic) throw new Error("Topic not found");

  const questions = input.questions.map((q, i) => ({
    id: q.id || `q${i + 1}`,
    prompt: q.prompt.trim(),
    options: q.options.map((o) => o.trim()).filter(Boolean),
    correctIndex: q.correctIndex,
    explanation: q.explanation?.trim() ?? "",
    diagramUrl: q.diagramUrl?.trim() ?? "",
  }));
  const mode = input.mode ?? "draft";

  return prisma.seniorsQuiz.create({
    data: {
      tenantId,
      topicId: topic.id,
      title: mode === "published" ? input.title.trim() : input.title.trim() || topic.title,
      questions: mode === "published" ? questions : [],
      draftTitle: input.title.trim(),
      draftQuestions: questions,
      status: mode,
      draftUpdatedAt: new Date(),
      publishedAt: mode === "published" ? new Date() : null,
    },
  });
}

export async function updateQuizDraft(
  tenantId: string,
  input: {
    quizId: string;
    title: string;
    questions: SeniorsQuizQuestion[];
    mode?: "draft" | "published";
  },
) {
  const prisma = getPrismaClient();
  const existing = await prisma.seniorsQuiz.findFirst({
    where: { id: input.quizId, tenantId },
  });
  if (!existing) throw new Error("Quiz not found");

  const questions = input.questions.map((q, i) => ({
    id: q.id || `q${i + 1}`,
    prompt: q.prompt.trim(),
    options: q.options.map((o) => o.trim()).filter(Boolean),
    correctIndex: q.correctIndex,
    explanation: q.explanation?.trim() ?? "",
    diagramUrl: q.diagramUrl?.trim() ?? "",
  }));
  const mode = input.mode ?? "draft";

  return prisma.seniorsQuiz.update({
    where: { id: existing.id },
    data: {
      ...(mode === "published"
        ? {
            title: input.title.trim(),
            questions,
            publishedAt: new Date(),
            status: "published",
            draftUpdatedAt: null,
          }
        : {
            status: "draft",
            draftUpdatedAt: new Date(),
          }),
      draftTitle: input.title.trim(),
      draftQuestions: questions,
    },
  });
}

/** @deprecated Prefer createQuiz / updateQuizDraft -kept for older callers. */
export async function upsertQuiz(
  tenantId: string,
  input: {
    topicId: string;
    quizId?: string;
    title: string;
    questions: SeniorsQuizQuestion[];
    mode?: "draft" | "published";
  },
) {
  if (input.quizId) {
    return updateQuizDraft(tenantId, {
      quizId: input.quizId,
      title: input.title,
      questions: input.questions,
      mode: input.mode,
    });
  }
  return createQuiz(tenantId, input);
}

export async function deleteQuiz(tenantId: string, quizId: string) {
  const prisma = getPrismaClient();
  const existing = await prisma.seniorsQuiz.findFirst({
    where: { id: quizId, tenantId },
    select: { id: true },
  });
  if (!existing) throw new Error("Quiz not found");
  await prisma.seniorsQuiz.delete({ where: { id: existing.id } });
}

export async function publishTopicDraft(tenantId: string, topicId: string) {
  const prisma = getPrismaClient();
  const topic = await prisma.seniorsTopic.findFirst({
    where: { id: topicId, tenantId },
    include: {
      contents: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!topic) throw new Error("Topic not found");

  const quizRows = await prisma.seniorsQuiz.findMany({
    where: { tenantId, topicId: topic.id },
  });

  const nextStatus = topic.draftContentStatus.trim() || topic.contentStatus || "in_progress";
  await prisma.$transaction(async (tx) => {
    await tx.seniorsTopic.update({
      where: { id: topic.id },
      data: {
        learningObjective: topic.draftLearningObjective.trim() || topic.learningObjective,
        teacherExplanation: topic.draftTeacherExplanation.trim() || topic.teacherExplanation,
        keywords: topic.draftKeywords.length > 0 ? topic.draftKeywords : topic.keywords,
        diagramUrl: topic.draftDiagramUrl.trim() || topic.diagramUrl,
        diagrams: (() => {
          const draft = normalizeTopicDiagrams(topic.draftDiagrams, topic.draftDiagramUrl);
          if (draft.length > 0) return draft as Prisma.InputJsonValue;
          return normalizeTopicDiagrams(topic.diagrams, topic.diagramUrl) as Prisma.InputJsonValue;
        })(),
        contentStatus: nextStatus,
        markingScheme: topic.draftMarkingScheme.trim() || topic.markingScheme,
        answerFormat: topic.draftAnswerFormat.trim() || topic.answerFormat,
        revisionChecklist:
          topic.draftRevisionChecklist.length > 0
            ? topic.draftRevisionChecklist
            : topic.revisionChecklist,
        draftUpdatedAt: null,
        publishedAt: new Date(),
      },
    });

    const draftContents = topic.contents.filter((c) => c.status === "draft");
    for (const content of draftContents) {
      await tx.seniorsTopicContent.update({
        where: { id: content.id },
        data: { status: "published", publishedAt: new Date() },
      });
    }

    for (const quiz of quizRows) {
      const draftQuestions = Array.isArray(quiz.draftQuestions) ? quiz.draftQuestions : [];
      if (quiz.status !== "draft" && draftQuestions.length === 0) continue;
      await tx.seniorsQuiz.update({
        where: { id: quiz.id },
        data: {
          title: quiz.draftTitle.trim() || quiz.title,
          questions: (draftQuestions.length > 0
            ? draftQuestions
            : quiz.questions ?? []) as Prisma.InputJsonValue,
          status: "published",
          draftUpdatedAt: null,
          publishedAt: new Date(),
        },
      });
    }
  });
}

type AnnouncementAudienceInput = {
  source?: "school" | "teacher";
  audienceType?: "all" | "roles" | "people";
  audienceRoles?: string[];
  targetClassIds?: string[];
  targetUserIds?: string[];
};

function normalizeAnnouncementAudience(input: AnnouncementAudienceInput) {
  const source = input.source ?? "teacher";
  const audienceType =
    input.audienceType ?? (source === "teacher" ? "roles" : "all");
  const audienceRoles =
    input.audienceRoles && input.audienceRoles.length > 0
      ? [...new Set(input.audienceRoles)]
      : audienceType === "roles" && source === "teacher"
        ? ["student"]
        : ["student", "teacher", "parent"];
  return {
    audienceType,
    audienceRoles,
    targetClassIds: [...new Set((input.targetClassIds ?? []).filter(Boolean))],
    targetUserIds: [...new Set((input.targetUserIds ?? []).filter(Boolean))],
  };
}

export async function createAnnouncement(
  tenantId: string,
  input: {
    title: string;
    body: string;
    createdByName?: string;
    icon?: string;
    source?: "school" | "teacher";
    audienceType?: "all" | "roles" | "people";
    audienceRoles?: string[];
    targetClassIds?: string[];
    targetUserIds?: string[];
  },
) {
  const prisma = getPrismaClient();
  const source = input.source ?? "teacher";
  const audience = normalizeAnnouncementAudience({ ...input, source });
  const baseData = {
    tenantId,
    title: input.title.trim(),
    body: input.body.trim(),
    icon: input.icon ?? "megaphone",
    source,
    createdByName: input.createdByName ?? "",
  };

  try {
    return await prisma.seniorsAnnouncement.create({
      data: { ...baseData, ...audience },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("Unknown argument `audienceType`")) throw error;

    const created = await prisma.seniorsAnnouncement.create({ data: baseData });
    await prisma.$executeRawUnsafe(
      `UPDATE "SeniorsAnnouncement"
       SET "audienceType" = $1,
           "audienceRoles" = $2::jsonb,
           "targetClassIds" = $3::jsonb,
           "targetUserIds" = $4::jsonb
       WHERE id = $5`,
      audience.audienceType,
      JSON.stringify(audience.audienceRoles),
      JSON.stringify(audience.targetClassIds),
      JSON.stringify(audience.targetUserIds),
      created.id,
    );
    return { ...created, ...audience };
  }
}

export async function updateAnnouncement(
  tenantId: string,
  announcementId: string,
  input: {
    title?: string;
    body?: string;
    audienceType?: "all" | "roles" | "people";
    audienceRoles?: string[];
    targetClassIds?: string[];
    targetUserIds?: string[];
  },
) {
  const prisma = getPrismaClient();
  const existing = await prisma.seniorsAnnouncement.findFirst({
    where: { id: announcementId, tenantId, source: "school" },
  });
  if (!existing) throw new Error("Announcement not found");
  const audience = normalizeAnnouncementAudience({
    source: "school",
    audienceType: input.audienceType ?? (existing.audienceType as "all" | "roles" | "people"),
    audienceRoles: input.audienceRoles,
    targetClassIds: input.targetClassIds,
    targetUserIds: input.targetUserIds,
  });
  return prisma.seniorsAnnouncement.update({
    where: { id: existing.id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.body !== undefined ? { body: input.body.trim() } : {}),
      ...audience,
    },
  });
}

export async function deleteAnnouncement(tenantId: string, announcementId: string) {
  const prisma = getPrismaClient();
  const existing = await prisma.seniorsAnnouncement.findFirst({
    where: { id: announcementId, tenantId, source: "school" },
    select: { id: true },
  });
  if (!existing) throw new Error("Announcement not found");
  await prisma.seniorsAnnouncement.delete({ where: { id: existing.id } });
}

export async function deleteAnnouncements(tenantId: string, announcementIds: string[]) {
  const unique = [...new Set(announcementIds.map((id) => id.trim()).filter(Boolean))];
  const deleted: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  for (const id of unique) {
    try {
      await deleteAnnouncement(tenantId, id);
      deleted.push(id);
    } catch (error) {
      skipped.push({
        id,
        reason: error instanceof Error ? error.message : "Failed",
      });
    }
  }
  return { deleted, skipped };
}

export async function updateAnnouncementsAudience(
  tenantId: string,
  announcementIds: string[],
  input: AnnouncementAudienceInput,
) {
  const prisma = getPrismaClient();
  const unique = [...new Set(announcementIds.map((id) => id.trim()).filter(Boolean))];
  const audience = normalizeAnnouncementAudience({ ...input, source: "school" });
  const updated: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  for (const id of unique) {
    const existing = await prisma.seniorsAnnouncement.findFirst({
      where: { id, tenantId, source: "school" },
      select: { id: true },
    });
    if (!existing) {
      skipped.push({ id, reason: "Announcement not found" });
      continue;
    }
    try {
      await prisma.seniorsAnnouncement.update({
        where: { id: existing.id },
        data: audience,
      });
      updated.push(id);
    } catch (error) {
      skipped.push({
        id,
        reason: error instanceof Error ? error.message : "Failed",
      });
    }
  }
  return { updated, skipped, ...audience };
}

export async function submitAssignment(
  tenantId: string,
  assignmentId: string,
  studentId: string,
  answerText: string,
  attachmentUrls: string[] = [],
) {
  const prisma = getPrismaClient();
  const assignment = await prisma.seniorsAssignment.findFirst({
    where: { id: assignmentId, tenantId },
  });
  if (!assignment) throw new Error("Assignment not found");

  const files = attachmentUrls.map((url) => url.trim()).filter(Boolean);

  return prisma.seniorsAssignmentSubmission.upsert({
    where: {
      assignmentId_studentId: { assignmentId, studentId },
    },
    create: {
      tenantId,
      assignmentId,
      studentId,
      status: "submitted",
      answerText: answerText.trim(),
      attachmentUrls: files,
      submittedAt: new Date(),
    },
    update: {
      status: "submitted",
      answerText: answerText.trim(),
      attachmentUrls: files,
      submittedAt: new Date(),
      score: null,
      feedback: "",
      gradedAt: null,
      gradedByName: "",
    },
  });
}

export async function gradeSubmission(
  tenantId: string,
  submissionId: string,
  input: { score: number; feedback?: string; gradedByName?: string },
) {
  const prisma = getPrismaClient();
  const submission = await prisma.seniorsAssignmentSubmission.findFirst({
    where: { id: submissionId, tenantId },
  });
  if (!submission) throw new Error("Submission not found");

  return prisma.seniorsAssignmentSubmission.update({
    where: { id: submissionId },
    data: {
      status: "graded",
      score: input.score,
      feedback: input.feedback?.trim() ?? "",
      gradedAt: new Date(),
      gradedByName: input.gradedByName ?? "",
    },
  });
}

export async function upsertTopicProgress(
  tenantId: string,
  topicId: string,
  studentId: string,
  input: { progressPercent?: number; isCompleted?: boolean },
) {
  const prisma = getPrismaClient();
  const topic = await prisma.seniorsTopic.findFirst({
    where: { id: topicId, tenantId },
  });
  if (!topic) throw new Error("Topic not found");

  const existing = await prisma.seniorsTopicProgress.findUnique({
    where: { topicId_studentId: { topicId, studentId } },
  });

  const nextPercent = Math.max(
    0,
    Math.min(100, input.progressPercent ?? existing?.progressPercent ?? 0),
  );
  const progressPercent =
    input.isCompleted === true
      ? 100
      : Math.max(existing?.progressPercent ?? 0, nextPercent);
  // Always treat 100% as completed so home/progress/learn stay in sync
  // (even if an earlier quiz attempt set isCompleted=false).
  const isCompleted =
    input.isCompleted === true ||
    existing?.isCompleted === true ||
    progressPercent >= 100;

  return prisma.seniorsTopicProgress.upsert({
    where: { topicId_studentId: { topicId, studentId } },
    create: {
      tenantId,
      topicId,
      studentId,
      progressPercent,
      isCompleted,
      lastVisitedAt: new Date(),
    },
    update: {
      progressPercent,
      isCompleted,
      lastVisitedAt: new Date(),
    },
  });
}

export async function submitQuizAttempt(
  tenantId: string,
  quizId: string,
  studentId: string,
  answers: Record<string, number>,
) {
  const prisma = getPrismaClient();
  const quiz = await prisma.seniorsQuiz.findFirst({
    where: { id: quizId, tenantId },
  });
  if (!quiz) throw new Error("Quiz not found");

  const questions = (quiz.questions as unknown as SeniorsQuizQuestion[]) ?? [];
  let score = 0;
  for (const q of questions) {
    if (answers[q.id] === q.correctIndex) score += 1;
  }
  const maxScore = questions.length || 1;
  const pct = Math.round((score / maxScore) * 100);

  const attempt = await prisma.seniorsQuizAttempt.create({
    data: {
      tenantId,
      quizId,
      studentId,
      answers,
      score,
      maxScore,
      submittedAt: new Date(),
    },
  });

  if (quiz.topicId) {
    await upsertTopicProgress(tenantId, quiz.topicId, studentId, {
      progressPercent: pct >= 60 ? 100 : Math.max(pct, 75),
      isCompleted: pct >= 60,
    });
  }

  return attempt;
}

export async function createSchoolUser(
  tenantId: string,
  input: {
    fullName: string;
    email: string;
    password: string;
    userType: "student" | "parent" | "teacher" | "school-admin";
    phone?: string;
    classId?: string;
    rollNumber?: string;
    childStudentId?: string;
    childStudentIds?: string[];
  },
) {
  const prisma = getPrismaClient();
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.platformUser.findFirst({
    where: { tenantId, email },
  });
  if (existing) throw new Error("Email already exists");

  const user = await prisma.platformUser.create({
    data: {
      id: newUserId(input.userType.slice(0, 3)),
      tenantId,
      fullName: input.fullName.trim(),
      email,
      passwordHash: await hashPassword(input.password),
      phone: input.phone?.trim() ?? "",
      userType: input.userType,
      source: "admin",
      joinedAt: new Date(),
    },
  });

  if (input.userType === "student" && input.classId) {
    await prisma.seniorsStudentProfile.create({
      data: {
        tenantId,
        classId: input.classId,
        studentId: user.id,
        rollNumber: input.rollNumber?.trim() ?? "",
      },
    });
  }

  if (input.userType === "parent") {
    const childIds = [
      ...new Set(
        [...(input.childStudentIds ?? []), input.childStudentId ?? ""]
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];
    if (childIds.length > 0) {
      const valid = await prisma.platformUser.findMany({
        where: { tenantId, userType: "student", id: { in: childIds } },
        select: { id: true },
      });
      if (valid.length > 0) {
        await prisma.seniorsParentChild.createMany({
          data: valid.map((student) => ({
            tenantId,
            parentId: user.id,
            studentId: student.id,
          })),
        });
      }
    }
  }

  return user;
}

export async function updateSchoolUser(
  tenantId: string,
  userId: string,
  input: {
    fullName?: string;
    email?: string;
    password?: string;
    phone?: string;
    classId?: string;
    rollNumber?: string;
  },
) {
  const prisma = getPrismaClient();
  const user = await prisma.platformUser.findFirst({
    where: {
      id: userId,
      tenantId,
      userType: { in: ["teacher", "student", "parent"] },
    },
    include: { seniorsStudentProfile: true },
  });
  if (!user) throw new Error("User not found");

  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();
    const existing = await prisma.platformUser.findFirst({
      where: { tenantId, email, NOT: { id: userId } },
    });
    if (existing) throw new Error("Email already exists");
  }

  const updated = await prisma.platformUser.update({
    where: { id: userId },
    data: {
      ...(input.fullName !== undefined ? { fullName: input.fullName.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
      ...(input.phone !== undefined ? { phone: input.phone.trim() } : {}),
      ...(input.password?.trim()
        ? { passwordHash: await hashPassword(input.password) }
        : {}),
    },
  });

  if (
    user.userType === "student" &&
    (input.classId !== undefined || input.rollNumber !== undefined)
  ) {
    if (user.seniorsStudentProfile) {
      await prisma.seniorsStudentProfile.update({
        where: { studentId: userId },
        data: {
          ...(input.classId !== undefined ? { classId: input.classId } : {}),
          ...(input.rollNumber !== undefined
            ? { rollNumber: input.rollNumber.trim() }
            : {}),
        },
      });
    } else if (input.classId?.trim()) {
      await prisma.seniorsStudentProfile.create({
        data: {
          tenantId,
          studentId: userId,
          classId: input.classId.trim(),
          rollNumber: input.rollNumber?.trim() ?? "",
        },
      });
    }
  }

  return updated;
}

export async function moveStudentsToClass(
  tenantId: string,
  studentIds: string[],
  classId: string,
) {
  const prisma = getPrismaClient();
  const unique = [...new Set(studentIds.map((id) => id.trim()).filter(Boolean))];
  const klass = await prisma.seniorsClass.findFirst({
    where: { id: classId, tenantId },
  });
  if (!klass) throw new Error("Class not found");

  const moved: string[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const studentId of unique) {
    const user = await prisma.platformUser.findFirst({
      where: { id: studentId, tenantId, userType: "student" },
      include: { seniorsStudentProfile: true },
    });
    if (!user) {
      skipped.push({ id: studentId, reason: "Student not found" });
      continue;
    }
    if (user.seniorsStudentProfile) {
      await prisma.seniorsStudentProfile.update({
        where: { studentId },
        data: { classId },
      });
    } else {
      await prisma.seniorsStudentProfile.create({
        data: {
          tenantId,
          studentId,
          classId,
          rollNumber: "",
        },
      });
    }
    moved.push(studentId);
  }

  return {
    moved,
    skipped,
    class: { id: klass.id, name: klass.name, section: klass.section },
  };
}

export async function deleteSchoolUser(tenantId: string, userId: string) {
  const prisma = getPrismaClient();
  const user = await prisma.platformUser.findFirst({
    where: {
      id: userId,
      tenantId,
      userType: { in: ["teacher", "student", "parent"] },
    },
  });
  if (!user) throw new Error("User not found");

  await prisma.platformUser.delete({ where: { id: userId } });
  return { id: userId };
}

export async function deleteSchoolUsers(
  tenantId: string,
  userIds: string[],
  userType?: "teacher" | "student" | "parent",
) {
  const unique = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  const deleted: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  for (const id of unique) {
    try {
      const prisma = getPrismaClient();
      const user = await prisma.platformUser.findFirst({
        where: {
          id,
          tenantId,
          ...(userType ? { userType } : { userType: { in: ["teacher", "student", "parent"] } }),
        },
      });
      if (!user) {
        skipped.push({ id, reason: "User not found" });
        continue;
      }
      await prisma.platformUser.delete({ where: { id } });
      deleted.push(id);
    } catch (error) {
      skipped.push({
        id,
        reason: error instanceof Error ? error.message : "Failed",
      });
    }
  }
  return { deleted, skipped };
}

export async function addAssignmentToTeachers(
  tenantId: string,
  teacherIds: string[],
  assignment: { classId: string; subjectId: string },
) {
  const prisma = getPrismaClient();
  const unique = [...new Set(teacherIds.map((id) => id.trim()).filter(Boolean))];
  const subject = await prisma.seniorsSubject.findFirst({
    where: {
      id: assignment.subjectId,
      tenantId,
      classId: assignment.classId,
    },
    include: {
      class: { select: { id: true, name: true, section: true } },
    },
  });
  if (!subject) throw new Error("Subject does not belong to the selected class");

  const added: {
    teacherId: string;
    classId: string;
    className: string;
    section: string;
    subjectId: string;
    subjectName: string;
  }[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const teacherId of unique) {
    const teacher = await prisma.platformUser.findFirst({
      where: { id: teacherId, tenantId, userType: "teacher" },
    });
    if (!teacher) {
      skipped.push({ id: teacherId, reason: "Teacher not found" });
      continue;
    }
    const existing = await prisma.seniorsTeacherAssignment.findFirst({
      where: {
        tenantId,
        teacherId,
        classId: assignment.classId,
        subjectId: assignment.subjectId,
      },
    });
    if (existing) {
      skipped.push({ id: teacherId, reason: "Already assigned" });
      continue;
    }
    await prisma.seniorsTeacherAssignment.create({
      data: {
        tenantId,
        teacherId,
        classId: assignment.classId,
        subjectId: assignment.subjectId,
      },
    });
    added.push({
      teacherId,
      classId: subject.class.id,
      className: subject.class.name,
      section: subject.class.section,
      subjectId: subject.id,
      subjectName: subject.name,
    });
  }

  return { added, skipped };
}

export async function setParentChildren(
  tenantId: string,
  parentId: string,
  studentIds: string[],
) {
  const prisma = getPrismaClient();
  const parent = await prisma.platformUser.findFirst({
    where: { id: parentId, tenantId, userType: "parent" },
  });
  if (!parent) throw new Error("Parent not found");

  const unique = [...new Set(studentIds.map((id) => id.trim()).filter(Boolean))];
  const validStudents = unique.length
    ? await prisma.platformUser.findMany({
        where: { tenantId, userType: "student", id: { in: unique } },
        select: { id: true },
      })
    : [];
  const nextIds = new Set(validStudents.map((s) => s.id));

  const existing = await prisma.seniorsParentChild.findMany({
    where: { tenantId, parentId },
  });
  const existingIds = new Set(existing.map((link) => link.studentId));
  const toAdd = [...nextIds].filter((id) => !existingIds.has(id));
  const toRemove = existing.filter((link) => !nextIds.has(link.studentId));

  if (toAdd.length > 0) {
    await prisma.seniorsParentChild.createMany({
      data: toAdd.map((studentId) => ({ tenantId, parentId, studentId })),
    });
  }
  if (toRemove.length > 0) {
    await prisma.seniorsParentChild.deleteMany({
      where: { id: { in: toRemove.map((link) => link.id) } },
    });
  }

  return { linked: [...nextIds] };
}

export async function unlinkParentChild(
  tenantId: string,
  parentId: string,
  studentId: string,
) {
  const prisma = getPrismaClient();
  const link = await prisma.seniorsParentChild.findFirst({
    where: { tenantId, parentId, studentId },
  });
  if (!link) throw new Error("Parent link not found");

  await prisma.seniorsParentChild.delete({ where: { id: link.id } });
  return { ok: true };
}

export async function upsertSchoolSettings(
  tenantId: string,
  input: {
    schoolName?: string;
    logoUrl?: string;
    primaryColor?: string;
    markingScheme?: string;
    answerFormat?: string;
  },
) {
  const prisma = getPrismaClient();
  const createBase = {
    tenantId,
    schoolName: input.schoolName ?? "",
    primaryColor: input.primaryColor ?? "#2563EB",
    markingScheme: input.markingScheme ?? "",
    answerFormat: input.answerFormat ?? "",
  };
  const updateBase = {
    ...(input.schoolName !== undefined ? { schoolName: input.schoolName } : {}),
    ...(input.primaryColor !== undefined ? { primaryColor: input.primaryColor } : {}),
    ...(input.markingScheme !== undefined ? { markingScheme: input.markingScheme } : {}),
    ...(input.answerFormat !== undefined ? { answerFormat: input.answerFormat } : {}),
  };

  try {
    return await prisma.seniorsSchoolSettings.upsert({
      where: { tenantId },
      create: { ...createBase, logoUrl: input.logoUrl ?? "" },
      update: {
        ...updateBase,
        ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("Unknown argument `logoUrl`")) throw error;

    const row = await prisma.seniorsSchoolSettings.upsert({
      where: { tenantId },
      create: createBase,
      update: updateBase,
    });
    if (input.logoUrl !== undefined) {
      await prisma.$executeRawUnsafe(
        `UPDATE "SeniorsSchoolSettings" SET "logoUrl" = $1 WHERE "tenantId" = $2`,
        input.logoUrl,
        tenantId,
      );
    }
    return { ...row, logoUrl: input.logoUrl ?? "" };
  }
}

export async function ensureTopicSlug(tenantId: string, title: string) {
  const base = slugify(title) || "topic";
  const prisma = getPrismaClient();
  const yearId = await getActiveAcademicYearId(tenantId);
  if (!yearId) return base;
  let slug = base;
  let i = 1;
  while (
    await prisma.seniorsTopic.findFirst({
      where: { tenantId, academicYearId: yearId, slug },
    })
  ) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export async function createCurriculumTopic(
  tenantId: string,
  input: {
    subjectId: string;
    chapterId?: string;
    chapterName?: string;
    chapterNumber?: number;
    title: string;
    number?: string;
  },
) {
  const prisma = getPrismaClient();
  const academicYearId = await getActiveAcademicYearId(tenantId);
  if (!academicYearId) throw new Error("No active academic year");

  const subject = await prisma.seniorsSubject.findFirst({
    where: { id: input.subjectId, tenantId },
  });
  if (!subject) throw new Error("Subject not found");

  let chapterId = input.chapterId;
  if (chapterId) {
    const chapter = await prisma.seniorsChapter.findFirst({
      where: { id: chapterId, tenantId, subjectId: subject.id },
    });
    if (!chapter) throw new Error("Chapter not found for this subject");
  } else {
    const chapterName = input.chapterName?.trim();
    if (!chapterName) throw new Error("Chapter name is required");
    const existing = await prisma.seniorsChapter.findFirst({
      where: {
        tenantId,
        subjectId: subject.id,
        name: { equals: chapterName, mode: "insensitive" },
      },
    });
    if (existing) {
      chapterId = existing.id;
    } else {
      const created = await prisma.seniorsChapter.create({
        data: {
          tenantId,
          subjectId: subject.id,
          name: chapterName,
          number: input.chapterNumber ?? 1,
          sortOrder: input.chapterNumber ?? 1,
        },
      });
      chapterId = created.id;
    }
  }

  const title = input.title.trim();
  if (!title) throw new Error("Topic title is required");
  const slug = await ensureTopicSlug(tenantId, title);
  const topicCount = await prisma.seniorsTopic.count({
    where: { tenantId, chapterId },
  });

  const topic = await prisma.seniorsTopic.create({
    data: {
      tenantId,
      chapterId,
      academicYearId,
      slug,
      title,
      number: input.number?.trim() || `${topicCount + 1}`,
      contentStatus: "missing",
      sortOrder: topicCount + 1,
    },
    include: {
      chapter: { include: { subject: true } },
    },
  });

  return topic;
}

export async function createSchoolClass(
  tenantId: string,
  input: {
    name: string;
    section?: string;
    board?: string;
    sortOrder?: number;
  },
) {
  const prisma = getPrismaClient();
  const name = input.name.trim() || "Class";
  const section = (input.section ?? "").trim().toUpperCase();
  const existing = await prisma.seniorsClass.findFirst({
    where: {
      tenantId,
      name: { equals: name, mode: "insensitive" },
      section: { equals: section, mode: "insensitive" },
    },
  });
  if (existing) throw new Error("Class with this name and section already exists");

  return prisma.seniorsClass.create({
    data: {
      tenantId,
      name,
      section,
      board: input.board?.trim() || "CBSE",
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function updateSchoolClass(
  tenantId: string,
  classId: string,
  input: {
    name?: string;
    section?: string;
    board?: string;
    sortOrder?: number;
  },
) {
  const prisma = getPrismaClient();
  const klass = await prisma.seniorsClass.findFirst({
    where: { id: classId, tenantId },
  });
  if (!klass) throw new Error("Class not found");

  const name = input.name !== undefined ? input.name.trim() : klass.name;
  const section =
    input.section !== undefined ? input.section.trim().toUpperCase() : klass.section;

  const clash = await prisma.seniorsClass.findFirst({
    where: {
      tenantId,
      name: { equals: name, mode: "insensitive" },
      section: { equals: section, mode: "insensitive" },
      NOT: { id: classId },
    },
  });
  if (clash) throw new Error("Class with this name and section already exists");

  return prisma.seniorsClass.update({
    where: { id: classId },
    data: {
      name,
      section,
      ...(input.board !== undefined ? { board: input.board.trim() || "CBSE" } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });
}

export async function deleteSchoolClass(tenantId: string, classId: string) {
  const prisma = getPrismaClient();
  const klass = await prisma.seniorsClass.findFirst({
    where: { id: classId, tenantId },
    include: {
      _count: { select: { students: true, subjects: true } },
    },
  });
  if (!klass) throw new Error("Class not found");
  if (klass._count.students > 0) {
    throw new Error("Move or remove students before deleting this class");
  }
  if (klass._count.subjects > 0) {
    throw new Error("Remove subjects from this class before deleting");
  }

  await prisma.seniorsClass.delete({ where: { id: classId } });
  return { id: classId };
}

export async function deleteSchoolClasses(tenantId: string, classIds: string[]) {
  const unique = [...new Set(classIds.map((id) => id.trim()).filter(Boolean))];
  const deleted: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  for (const id of unique) {
    try {
      await deleteSchoolClass(tenantId, id);
      deleted.push(id);
    } catch (error) {
      skipped.push({
        id,
        reason: error instanceof Error ? error.message : "Failed",
      });
    }
  }
  return { deleted, skipped };
}

export async function updateSchoolClassesBoard(
  tenantId: string,
  classIds: string[],
  board: string,
) {
  const prisma = getPrismaClient();
  const unique = [...new Set(classIds.map((id) => id.trim()).filter(Boolean))];
  const nextBoard = board.trim() || "CBSE";
  await prisma.seniorsClass.updateMany({
    where: { tenantId, id: { in: unique } },
    data: { board: nextBoard },
  });
  return { updated: unique, board: nextBoard };
}

export async function createSchoolSubject(
  tenantId: string,
  input: { classId: string; name: string; sortOrder?: number },
) {
  const prisma = getPrismaClient();
  const name = input.name.trim();
  if (!name) throw new Error("Subject name is required");

  const klass = await prisma.seniorsClass.findFirst({
    where: { id: input.classId, tenantId },
  });
  if (!klass) throw new Error("Class not found");

  const existing = await prisma.seniorsSubject.findFirst({
    where: {
      tenantId,
      classId: input.classId,
      name: { equals: name, mode: "insensitive" },
    },
  });
  if (existing) throw new Error("Subject already exists in this class");

  return prisma.seniorsSubject.create({
    data: {
      tenantId,
      classId: input.classId,
      name,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function updateSchoolSubject(
  tenantId: string,
  subjectId: string,
  input: { name?: string; sortOrder?: number },
) {
  const prisma = getPrismaClient();
  const subject = await prisma.seniorsSubject.findFirst({
    where: { id: subjectId, tenantId },
  });
  if (!subject) throw new Error("Subject not found");

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Subject name is required");
    const clash = await prisma.seniorsSubject.findFirst({
      where: {
        tenantId,
        classId: subject.classId,
        name: { equals: name, mode: "insensitive" },
        NOT: { id: subjectId },
      },
    });
    if (clash) throw new Error("Subject already exists in this class");
  }

  return prisma.seniorsSubject.update({
    where: { id: subjectId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });
}

export async function deleteSchoolSubject(tenantId: string, subjectId: string) {
  const prisma = getPrismaClient();
  const subject = await prisma.seniorsSubject.findFirst({
    where: { id: subjectId, tenantId },
    include: {
      _count: { select: { chapters: true, teacherAssignments: true } },
    },
  });
  if (!subject) throw new Error("Subject not found");
  if (subject._count.chapters > 0) {
    throw new Error("Remove chapters/topics from this subject before deleting");
  }

  await prisma.seniorsSubject.delete({ where: { id: subjectId } });
  return { id: subjectId };
}

export async function setTeacherAssignments(
  tenantId: string,
  teacherId: string,
  assignments: { classId: string; subjectId: string }[],
) {
  const prisma = getPrismaClient();
  const teacher = await prisma.platformUser.findFirst({
    where: { id: teacherId, tenantId, userType: "teacher" },
  });
  if (!teacher) throw new Error("Teacher not found");

  const unique = new Map<string, { classId: string; subjectId: string }>();
  for (const row of assignments) {
    if (!row.classId || !row.subjectId) continue;
    unique.set(`${row.classId}:${row.subjectId}`, {
      classId: row.classId,
      subjectId: row.subjectId,
    });
  }
  const rows = [...unique.values()];

  for (const row of rows) {
    const subject = await prisma.seniorsSubject.findFirst({
      where: { id: row.subjectId, tenantId, classId: row.classId },
    });
    if (!subject) {
      throw new Error("Subject does not belong to the selected class");
    }
  }

  await prisma.$transaction([
    prisma.seniorsTeacherAssignment.deleteMany({
      where: { tenantId, teacherId },
    }),
    ...(rows.length
      ? [
          prisma.seniorsTeacherAssignment.createMany({
            data: rows.map((row) => ({
              tenantId,
              teacherId,
              classId: row.classId,
              subjectId: row.subjectId,
            })),
          }),
        ]
      : []),
  ]);

  return prisma.seniorsTeacherAssignment.findMany({
    where: { tenantId, teacherId },
    include: {
      class: { select: { id: true, name: true, section: true } },
      subject: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function promoteClassStudents(
  tenantId: string,
  fromClassId: string,
  toClassId: string,
) {
  const prisma = getPrismaClient();
  if (fromClassId === toClassId) throw new Error("Source and target class must differ");

  const [fromClass, toClass] = await Promise.all([
    prisma.seniorsClass.findFirst({ where: { id: fromClassId, tenantId } }),
    prisma.seniorsClass.findFirst({ where: { id: toClassId, tenantId } }),
  ]);
  if (!fromClass || !toClass) throw new Error("Class not found");

  const result = await prisma.seniorsStudentProfile.updateMany({
    where: { tenantId, classId: fromClassId },
    data: { classId: toClassId },
  });
  return { moved: result.count, fromClassId, toClassId };
}

export async function bulkCreateStudents(
  tenantId: string,
  rows: {
    fullName: string;
    email: string;
    password?: string;
    phone?: string;
    classId: string;
    rollNumber?: string;
  }[],
) {
  const results: { email: string; ok: boolean; id?: string; error?: string }[] = [];
  for (const row of rows) {
    try {
      const user = await createSchoolUser(tenantId, {
        fullName: row.fullName,
        email: row.email,
        password: row.password?.trim() || "demo1234",
        userType: "student",
        phone: row.phone,
        classId: row.classId,
        rollNumber: row.rollNumber,
      });
      results.push({ email: row.email, ok: true, id: user.id });
    } catch (err) {
      results.push({
        email: row.email,
        ok: false,
        error: err instanceof Error ? err.message : "Failed",
      });
    }
  }
  return results;
}

export async function bulkCreateTeachers(
  tenantId: string,
  rows: {
    fullName: string;
    email: string;
    password?: string;
    phone?: string;
  }[],
  assignment?: { classId: string; subjectId: string },
) {
  const results: { email: string; ok: boolean; id?: string; error?: string }[] = [];
  for (const row of rows) {
    try {
      const user = await createSchoolUser(tenantId, {
        fullName: row.fullName,
        email: row.email,
        password: row.password?.trim() || "demo1234",
        userType: "teacher",
        phone: row.phone,
      });
      if (assignment?.classId && assignment.subjectId) {
        await setTeacherAssignments(tenantId, user.id, [assignment]);
      }
      results.push({ email: row.email, ok: true, id: user.id });
    } catch (err) {
      results.push({
        email: row.email,
        ok: false,
        error: err instanceof Error ? err.message : "Failed",
      });
    }
  }
  return results;
}

export async function bulkCreateParents(
  tenantId: string,
  rows: {
    fullName: string;
    email: string;
    password?: string;
    phone?: string;
    children?: string[];
  }[],
) {
  const prisma = getPrismaClient();
  const students = await prisma.platformUser.findMany({
    where: { tenantId, userType: "student" },
    select: { id: true, email: true, fullName: true },
  });

  function matchStudent(token: string) {
    const t = token.trim().toLowerCase();
    if (!t) return null;
    return (
      students.find((s) => s.email.toLowerCase() === t) ??
      students.find((s) => s.fullName.trim().toLowerCase() === t) ??
      null
    );
  }

  const results: {
    email: string;
    ok: boolean;
    id?: string;
    reused?: boolean;
    linked?: number;
    unmatched?: string[];
    error?: string;
  }[] = [];

  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    try {
      const childTokens = [...new Set((row.children ?? []).map((c) => c.trim()).filter(Boolean))];
      const matchedIds: string[] = [];
      const unmatched: string[] = [];
      for (const token of childTokens) {
        const student = matchStudent(token);
        if (student) matchedIds.push(student.id);
        else unmatched.push(token);
      }
      const uniqueChildIds = [...new Set(matchedIds)];

      const existing = await prisma.platformUser.findFirst({
        where: { tenantId, email },
      });

      if (existing && existing.userType !== "parent") {
        throw new Error("Email already exists");
      }

      let parentId = existing?.id;
      if (!existing) {
        const user = await createSchoolUser(tenantId, {
          fullName: row.fullName,
          email,
          password: row.password?.trim() || "demo1234",
          userType: "parent",
          phone: row.phone,
          childStudentIds: uniqueChildIds,
        });
        parentId = user.id;
      } else {
        const current = await prisma.seniorsParentChild.findMany({
          where: { tenantId, parentId: existing.id },
          select: { studentId: true },
        });
        await setParentChildren(tenantId, existing.id, [
          ...new Set([...current.map((l) => l.studentId), ...uniqueChildIds]),
        ]);
        if (row.fullName.trim() || row.phone?.trim()) {
          await updateSchoolUser(tenantId, existing.id, {
            ...(row.fullName.trim() ? { fullName: row.fullName } : {}),
            ...(row.phone?.trim() ? { phone: row.phone } : {}),
          });
        }
      }

      results.push({
        email,
        ok: true,
        id: parentId,
        reused: Boolean(existing),
        linked: uniqueChildIds.length,
        unmatched: unmatched.length > 0 ? unmatched : undefined,
      });
    } catch (err) {
      results.push({
        email,
        ok: false,
        error: err instanceof Error ? err.message : "Failed",
      });
    }
  }
  return results;
}
