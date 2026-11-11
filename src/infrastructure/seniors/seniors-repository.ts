import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import {
  daysUntil,
  homeworkStatus,
  resolveContinueLearning,
} from "@/application/seniors/continue-learning";
import type {
  SeniorsHomeworkItem,
  SeniorsStudentDashboardData,
  SeniorsSubjectSummary,
  SeniorsTopicSummary,
} from "@/domain/seniors/types";
import { seniorsDashboardsTag } from "@/infrastructure/seniors/seniors-dashboard-cache";
import { loadStudentTimetable } from "@/infrastructure/seniors/seniors-timetable";

const STUDENT_DASHBOARD_REVALIDATE_SECONDS = 20;
const STUDENT_HOMEWORK_REVALIDATE_SECONDS = 20;
const STUDENT_EXAMS_REVALIDATE_SECONDS = 30;
const ACADEMIC_YEAR_REVALIDATE_SECONDS = 60;

export const getActiveAcademicYearId = cache(
  async (tenantId: string): Promise<string | null> => {
    return unstable_cache(
      async () => {
        const prisma = getPrismaClient();
        const year = await prisma.seniorsAcademicYear.findFirst({
          where: { tenantId, isActive: true },
          orderBy: { createdAt: "desc" },
        });
        return year?.id ?? null;
      },
      ["active-academic-year", tenantId],
      { revalidate: ACADEMIC_YEAR_REVALIDATE_SECONDS, tags: [seniorsDashboardsTag(tenantId)] },
    )();
  },
);

export const loadStudentSubjects = cache(
  async (
    tenantId: string,
    academicYearId: string,
    studentId: string,
  ): Promise<SeniorsSubjectSummary[]> => {
    return unstable_cache(
      async () => {
        const prisma = getPrismaClient();
        const profile = await prisma.seniorsStudentProfile.findFirst({
          where: { tenantId, studentId },
          select: { classId: true },
        });

        // A student with no class assigned must not see any course material.
        if (!profile?.classId) return [];

        const subjects = await prisma.seniorsSubject.findMany({
          where: {
            tenantId,
            classId: profile.classId,
          },
          include: {
            chapters: {
              orderBy: { sortOrder: "asc" },
              include: {
                topics: {
                  where: { academicYearId },
                  orderBy: { sortOrder: "asc" },
                  include: {
                    contents: { select: { contentType: true } },
                    progress: { where: { studentId }, select: { progressPercent: true } },
                  },
                },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        });

        return subjects.map((subject) => ({
          id: subject.id,
          name: subject.name,
          chapters: subject.chapters.map((chapter) => {
            const topics: SeniorsTopicSummary[] = chapter.topics.map((topic) => ({
              id: topic.id,
              slug: topic.slug,
              number: topic.number,
              title: topic.title,
              contentStatus: topic.contentStatus as SeniorsTopicSummary["contentStatus"],
              progressPercent: topic.progress[0]?.progressPercent ?? 0,
              hasNotes: topic.contents.some((c) => c.contentType === "notes"),
            }));
            return {
              id: chapter.id,
              number: chapter.number,
              name: chapter.name,
              topicCount: topics.length,
              completedCount: topics.filter((t) => t.progressPercent >= 100).length,
              topics,
            };
          }),
        }));
      },
      ["student-subjects", tenantId, academicYearId, studentId],
      {
        revalidate: 30,
        tags: [`student-subjects-${tenantId}-${studentId}`, seniorsDashboardsTag(tenantId)],
      },
    )();
  },
);

export const getTeacherScope = cache(async (tenantId: string, teacherId: string) => {
  return unstable_cache(
    async () => {
      const prisma = getPrismaClient();
      const assignments = await prisma.seniorsTeacherAssignment.findMany({
        where: { tenantId, teacherId },
        include: {
          class: { select: { id: true, name: true, section: true } },
          subject: { select: { id: true, name: true, classId: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      const classIds = [...new Set(assignments.map((a) => a.classId))];
      const subjectIds = [...new Set(assignments.map((a) => a.subjectId))];

      return {
        hasAssignments: assignments.length > 0,
        classIds,
        subjectIds,
        assignments: assignments.map((a) => ({
          id: a.id,
          classId: a.classId,
          className: a.class.name,
          section: a.class.section,
          subjectId: a.subjectId,
          subjectName: a.subject.name,
        })),
      };
    },
    ["teacher-scope", tenantId, teacherId],
    {
      revalidate: 60,
      tags: [`teacher-scope-${tenantId}-${teacherId}`, seniorsDashboardsTag(tenantId)],
    },
  )();
});

export async function loadStudentHomework(
  tenantId: string,
  studentId: string,
  options?: { includeSubmitted?: boolean },
): Promise<SeniorsHomeworkItem[]> {
  const includeSubmitted = options?.includeSubmitted ? "all" : "open";
  return unstable_cache(
    async () => {
      const prisma = getPrismaClient();
      const profile = await prisma.seniorsStudentProfile.findFirst({
        where: { tenantId, studentId },
        select: { classId: true },
      });

      const assignments = await prisma.seniorsAssignment.findMany({
        where: {
          tenantId,
          OR: [
            { targetClassId: null },
            ...(profile?.classId ? [{ targetClassId: profile.classId }] : []),
          ],
        },
        include: { submissions: { where: { studentId } } },
        orderBy: { dueAt: "asc" },
        take: 50,
      });

      return assignments
        .filter((a) => {
          if (includeSubmitted === "all") return true;
          return (
            a.submissions[0]?.status !== "submitted" && a.submissions[0]?.status !== "graded"
          );
        })
        .map((a) => {
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
            answerText: sub?.answerText ?? "",
            score: sub?.score ?? null,
            feedback: sub?.feedback ?? "",
            gradedAt: sub?.gradedAt ?? null,
            attachmentUrls: sub?.attachmentUrls ?? [],
            assignmentAttachmentUrls: a.attachmentUrls ?? [],
          };
        });
    },
    ["student-homework", tenantId, studentId, includeSubmitted],
    {
      revalidate: STUDENT_HOMEWORK_REVALIDATE_SECONDS,
      tags: [seniorsDashboardsTag(tenantId)],
    },
  )();
}

export async function loadHomeworkDetail(
  tenantId: string,
  assignmentId: string,
  studentId: string,
) {
  const prisma = getPrismaClient();
  const assignment = await prisma.seniorsAssignment.findFirst({
    where: { id: assignmentId, tenantId },
    include: { submissions: { where: { studentId } } },
  });
  if (!assignment) return null;
  const sub = assignment.submissions[0];
  return {
    id: assignment.id,
    title: assignment.title,
    description: assignment.description,
    subjectName: assignment.subjectName,
    chapterName: assignment.chapterName,
    dueAt: assignment.dueAt,
    questionCount: assignment.questionCount,
    attachmentUrls: assignment.attachmentUrls ?? [],
    status: homeworkStatus(assignment.dueAt),
    submissionStatus: (sub?.status as "pending" | "submitted" | "graded") ?? "pending",
    answerText: sub?.answerText ?? "",
    submissionAttachmentUrls: sub?.attachmentUrls ?? [],
    score: sub?.score ?? null,
    feedback: sub?.feedback ?? "",
    gradedAt: sub?.gradedAt ?? null,
  };
}

export async function loadStudentExams(tenantId: string, studentId: string) {
  return unstable_cache(
    async () => {
      const prisma = getPrismaClient();
      const profile = await prisma.seniorsStudentProfile.findFirst({
        where: { tenantId, studentId },
        select: { classId: true },
      });
      const exams = await prisma.seniorsExam.findMany({
        where: {
          tenantId,
          examAt: { gte: new Date() },
          OR: [
            { targetClassId: null },
            ...(profile?.classId ? [{ targetClassId: profile.classId }] : []),
          ],
        },
        orderBy: { examAt: "asc" },
        take: 10,
      });
      return exams.map((e) => ({
        id: e.id,
        title: e.title,
        subjectName: e.subjectName,
        examAt: e.examAt,
        daysLeft: daysUntil(e.examAt),
      }));
    },
    ["student-exams", tenantId, studentId],
    {
      revalidate: STUDENT_EXAMS_REVALIDATE_SECONDS,
      tags: [seniorsDashboardsTag(tenantId)],
    },
  )();
}

export async function loadStudentDashboard(
  tenantSlug: string,
  tenantId: string,
  studentId: string,
  studentName: string,
): Promise<SeniorsStudentDashboardData | null> {
  return unstable_cache(
    async () => loadStudentDashboardUncached(tenantSlug, tenantId, studentId, studentName),
    ["student-dashboard", tenantSlug, tenantId, studentId, studentName],
    {
      revalidate: STUDENT_DASHBOARD_REVALIDATE_SECONDS,
      tags: [seniorsDashboardsTag(tenantId)],
    },
  )();
}

async function loadStudentDashboardUncached(
  tenantSlug: string,
  tenantId: string,
  studentId: string,
  studentName: string,
): Promise<SeniorsStudentDashboardData | null> {
  const prisma = getPrismaClient();
  const academicYearId = await getActiveAcademicYearId(tenantId);
  if (!academicYearId) return null;

  const [
    profile,
    settings,
    subjects,
    allHomework,
    exams,
    announcements,
    teacherAnnouncements,
    quizAttempts,
  ] = await Promise.all([
      prisma.seniorsStudentProfile.findFirst({
        where: { tenantId, studentId },
        include: { class: true },
      }),
      prisma.seniorsSchoolSettings.findUnique({ where: { tenantId } }),
      loadStudentSubjects(tenantId, academicYearId, studentId),
      loadStudentHomework(tenantId, studentId, { includeSubmitted: true }),
      loadStudentExams(tenantId, studentId),
      prisma.seniorsAnnouncement.findMany({
        where: { tenantId, source: "school" },
        orderBy: { publishedAt: "desc" },
        take: 40,
      }),
      prisma.seniorsAnnouncement.findMany({
        where: { tenantId, source: "teacher" },
        orderBy: { publishedAt: "desc" },
        take: 40,
      }),
      prisma.seniorsQuizAttempt.findMany({
        where: { tenantId, studentId, score: { not: null } },
        orderBy: { submittedAt: "desc" },
        take: 5,
      }),
    ]);

  const timetable = await loadStudentTimetable(tenantId, studentId);

  const { isAnnouncementVisibleTo } = await import(
    "@/infrastructure/seniors/seniors-announcement-audience"
  );
  const studentClassIds = profile?.classId ? [profile.classId] : [];
  const visibleSchool = announcements.filter((item) =>
    isAnnouncementVisibleTo(item, {
      role: "student",
      userId: studentId,
      classIds: studentClassIds,
    }),
  );
  const visibleTeacher = teacherAnnouncements.filter((item) =>
    isAnnouncementVisibleTo(item, {
      role: "student",
      userId: studentId,
      classIds: studentClassIds,
    }),
  );

  const homework = allHomework.filter(
    (h) => h.submissionStatus !== "submitted" && h.submissionStatus !== "graded",
  );

  const homeworkReturned = allHomework
    .filter((h) => h.submissionStatus === "graded")
    .sort((a, b) => {
      const aTime = a.gradedAt ? new Date(a.gradedAt).getTime() : 0;
      const bTime = b.gradedAt ? new Date(b.gradedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 5);

  const allTopics = subjects.flatMap((s) =>
    s.chapters.flatMap((c) => c.topics),
  );
  const topicsTotal = allTopics.length;
  // Same rule as Learn / subject cards: progressPercent >= 100
  const topicsCompleted = allTopics.filter((t) => t.progressPercent >= 100).length;
  const progressPercent =
    topicsTotal > 0 ? Math.round((topicsCompleted / topicsTotal) * 100) : 0;

  const testAverage =
    quizAttempts.length > 0
      ? Math.round(
          quizAttempts.reduce((sum, a) => {
            const pct = a.maxScore ? ((a.score ?? 0) / a.maxScore) * 100 : 0;
            return sum + pct;
          }, 0) / quizAttempts.length,
        )
      : 0;

  const sitePath = (segment: string) => `/${tenantSlug}/${segment}`;

  return {
    studentName,
    className: profile?.class?.name || "Class not assigned",
    schoolName: settings?.schoolName || "Greenwood High School",
    continueLearning: resolveContinueLearning({
      homework,
      exams,
      topics: allTopics,
      topicHref: (slug) => sitePath(`student/learn/${slug}`),
      homeworkHref: (id) => sitePath(`student/homework/${id}`),
      examPrepHref: sitePath("student/exam-prep"),
    }),
    homeworkDue: homework.slice(0, 5),
    homeworkReturned,
    upcomingExams: exams.slice(0, 5),
    announcements: visibleSchool.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      publishedAt: a.publishedAt,
    })),
    teacherUpdates: visibleTeacher.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      teacherName: a.createdByName || "Teacher",
      publishedAt: a.publishedAt,
    })),
    progressSummary: {
      percent: progressPercent,
      topicsCompleted,
      topicsTotal,
      testAverage,
    },
    timetable,
  };
}

export async function loadTopicBySlug(
  tenantId: string,
  slug: string,
  studentId?: string,
) {
  const prisma = getPrismaClient();
  const [academicYearId, profile] = await Promise.all([
    getActiveAcademicYearId(tenantId),
    studentId
      ? prisma.seniorsStudentProfile.findFirst({
          where: { tenantId, studentId },
          select: { classId: true },
        })
      : Promise.resolve(null),
  ]);
  if (!academicYearId) return null;
  if (studentId && !profile?.classId) return null;

  const topic = await prisma.seniorsTopic.findFirst({
    where: { tenantId, slug, academicYearId },
    include: {
      chapter: { include: { subject: { include: { class: true } } } },
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
      progress: studentId ? { where: { studentId } } : false,
    },
  });
  if (!topic) return null;

  // Class-gate direct topic access: a student may only open topics that
  // belong to their assigned class. No class = no access.
  if (studentId && topic.chapter.subject.classId !== profile?.classId) {
    return null;
  }

  const quizzes = await prisma.seniorsQuiz.findMany({
    where: { tenantId, topicId: topic.id, status: "published" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      questions: true,
      status: true,
    },
  });

  return { ...topic, quizzes };
}

export async function trackSeniorsEvent(
  tenantId: string,
  eventType: string,
  userId?: string,
  role?: string,
  metadata: Record<string, unknown> = {},
) {
  const prisma = getPrismaClient();
  await prisma.seniorsAnalyticsEvent.create({
    data: {
      tenantId,
      eventType,
      userId,
      role,
      metadata: metadata as object,
    },
  });
}
