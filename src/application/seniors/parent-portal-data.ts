import { getPrismaClient } from "@/infrastructure/database/prisma";
import { loadStudentAttendanceSummary } from "@/infrastructure/seniors/seniors-attendance";
import {
  getActiveAcademicYearId,
  loadStudentHomework,
  loadStudentSubjects,
} from "@/infrastructure/seniors/seniors-repository";
import { loadStudentTimetable } from "@/infrastructure/seniors/seniors-timetable";

export type ParentChildOption = {
  id: string;
  name: string;
  className: string;
  rollNumber: string;
  email: string;
  phone: string;
  classId: string | null;
};

export async function resolveParentChild(
  tenantId: string,
  parentId: string,
  childId?: string,
) {
  const prisma = getPrismaClient();
  const links = await prisma.seniorsParentChild.findMany({
    where: { tenantId, parentId },
    include: {
      student: {
        include: {
          seniorsStudentProfile: { include: { class: true } },
        },
      },
    },
  });

  const children: ParentChildOption[] = links.map((link) => ({
    id: link.studentId,
    name: link.student.fullName,
    className: link.student.seniorsStudentProfile?.class?.name ?? "Class",
    rollNumber: link.student.seniorsStudentProfile?.rollNumber ?? "",
    email: link.student.email,
    phone: link.student.phone,
    classId: link.student.seniorsStudentProfile?.classId ?? null,
  }));

  const activeChild =
    (childId ? children.find((c) => c.id === childId) : undefined) ?? children[0] ?? null;

  return { children, activeChild };
}

export async function loadParentHomeworkData(
  tenantId: string,
  parentId: string,
  childId?: string,
) {
  const { children, activeChild } = await resolveParentChild(tenantId, parentId, childId);
  if (!activeChild) {
    return { children, activeChildId: null, homework: [] };
  }

  const homework = await loadStudentHomework(tenantId, activeChild.id, {
    includeSubmitted: true,
  });

  return {
    children,
    activeChildId: activeChild.id,
    homework,
  };
}

export async function loadParentTestResultsData(
  tenantId: string,
  parentId: string,
  childId?: string,
) {
  const prisma = getPrismaClient();
  const { children, activeChild } = await resolveParentChild(tenantId, parentId, childId);
  if (!activeChild) {
    return {
      children,
      activeChildId: null,
      quizResults: [],
      upcomingExams: [],
      testAverage: 0,
    };
  }

  const [quizAttempts, exams] = await Promise.all([
    prisma.seniorsQuizAttempt.findMany({
      where: { tenantId, studentId: activeChild.id, score: { not: null } },
      orderBy: { submittedAt: "desc" },
      take: 30,
      include: {
        quiz: {
          select: {
            title: true,
            topic: {
              select: {
                chapter: { select: { subject: { select: { name: true } } } },
              },
            },
          },
        },
      },
    }),
    prisma.seniorsExam.findMany({
      where: {
        tenantId,
        OR: [
          { targetClassId: null },
          ...(activeChild.classId ? [{ targetClassId: activeChild.classId }] : []),
        ],
      },
      orderBy: { examAt: "desc" },
      take: 20,
    }),
  ]);

  const { daysUntil } = await import("@/application/seniors/continue-learning");

  const scored = quizAttempts.filter((a) => a.score != null && a.maxScore != null);
  const testAverage =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, a) => sum + ((a.score ?? 0) / (a.maxScore || 1)) * 100, 0) /
            scored.length,
        )
      : 0;

  return {
    children,
    activeChildId: activeChild.id,
    testAverage,
    quizResults: quizAttempts.map((a) => ({
      id: a.id,
      title: a.quiz.title,
      subjectName: a.quiz.topic.chapter.subject.name,
      score: a.score,
      maxScore: a.maxScore,
      submittedAt: a.submittedAt,
      percent:
        a.score != null && a.maxScore
          ? Math.round(((a.score ?? 0) / a.maxScore) * 100)
          : null,
    })),
    exams: exams.map((e) => ({
      id: e.id,
      title: e.title,
      subjectName: e.subjectName,
      examAt: e.examAt,
      isPast: e.examAt < new Date(),
      daysLeft: daysUntil(e.examAt),
    })),
  };
}

export async function loadParentAttendanceData(
  tenantId: string,
  parentId: string,
  childId?: string,
) {
  const { children, activeChild } = await resolveParentChild(tenantId, parentId, childId);
  if (!activeChild) {
    return {
      children,
      activeChildId: null,
      attendance: {
        month: new Date().toISOString(),
        percent: 0,
        daysPresent: 0,
        daysAbsent: 0,
        daysLate: 0,
        daysRecorded: 0,
        records: [],
      },
    };
  }

  const attendance = await loadStudentAttendanceSummary(tenantId, activeChild.id);

  return {
    children,
    activeChildId: activeChild.id,
    attendance,
  };
}

export async function loadParentProfileData(
  tenantId: string,
  parentId: string,
  childId?: string,
) {
  const prisma = getPrismaClient();
  const { children, activeChild } = await resolveParentChild(tenantId, parentId, childId);
  if (!activeChild) {
    return { children, activeChildId: null, profile: null };
  }

  const yearId = await getActiveAcademicYearId(tenantId);
  const [profile, subjects, quizAttempts] = await Promise.all([
    prisma.seniorsStudentProfile.findFirst({
      where: { tenantId, studentId: activeChild.id },
      include: { class: true, student: true },
    }),
    yearId
      ? loadStudentSubjects(tenantId, yearId, activeChild.id)
      : Promise.resolve([]),
    prisma.seniorsQuizAttempt.findMany({
      where: { tenantId, studentId: activeChild.id, score: { not: null } },
      orderBy: { submittedAt: "desc" },
      take: 5,
      select: { score: true, maxScore: true },
    }),
  ]);

  const allTopics = subjects.flatMap((s) => s.chapters.flatMap((c) => c.topics));
  const topicsTotal = allTopics.length;
  const topicsCompleted = allTopics.filter((t) => t.progressPercent >= 100).length;
  const scored = quizAttempts.filter((a) => a.score != null && a.maxScore);
  const testAverage =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, a) => sum + ((a.score ?? 0) / (a.maxScore || 1)) * 100, 0) /
            scored.length,
        )
      : 0;
  const progress = {
    percent: topicsTotal > 0 ? Math.round((topicsCompleted / topicsTotal) * 100) : 0,
    topicsCompleted,
    topicsTotal,
    testAverage,
  };

  return {
    children,
    activeChildId: activeChild.id,
    profile: profile
      ? {
          id: activeChild.id,
          name: profile.student.fullName,
          email: profile.student.email,
          phone: profile.student.phone,
          rollNumber: profile.rollNumber,
          className: [profile.class.name, profile.class.section].filter(Boolean).join(" "),
          joinedAt: profile.student.joinedAt,
          progress,
          subjects: subjects.map((s) => s.name),
        }
      : null,
  };
}

export async function loadParentTimetableData(
  tenantId: string,
  parentId: string,
  childId?: string,
) {
  const { children, activeChild } = await resolveParentChild(tenantId, parentId, childId);
  if (!activeChild) {
    return { children, activeChildId: null, timetable: null };
  }

  const timetable = await loadStudentTimetable(tenantId, activeChild.id);

  return {
    children,
    activeChildId: activeChild.id,
    timetable,
  };
}

export async function loadParentCalendarData(
  tenantId: string,
  parentId: string,
  childId?: string,
) {
  const prisma = getPrismaClient();
  const { children, activeChild } = await resolveParentChild(tenantId, parentId, childId);

  const classIds = children.map((c) => c.classId).filter((id): id is string => Boolean(id));

  const [exams, announcements, settings] = await Promise.all([
    prisma.seniorsExam.findMany({
      where: {
        tenantId,
        OR: [
          { targetClassId: null },
          ...(activeChild?.classId ? [{ targetClassId: activeChild.classId }] : []),
        ],
        examAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
      },
      orderBy: { examAt: "asc" },
      take: 30,
    }),
    prisma.seniorsAnnouncement.findMany({
      where: { tenantId, source: "school" },
      orderBy: { publishedAt: "desc" },
      take: 40,
    }),
    prisma.seniorsSchoolSettings.findUnique({ where: { tenantId } }),
  ]);

  const { isAnnouncementVisibleTo } = await import(
    "@/infrastructure/seniors/seniors-announcement-audience"
  );
  const { daysUntil } = await import("@/application/seniors/continue-learning");

  const visibleAnnouncements = announcements.filter((item) =>
    isAnnouncementVisibleTo(item, {
      role: "parent",
      userId: parentId,
      classIds,
    }),
  );

  const academicEvents = Array.isArray(settings?.academicCalendar)
    ? (settings.academicCalendar as { title?: string; date?: string; type?: string }[])
    : [];

  const events = [
    ...exams.map((e) => ({
      id: `exam-${e.id}`,
      type: "exam" as const,
      title: e.title,
      subtitle: e.subjectName,
      date: e.examAt,
      daysLeft: daysUntil(e.examAt),
    })),
    ...visibleAnnouncements.slice(0, 10).map((a) => ({
      id: `ann-${a.id}`,
      type: "announcement" as const,
      title: a.title,
      subtitle: a.body.slice(0, 80),
      date: a.publishedAt,
      daysLeft: null,
    })),
    ...academicEvents
      .filter((e) => e.title && e.date)
      .map((e, i) => ({
        id: `cal-${i}`,
        type: "school" as const,
        title: e.title ?? "School event",
        subtitle: e.type ?? "",
        date: new Date(e.date!),
        daysLeft: null,
      })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    children,
    activeChildId: activeChild?.id ?? null,
    events,
  };
}

export async function loadParentLessonPlanData(
  tenantId: string,
  parentId: string,
  childId?: string,
) {
  const { children, activeChild } = await resolveParentChild(tenantId, parentId, childId);
  if (!activeChild) {
    return { children, activeChildId: null, subjects: [] };
  }

  const yearId = await getActiveAcademicYearId(tenantId);
  const subjects = yearId
    ? await loadStudentSubjects(tenantId, yearId, activeChild.id)
    : [];

  return {
    children,
    activeChildId: activeChild.id,
    subjects: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      chapters: s.chapters.map((c) => ({
        id: c.id,
        number: c.number,
        name: c.name,
        topicCount: c.topicCount,
        completedCount: c.completedCount,
        topics: c.topics.map((t) => ({
          id: t.id,
          number: t.number,
          title: t.title,
          progressPercent: t.progressPercent,
          contentStatus: t.contentStatus,
        })),
      })),
    })),
  };
}

export async function loadParentLeavePageData(
  tenantId: string,
  parentId: string,
  childId?: string,
) {
  const { children, activeChild } = await resolveParentChild(tenantId, parentId, childId);
  if (!activeChild) return { children, activeChildId: null, requests: [] };
  const { loadParentLeaveData } = await import(
    "@/infrastructure/seniors/seniors-parent-services"
  );
  const requests = await loadParentLeaveData(tenantId, parentId, activeChild.id);
  return { children, activeChildId: activeChild.id, requests };
}

export async function loadParentFeesPageData(
  tenantId: string,
  parentId: string,
  childId?: string,
) {
  const { children, activeChild } = await resolveParentChild(tenantId, parentId, childId);
  if (!activeChild) return { children, activeChildId: null, dueTotal: 0, fees: [] };
  const { loadParentFeesData } = await import(
    "@/infrastructure/seniors/seniors-parent-services"
  );
  const fees = await loadParentFeesData(tenantId, activeChild.id);
  return { children, activeChildId: activeChild.id, ...fees };
}

export async function loadParentTransportPageData(
  tenantId: string,
  parentId: string,
  childId?: string,
) {
  const { children, activeChild } = await resolveParentChild(tenantId, parentId, childId);
  if (!activeChild) {
    return {
      children,
      activeChildId: null,
      assignment: null,
      routes: [],
      updateRequests: [],
    };
  }
  const { loadParentTransportData } = await import(
    "@/infrastructure/seniors/seniors-parent-services"
  );
  const transport = await loadParentTransportData(tenantId, activeChild.id);
  return { children, activeChildId: activeChild.id, ...transport };
}

export async function loadParentCatalogPageData(
  tenantId: string,
  parentId: string,
  type: import("@/infrastructure/seniors/seniors-parent-services").CatalogType,
  childId?: string,
) {
  const { children, activeChild } = await resolveParentChild(tenantId, parentId, childId);
  if (!activeChild) return { children, activeChildId: null, catalogs: [], selections: [] };
  const { loadParentCatalogData } = await import(
    "@/infrastructure/seniors/seniors-parent-services"
  );
  const data = await loadParentCatalogData(tenantId, type, activeChild.id, parentId);
  return { children, activeChildId: activeChild.id, ...data };
}
