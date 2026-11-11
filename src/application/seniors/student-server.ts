import { cache } from "react";
import { redirect } from "next/navigation";
import { getStudentSessionFromCookies } from "@/infrastructure/auth/session";
import { findTenantBySlug } from "@/infrastructure/database/tenant-repository";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { seniorsTenantLoginRedirect } from "@/shared/lib/seniors-platform-urls";
import {
  getActiveAcademicYearId,
  loadHomeworkDetail,
  loadStudentDashboard,
  loadStudentExams,
  loadStudentHomework,
  loadStudentSubjects,
} from "@/infrastructure/seniors/seniors-repository";
import { loadStudentTimetable } from "@/infrastructure/seniors/seniors-timetable";
import type { TopicPageData } from "@/presentation/components/templates/seniors/student/StudentTopicPage";
import type { SeniorsQuizQuestion, StudentPracticeTopic } from "@/domain/seniors/types";
import { normalizeTopicDiagrams } from "@/domain/seniors/topic-diagrams";
import { seniorsUserStillExistsCached } from "@/infrastructure/seniors/seniors-user-guard";

const requireStudent = cache(async (tenant: string) => {
  const session = await getStudentSessionFromCookies();
  if (!session || session.tenant !== tenant || session.role !== "student") {
    redirect(seniorsTenantLoginRedirect(tenant, "student"));
  }
  const tenantRow = await findTenantBySlug(tenant);
  if (!tenantRow) redirect(`/seniors`);
  const exists = await seniorsUserStillExistsCached(tenantRow.id, session.userId, "student");
  if (!exists) {
    redirect(seniorsTenantLoginRedirect(tenant, "student"));
  }
  return { session, tenantRow };
});

export async function loadStudentHomeData(tenant: string) {
  const { session, tenantRow } = await requireStudent(tenant);
  const data = await loadStudentDashboard(
    tenant,
    tenantRow.id,
    session.userId,
    session.fullName,
  );
  return { data, session };
}

export async function loadStudentLearnData(tenant: string) {
  const { session, tenantRow } = await requireStudent(tenant);
  const prisma = getPrismaClient();
  const yearId = await getActiveAcademicYearId(tenantRow.id);
  const [subjects, profile, year] = await Promise.all([
    yearId ? loadStudentSubjects(tenantRow.id, yearId, session.userId) : Promise.resolve([]),
    prisma.seniorsStudentProfile.findFirst({
      where: { tenantId: tenantRow.id, studentId: session.userId },
      include: { class: true },
    }),
    yearId
      ? prisma.seniorsAcademicYear.findUnique({ where: { id: yearId } })
      : Promise.resolve(null),
  ]);

  return {
    subjects,
    student: {
      fullName: session.fullName,
      className: profile?.class?.name || "Class not assigned",
      sectionName: profile?.class?.section || "",
      board: profile?.class?.board || "CBSE",
      academicYear: year?.label || "2025-26",
    },
  };
}

export async function loadStudentTopicData(
  tenant: string,
  topicSlug: string,
): Promise<TopicPageData | null> {
  const { session, tenantRow } = await requireStudent(tenant);
  return loadStudentTopicPageData(tenantRow.id, topicSlug, session.userId);
}

/** API-friendly loader (no redirects). */
export async function loadStudentTopicPageData(
  tenantId: string,
  topicSlug: string,
  studentId: string,
): Promise<TopicPageData | null> {
  return loadStudentTopicPageForStudent(tenantId, topicSlug, studentId);
}

async function loadStudentTopicPageForStudent(
  tenantId: string,
  topicSlug: string,
  studentId: string,
): Promise<TopicPageData | null> {
  const { unstable_cache } = await import("next/cache");
  const { seniorsDashboardsTag } = await import(
    "@/infrastructure/seniors/seniors-dashboard-cache"
  );
  const prisma = getPrismaClient();

  const [profile, academicYearId] = await Promise.all([
    prisma.seniorsStudentProfile.findFirst({
      where: { tenantId, studentId },
      select: { classId: true },
    }),
    getActiveAcademicYearId(tenantId),
  ]);
  if (!profile?.classId || !academicYearId) return null;

  const cached = await unstable_cache(
    () => buildStudentTopicPageData(tenantId, topicSlug, academicYearId),
    ["student-topic-page", tenantId, topicSlug, academicYearId],
    {
      revalidate: 60,
      tags: [seniorsDashboardsTag(tenantId), `student-topic-${tenantId}-${topicSlug}`],
    },
  )();

  if (!cached || cached.classId !== profile.classId) return null;
  const { classId: _classId, ...topic } = cached;
  return topic;
}

async function buildStudentTopicPageData(
  tenantId: string,
  topicSlug: string,
  academicYearId: string,
): Promise<(TopicPageData & { classId: string }) | null> {
  const prisma = getPrismaClient();
  const topic = await prisma.seniorsTopic.findFirst({
    where: { tenantId, slug: topicSlug, academicYearId },
    include: {
      chapter: { include: { subject: true } },
      contents: {
        where: { status: "published" },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          contentType: true,
          title: true,
          body: true,
          fileUrl: true,
          uploadedByName: true,
          updatedAt: true,
        },
      },
    },
  });
  if (!topic) return null;

  const [chapters, homework, quizzes] = await Promise.all([
    prisma.seniorsChapter.findMany({
      where: {
        tenantId,
        subjectId: topic.chapter.subjectId,
      },
      orderBy: { sortOrder: "asc" },
      select: {
        topics: {
          where: { academicYearId },
          orderBy: { sortOrder: "asc" },
          select: { slug: true, number: true, title: true },
        },
      },
    }),
    prisma.seniorsAssignment.findMany({
      where: {
        tenantId,
        topicLinks: { some: { topicId: topic.id } },
      },
      take: 5,
      select: {
        id: true,
        title: true,
        dueAt: true,
        questionCount: true,
      },
    }),
    prisma.seniorsQuiz.findMany({
      where: { tenantId, topicId: topic.id, status: "published" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        questions: true,
        status: true,
      },
    }),
  ]);

  const siblings = chapters.flatMap((ch) => ch.topics);
  const idx = siblings.findIndex((s) => s.slug === topicSlug);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const publishedQuizzes = quizzes
    .filter((q) => {
      const questions = (q.questions as unknown as SeniorsQuizQuestion[]) ?? [];
      return questions.length > 0;
    })
    .map((q) => ({
      id: q.id,
      title: q.title,
      questions: (q.questions as unknown as SeniorsQuizQuestion[]) ?? [],
    }));

  return {
    classId: topic.chapter.subject.classId,
    id: topic.id,
    slug: topic.slug,
    number: topic.number,
    title: topic.title,
    subjectName: topic.chapter.subject.name,
    chapterName: topic.chapter.name,
    chapterNumber: topic.chapter.number,
    learningObjective: topic.learningObjective,
    teacherExplanation: topic.teacherExplanation,
    keywords: topic.keywords,
    diagramUrl: topic.diagramUrl,
    diagrams: normalizeTopicDiagrams(topic.diagrams, topic.diagramUrl),
    contentStatus: topic.contentStatus,
    contents: topic.contents.map((c) => ({
      id: c.id,
      contentType: c.contentType,
      title: c.title,
      body: c.body,
      fileUrl: c.fileUrl,
      uploadedByName: c.uploadedByName,
      updatedAt: c.updatedAt,
    })),
    homework: homework.map((h) => ({
      id: h.id,
      title: h.title,
      dueAt: h.dueAt,
      questionCount: h.questionCount,
    })),
    quizzes: publishedQuizzes,
    quiz: publishedQuizzes[0] ?? null,
    prevSlug: prev?.slug ?? null,
    nextSlug: next?.slug ?? null,
    prevTitle: prev ? `${prev.number} ${prev.title}` : null,
    nextTitle: next ? `${next.number} ${next.title}` : null,
    topicPosition: idx >= 0 ? idx + 1 : 1,
    topicTotal: siblings.length,
  };
}

export async function loadStudentHomeworkList(tenant: string) {
  const { session, tenantRow } = await requireStudent(tenant);
  return loadStudentHomework(tenantRow.id, session.userId, { includeSubmitted: true });
}

export async function loadStudentHomeworkDetail(tenant: string, assignmentId: string) {
  const { session, tenantRow } = await requireStudent(tenant);
  return loadHomeworkDetail(tenantRow.id, assignmentId, session.userId);
}

export async function loadStudentExamsList(tenant: string) {
  const { session, tenantRow } = await requireStudent(tenant);
  return loadStudentExams(tenantRow.id, session.userId);
}

export type { StudentPracticeTopic } from "@/domain/seniors/types";

export async function loadStudentExamPrepData(tenant: string) {
  const { session, tenantRow } = await requireStudent(tenant);
  const prisma = getPrismaClient();
  const yearId = await getActiveAcademicYearId(tenantRow.id);
  const [exams, subjects] = await Promise.all([
    loadStudentExams(tenantRow.id, session.userId),
    yearId
      ? loadStudentSubjects(tenantRow.id, yearId, session.userId)
      : Promise.resolve([]),
  ]);

  const flatTopics = subjects.flatMap((s) =>
    s.chapters.flatMap((c) =>
      c.topics.map((t) => ({
        id: t.id,
        slug: t.slug,
        title: t.title,
        number: t.number,
        subjectName: s.name,
        chapterName: c.name,
        progressPercent: t.progressPercent,
      })),
    ),
  );
  const topicIds = flatTopics.map((t) => t.id);

  const [publishedQuizzes, attempts, revisionContents] = await Promise.all([
    topicIds.length === 0
      ? Promise.resolve([])
      : prisma.seniorsQuiz.findMany({
          where: {
            tenantId: tenantRow.id,
            topicId: { in: topicIds },
            status: "published",
          },
          select: { id: true, topicId: true, questions: true },
        }),
    topicIds.length === 0
      ? Promise.resolve([])
      : prisma.seniorsQuizAttempt.findMany({
          where: {
            tenantId: tenantRow.id,
            studentId: session.userId,
            score: { not: null },
            quiz: { topicId: { in: topicIds } },
          },
          orderBy: { submittedAt: "desc" },
          select: {
            score: true,
            maxScore: true,
            quiz: { select: { topicId: true } },
          },
        }),
    topicIds.length === 0
      ? Promise.resolve([])
      : prisma.seniorsTopicContent.findMany({
          where: {
            tenantId: tenantRow.id,
            topicId: { in: topicIds },
            contentType: {
              in: ["previous_paper", "revision_note", "model_answer", "revision"],
            },
          },
          select: { topicId: true, contentType: true },
        }),
  ]);

  const quizByTopic = new Set<string>();
  for (const q of publishedQuizzes) {
    const questions = (q.questions as unknown as SeniorsQuizQuestion[]) ?? [];
    if (questions.length > 0) quizByTopic.add(q.topicId);
  }

  const topicsWithPapers = new Set(
    revisionContents
      .filter((c) => c.contentType === "previous_paper")
      .map((c) => c.topicId),
  );
  const topicsWithRevision = new Set(revisionContents.map((c) => c.topicId));

  const latestPctByTopic = new Map<string, number>();
  for (const a of attempts) {
    const tid = a.quiz.topicId;
    if (latestPctByTopic.has(tid)) continue;
    const pct = a.maxScore
      ? Math.round(((a.score ?? 0) / a.maxScore) * 100)
      : 0;
    latestPctByTopic.set(tid, pct);
  }

  const practiceTopics: StudentPracticeTopic[] = flatTopics.map((t) => {
    const hasQuiz = quizByTopic.has(t.id);
    const lastQuizPercent = latestPctByTopic.has(t.id)
      ? (latestPctByTopic.get(t.id) as number)
      : null;
    let reason = "";
    let suggested = false;
    if (hasQuiz && lastQuizPercent === null) {
      suggested = true;
      reason = "Quiz not attempted yet";
    } else if (hasQuiz && lastQuizPercent !== null && lastQuizPercent < 60) {
      suggested = true;
      reason = `Last quiz ${lastQuizPercent}%`;
    } else if (t.progressPercent > 0 && t.progressPercent < 100) {
      suggested = true;
      reason = `In progress (${t.progressPercent}%)`;
    }
    return {
      ...t,
      hasQuiz,
      lastQuizPercent,
      reason,
      suggested,
    };
  });

  const weakTopics = practiceTopics
    .filter((t) => t.suggested)
    .sort((a, b) => {
      const rank = (t: StudentPracticeTopic) => {
        if (t.hasQuiz && t.lastQuizPercent !== null && t.lastQuizPercent < 60) {
          return t.lastQuizPercent;
        }
        if (t.hasQuiz && t.lastQuizPercent === null) return 200;
        return 300 + t.progressPercent;
      };
      return rank(a) - rank(b);
    });

  const papersTopic =
    flatTopics.find((t) => topicsWithPapers.has(t.id)) ||
    flatTopics.find((t) => topicsWithRevision.has(t.id)) ||
    null;
  const mockTopic =
    practiceTopics.find((t) => t.hasQuiz) ||
    flatTopics[0] ||
    null;

  return {
    exams,
    weakTopics,
    practiceTopics,
    papersHref: papersTopic
      ? `student/learn/${papersTopic.slug}?tab=revision`
      : "student/learn",
    mockHref: mockTopic
      ? `student/learn/${mockTopic.slug}?tab=quiz`
      : "student/learn",
  };
}

export async function loadStudentPracticeQuizzes(
  tenant: string,
  topicIds: string[],
  opts?: { tenantId: string; studentId: string },
) {
  const auth =
    opts ??
    (await (async () => {
      const { session, tenantRow } = await requireStudent(tenant);
      return { tenantId: tenantRow.id, studentId: session.userId };
    })());
  const prisma = getPrismaClient();
  const yearId = await getActiveAcademicYearId(auth.tenantId);
  const uniqueIds = [...new Set(topicIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const subjects = yearId
    ? await loadStudentSubjects(auth.tenantId, yearId, auth.studentId)
    : [];
  const allowed = new Map(
    subjects.flatMap((s) =>
      s.chapters.flatMap((c) =>
        c.topics.map((t) => [
          t.id,
          {
            id: t.id,
            slug: t.slug,
            title: t.title,
            number: t.number,
            subjectName: s.name,
          },
        ] as const),
      ),
    ),
  );

  const ordered = uniqueIds
    .map((id) => allowed.get(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  if (ordered.length === 0) return [];

  const quizzes = await prisma.seniorsQuiz.findMany({
    where: {
      tenantId: auth.tenantId,
      topicId: { in: ordered.map((t) => t.id) },
      status: "published",
    },
    select: { id: true, topicId: true, title: true, questions: true },
    orderBy: { createdAt: "asc" },
  });

  const quizByTopic = new Map<string, (typeof quizzes)[number]>();
  for (const q of quizzes) {
    const questions = (q.questions as unknown as SeniorsQuizQuestion[]) ?? [];
    if (questions.length === 0) continue;
    if (!quizByTopic.has(q.topicId)) quizByTopic.set(q.topicId, q);
  }

  return ordered.map((topic) => {
    const quiz = quizByTopic.get(topic.id);
    const questions = quiz
      ? ((quiz.questions as unknown as SeniorsQuizQuestion[]) ?? [])
      : [];
    return {
      topicId: topic.id,
      slug: topic.slug,
      title: topic.number ? `${topic.number} ${topic.title}` : topic.title,
      subjectName: topic.subjectName,
      quiz: quiz
        ? {
            id: quiz.id,
            title: quiz.title,
            questions,
          }
        : null,
    };
  });
}

export async function loadStudentProgressData(tenant: string) {
  const { session, tenantRow } = await requireStudent(tenant);
  const yearId = await getActiveAcademicYearId(tenantRow.id);
  const subjects = yearId
    ? await loadStudentSubjects(tenantRow.id, yearId, session.userId)
    : [];

  const allTopics = subjects.flatMap((s) => s.chapters.flatMap((c) => c.topics));
  const topicsTotal = allTopics.length;
  const topicsCompleted = allTopics.filter((t) => t.progressPercent >= 100).length;
  const percent =
    topicsTotal > 0 ? Math.round((topicsCompleted / topicsTotal) * 100) : 0;

  const quizAttempts = await getPrismaClient().seniorsQuizAttempt.findMany({
    where: { tenantId: tenantRow.id, studentId: session.userId, score: { not: null } },
    orderBy: { submittedAt: "desc" },
    take: 20,
  });
  const testAverage =
    quizAttempts.length > 0
      ? Math.round(
          quizAttempts.reduce((sum, a) => {
            const pct = a.maxScore ? ((a.score ?? 0) / a.maxScore) * 100 : 0;
            return sum + pct;
          }, 0) / quizAttempts.length,
        )
      : 0;

  return {
    subjects,
    progressSummary: {
      percent,
      topicsCompleted,
      topicsTotal,
      testAverage,
    },
  };
}

export async function loadStudentSchoolData(tenant: string) {
  const { tenantRow, session } = await requireStudent(tenant);
  const prisma = getPrismaClient();
  const [profile, announcements] = await Promise.all([
    prisma.seniorsStudentProfile.findFirst({
      where: { tenantId: tenantRow.id, studentId: session.userId },
      select: { classId: true },
    }),
    prisma.seniorsAnnouncement.findMany({
      where: {
        tenantId: tenantRow.id,
        source: { in: ["school", "teacher"] },
      },
      orderBy: { publishedAt: "desc" },
    }),
  ]);
  const { isAnnouncementVisibleTo } = await import(
    "@/infrastructure/seniors/seniors-announcement-audience"
  );
  return announcements
    .filter((item) =>
      isAnnouncementVisibleTo(item, {
        role: "student",
        userId: session.userId,
        classIds: profile?.classId ? [profile.classId] : [],
      }),
    )
    .map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      publishedAt: item.publishedAt,
      source: (item.source === "school" ? "school" : "teacher") as "school" | "teacher",
      authorName:
        item.source === "school"
          ? "School office"
          : item.createdByName?.trim() || "Teacher",
    }));
}

export async function loadStudentTimetableData(tenant: string) {
  const { tenantRow, session } = await requireStudent(tenant);
  return loadStudentTimetable(tenantRow.id, session.userId);
}
