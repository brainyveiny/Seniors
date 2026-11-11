import { cache } from "react";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import {
  getParentSessionFromCookies,
  getTeacherSessionFromCookies,
} from "@/infrastructure/auth/session";
import type { SeniorsQuizQuestion } from "@/domain/seniors/types";
import { normalizeTopicDiagrams } from "@/domain/seniors/topic-diagrams";
import type { TopicPageData } from "@/presentation/components/templates/seniors/student/StudentTopicPage";
import { cookies } from "next/headers";
import { findTenantBySlug } from "@/infrastructure/database/tenant-repository";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { contentStatusPercentages } from "@/application/seniors/content-status";
import { seniorsTenantLoginRedirect } from "@/shared/lib/seniors-platform-urls";
import { getTeacherScope, getActiveAcademicYearId } from "@/infrastructure/seniors/seniors-repository";
import { seniorsUserStillExistsCached } from "@/infrastructure/seniors/seniors-user-guard";
import { seniorsDashboardsTag } from "@/infrastructure/seniors/seniors-dashboard-cache";

const TEACHER_DASHBOARD_REVALIDATE_SECONDS = 30;
const SCHOOL_ADMIN_DASHBOARD_REVALIDATE_SECONDS = 45;
const PARENT_DASHBOARD_REVALIDATE_SECONDS = 20;

const getTenantId = cache(async (tenant: string) => {
  const row = await findTenantBySlug(tenant);
  if (!row) redirect(`/seniors`);
  return row.id;
});

export const requireTeacher = cache(async (tenant: string) => {
  const session = await getTeacherSessionFromCookies();
  if (!session || session.tenant !== tenant || session.role !== "teacher") {
    redirect(seniorsTenantLoginRedirect(tenant, "teacher"));
  }
  const tenantId = await getTenantId(tenant);
  const exists = await seniorsUserStillExistsCached(tenantId, session.userId, "teacher");
  if (!exists) {
    redirect(seniorsTenantLoginRedirect(tenant, "teacher"));
  }
  return { session, tenantId };
});

export const requireParent = cache(async (tenant: string) => {
  const session = await getParentSessionFromCookies();
  if (!session || session.tenant !== tenant || session.role !== "parent") {
    redirect(seniorsTenantLoginRedirect(tenant, "parent"));
  }
  const tenantId = await getTenantId(tenant);
  const exists = await seniorsUserStillExistsCached(tenantId, session.userId, "parent");
  if (!exists) {
    redirect(seniorsTenantLoginRedirect(tenant, "parent"));
  }
  return { session, tenantId };
});

export const requireSchoolAdmin = cache(async (tenant: string) => {
  const cookieStore = await cookies();
  const token = cookieStore.get("th_admin_session")?.value;
  const { verifyAdminToken } = await import("@/infrastructure/auth/session");
  const session = token ? await verifyAdminToken(token) : null;
  if (!session || session.tenant !== tenant || session.role !== "school-admin") {
    redirect(seniorsTenantLoginRedirect(tenant, "school-admin"));
  }
  const tenantId = await getTenantId(tenant);
  const exists = await seniorsUserStillExistsCached(tenantId, session.userId, "school-admin");
  if (!exists) {
    redirect(seniorsTenantLoginRedirect(tenant, "school-admin"));
  }
  return { session, tenantId };
});

export async function loadTeacherDashboard(
  tenant: string,
  classId?: string | null,
) {
  const { session, tenantId } = await requireTeacher(tenant);
  const requestedClassId = classId?.trim() || "";
  const data = await unstable_cache(
    () => fetchTeacherDashboardData(tenantId, session.userId, requestedClassId),
    ["teacher-dashboard", tenantId, session.userId, requestedClassId],
    {
      revalidate: TEACHER_DASHBOARD_REVALIDATE_SECONDS,
      tags: [seniorsDashboardsTag(tenantId)],
    },
  )();
  return { session, ...data };
}

async function fetchTeacherDashboardData(
  tenantId: string,
  teacherId: string,
  requestedClassId: string,
) {
  const prisma = getPrismaClient();
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const scope = await getTeacherScope(tenantId, teacherId);

  const classRows = await prisma.seniorsClass.findMany({
    where: {
      tenantId,
      ...(scope.hasAssignments ? { id: { in: scope.classIds } } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, section: true },
  });
  const classesList = classRows.map((c) => ({
    id: c.id,
    label: `${c.name}${c.section ? ` ${c.section}` : ""}`.trim(),
  }));

  const filterClassId =
    requestedClassId && classesList.some((c) => c.id === requestedClassId)
      ? requestedClassId
      : null;

  const subjectWhere = {
    tenantId,
    ...(filterClassId ? { classId: filterClassId } : {}),
    ...(scope.hasAssignments ? { id: { in: scope.subjectIds } } : {}),
  };
  const studentWhere = {
    tenantId,
    ...(filterClassId
      ? { classId: filterClassId }
      : scope.hasAssignments
        ? { classId: { in: scope.classIds } }
        : {}),
  };
  const assignmentScopeWhere = filterClassId
    ? { targetClassId: filterClassId }
    : scope.hasAssignments
      ? {
          OR: [
            { targetClassId: null },
            { targetClassId: { in: scope.classIds } },
          ],
        }
      : {};
  const examWhere = {
    tenantId,
    ...assignmentScopeWhere,
  };
  const contentTopicWhere = filterClassId
    ? { topic: { chapter: { subject: { classId: filterClassId } } } }
    : scope.hasAssignments
      ? { topic: { chapter: { subjectId: { in: scope.subjectIds } } } }
      : {};
  const quizTopicWhere = filterClassId
    ? { topic: { chapter: { subject: { classId: filterClassId } } } }
    : scope.hasAssignments
      ? { topic: { chapter: { subjectId: { in: scope.subjectIds } } } }
      : {};

  const [
    subjects,
    assignments,
    exams,
    examsThisWeek,
    students,
    settings,
    recentContent,
    recentAssignments,
    recentQuizzes,
    pendingSubmissions,
  ] = await Promise.all([
    prisma.seniorsSubject.findMany({
      where: subjectWhere,
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        chapters: {
          select: {
            name: true,
            topics: {
              select: {
                id: true,
                title: true,
                number: true,
                contentStatus: true,
              },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    }),
    prisma.seniorsAssignment.count({
      where: { tenantId, ...assignmentScopeWhere },
    }),
    prisma.seniorsExam.count({ where: { ...examWhere, examAt: { gte: now } } }),
    prisma.seniorsExam.count({
      where: { ...examWhere, examAt: { gte: now, lte: weekEnd } },
    }),
    prisma.seniorsStudentProfile.count({ where: studentWhere }),
    prisma.seniorsSchoolSettings.findUnique({
      where: { tenantId },
      select: { schoolName: true },
    }),
    prisma.seniorsTopicContent.findMany({
      where: { tenantId, ...contentTopicWhere },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        contentType: true,
        updatedAt: true,
        topic: {
          select: {
            title: true,
            chapter: {
              select: {
                name: true,
                subject: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.seniorsAssignment.findMany({
      where: { tenantId, ...assignmentScopeWhere },
      orderBy: { createdAt: "desc" },
      take: 2,
      select: {
        id: true,
        title: true,
        subjectName: true,
        chapterName: true,
        createdAt: true,
      },
    }),
    prisma.seniorsQuiz.findMany({
      where: { tenantId, ...quizTopicWhere },
      orderBy: { createdAt: "desc" },
      take: 2,
      select: {
        id: true,
        title: true,
        createdAt: true,
        topic: {
          select: {
            title: true,
            chapter: {
              select: {
                name: true,
                subject: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.seniorsAssignmentSubmission.count({
      where: {
        tenantId,
        status: "submitted",
        assignment: assignmentScopeWhere,
      },
    }),
  ]);

  const allTopicRows = subjects.flatMap((s) =>
    s.chapters.flatMap((c) =>
      c.topics.map((t) => ({
        id: t.id,
        title: t.title,
        number: t.number,
        subjectName: s.name,
        chapterName: c.name,
        contentStatus: (t.contentStatus || "missing") as
          | "complete"
          | "in_progress"
          | "missing",
      })),
    ),
  );
  const topicStatus = allTopicRows.slice(0, 8);
  const missingTopics = allTopicRows.filter((t) => t.contentStatus === "missing").length;
  const coverage = contentStatusPercentages(allTopicRows);
  const classes = filterClassId ? 1 : classRows.length;

  type Activity = { id: string; message: string; at: Date };
  const recentActivity: Activity[] = [
    ...recentContent.map((c) => ({
      id: `c-${c.id}`,
      message: `You published notes for ${c.topic.chapter.name}: ${c.topic.title} (${c.topic.chapter.subject.name})`,
      at: c.updatedAt,
    })),
    ...recentAssignments.map((a) => ({
      id: `a-${a.id}`,
      message: `You assigned homework for ${a.chapterName}: ${a.title} (${a.subjectName})`,
      at: a.createdAt,
    })),
    ...recentQuizzes.map((q) => ({
      id: `q-${q.id}`,
      message: `You created a quiz for ${q.topic.chapter.name}: ${q.topic.title} (${q.topic.chapter.subject.name})`,
      at: q.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 5);

  return {
    schoolName: settings?.schoolName || "School",
    classes: classesList,
    selectedClassId: filterClassId,
    stats: {
      classes,
      students,
      pendingAssignments: assignments,
      upcomingTests: exams,
    },
    coverage,
    topicStatus,
    priorities: {
      homeworkToReview: pendingSubmissions,
      topicsMissing: missingTopics,
      upcomingTestsThisWeek: examsThisWeek,
    },
    recentActivity,
  };
}

export async function loadParentDashboard(tenant: string, childId?: string) {
  const { session, tenantId } = await requireParent(tenant);
  const requestedChildId = childId?.trim() || "";
  const data = await unstable_cache(
    () => fetchParentDashboardData(tenant, tenantId, session.userId, requestedChildId),
    ["parent-dashboard", tenant, tenantId, session.userId, requestedChildId],
    {
      revalidate: PARENT_DASHBOARD_REVALIDATE_SECONDS,
      tags: [seniorsDashboardsTag(tenantId)],
    },
  )();
  return { session, ...data };
}

async function fetchParentDashboardData(
  tenant: string,
  tenantId: string,
  parentId: string,
  requestedChildId: string,
) {
  const prisma = getPrismaClient();
  const { daysUntil } = await import("@/application/seniors/continue-learning");
  const {
    getActiveAcademicYearId,
    loadStudentDashboard,
    loadStudentHomework,
    loadStudentSubjects,
  } = await import("@/infrastructure/seniors/seniors-repository");

  const children = await prisma.seniorsParentChild.findMany({
    where: { tenantId, parentId },
    include: {
      student: {
        include: {
          seniorsStudentProfile: { include: { class: true } },
        },
      },
    },
  });

  const child =
    (requestedChildId
      ? children.find((c) => c.studentId === requestedChildId)
      : undefined) ?? children[0];
  let progress = { percent: 0, topicsCompleted: 0, topicsTotal: 0, testAverage: 0 };
  let homeworkDue = 0;
  let subjectProgress: {
    name: string;
    completed: number;
    total: number;
    percent: number;
  }[] = [];

  if (child) {
    const yearId = await getActiveAcademicYearId(tenantId);
    const [dash, homework, subjects] = await Promise.all([
      loadStudentDashboard(tenant, tenantId, child.studentId, child.student.fullName),
      loadStudentHomework(tenantId, child.studentId),
      yearId
        ? loadStudentSubjects(tenantId, yearId, child.studentId)
        : Promise.resolve([]),
    ]);
    if (dash) progress = dash.progressSummary;
    homeworkDue = homework.filter((h) => h.submissionStatus === "pending").length;
    subjectProgress = subjects
      .map((s) => {
        const topics = s.chapters.flatMap((c) => c.topics);
        const total = topics.length;
        const completed = topics.filter((t) => t.progressPercent >= 100).length;
        return {
          name: s.name,
          completed,
          total,
          percent: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      })
      .filter((s) => s.total > 0);
  }

  const [exams, announcements] = await Promise.all([
    prisma.seniorsExam.findMany({
      where: {
        tenantId,
        examAt: { gte: new Date() },
        OR: [
          { targetClassId: null },
          ...(child?.student.seniorsStudentProfile?.classId
            ? [{ targetClassId: child.student.seniorsStudentProfile.classId }]
            : []),
        ],
      },
      orderBy: { examAt: "asc" },
      take: 5,
    }),
    prisma.seniorsAnnouncement.findMany({
      where: { tenantId, source: "school" },
      orderBy: { publishedAt: "desc" },
      take: 40,
    }),
  ]);
  const { isAnnouncementVisibleTo } = await import(
    "@/infrastructure/seniors/seniors-announcement-audience"
  );
  const parentClassIds = children
    .map((row) => row.student.seniorsStudentProfile?.classId)
    .filter((id): id is string => Boolean(id));
  const visibleAnnouncements = announcements.filter((item) =>
    isAnnouncementVisibleTo(item, {
      role: "parent",
      userId: parentId,
      classIds: parentClassIds,
    }),
  );

  let attendancePercent = 0;
  if (child) {
    const { loadStudentAttendanceSummary } = await import(
      "@/infrastructure/seniors/seniors-attendance"
    );
    const attendance = await loadStudentAttendanceSummary(tenantId, child.studentId);
    attendancePercent = attendance.percent;
  }

  return {
    activeChildId: child?.studentId ?? null,
    children: children.map((c) => ({
      id: c.studentId,
      name: c.student.fullName,
      className: c.student.seniorsStudentProfile?.class?.name ?? "Class",
    })),
    progress,
    homeworkDue,
    attendancePercent,
    announcementCount: visibleAnnouncements.length,
    subjectProgress,
    exams: exams.map((e) => ({
      id: e.id,
      title: e.title,
      examAt: e.examAt,
      daysLeft: daysUntil(e.examAt),
    })),
    announcements: visibleAnnouncements.slice(0, 5).map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      publishedAt: a.publishedAt,
    })),
  };
}

export async function loadSchoolAdminDashboard(tenant: string) {
  const { session, tenantId } = await requireSchoolAdmin(tenant);
  const data = await unstable_cache(
    () => fetchSchoolAdminDashboardData(tenantId),
    ["school-admin-dashboard", tenantId],
    {
      revalidate: SCHOOL_ADMIN_DASHBOARD_REVALIDATE_SECONDS,
      tags: [seniorsDashboardsTag(tenantId)],
    },
  )();
  const adminName =
    session.fullName?.trim() && !session.fullName.toLowerCase().includes("school")
      ? session.fullName.split(" ")[0]
      : "Admin";
  return { adminName, ...data };
}

async function fetchSchoolAdminDashboardData(tenantId: string) {
  const prisma = getPrismaClient();
  const [students, teachers, parents, topicStatusGroups, events, settings, pendingEnquiries] =
    await Promise.all([
      prisma.platformUser.count({ where: { tenantId, userType: "student" } }),
      prisma.platformUser.count({ where: { tenantId, userType: "teacher" } }),
      prisma.platformUser.count({ where: { tenantId, userType: "parent" } }),
      prisma.seniorsTopic.groupBy({
        by: ["contentStatus"],
        where: { tenantId },
        _count: { _all: true },
      }),
      prisma.seniorsAnalyticsEvent.count({
        where: {
          tenantId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
        },
      }),
      prisma.seniorsSchoolSettings.findUnique({ where: { tenantId } }),
      prisma.seniorsJoinRequest.count({
        where: { tenantId, status: "pending" },
      }),
    ]);

  const countByStatus = Object.fromEntries(
    topicStatusGroups.map((row) => [row.contentStatus, row._count._all]),
  );
  const completeCount = countByStatus.complete ?? 0;
  const inProgressCount = countByStatus.in_progress ?? 0;
  const missingCount = countByStatus.missing ?? 0;
  const totalTopics = topicStatusGroups.reduce((sum, row) => sum + row._count._all, 0);

  const coveragePct =
    totalTopics === 0
      ? { complete: 0, inProgress: 0, missing: 0 }
      : {
          complete: Math.round((completeCount / totalTopics) * 100),
          inProgress: Math.round((inProgressCount / totalTopics) * 100),
          missing: Math.round((missingCount / totalTopics) * 100),
        };

  const parentAdoption =
    parents > 0
      ? Math.min(100, Math.round((parents / Math.max(students, 1)) * 100))
      : 0;
  const platformUsage = Math.min(
    100,
    Math.round((events / Math.max(students * 10, 1)) * 100),
  );

  const weekMs = 7 * 24 * 3600 * 1000;
  const now = Date.now();
  const weekEnds = [4, 3, 2, 1, 0].map((weeksAgo) => new Date(now - weeksAgo * weekMs));
  const rangeStart = new Date(now - 5 * weekMs);

  const [teacherRows, teacherActivity] = await Promise.all([
    prisma.platformUser.findMany({
      where: { tenantId, userType: "teacher" },
      select: { id: true, joinedAt: true, lastLoginAt: true },
    }),
    prisma.seniorsAnalyticsEvent.findMany({
      where: {
        tenantId,
        role: "teacher",
        createdAt: { gte: rangeStart },
        userId: { not: null },
      },
      select: { userId: true, createdAt: true },
    }),
  ]);

  const teacherIdSet = new Set(teacherRows.map((t) => t.id));
  const labels = ["Week 1", "Week 2", "Week 3", "Week 4", "Now"];
  const teachersActiveSeries = weekEnds.map((weekEnd, index) => {
    const weekStart = new Date(weekEnd.getTime() - weekMs);
    const activeInWeek = new Set<string>();
    for (const ev of teacherActivity) {
      if (!ev.userId || !teacherIdSet.has(ev.userId)) continue;
      const at = new Date(ev.createdAt).getTime();
      if (at >= weekStart.getTime() && at <= weekEnd.getTime()) {
        activeInWeek.add(ev.userId);
      }
    }
    for (const t of teacherRows) {
      if (!t.lastLoginAt) continue;
      const at = new Date(t.lastLoginAt).getTime();
      if (at >= weekStart.getTime() && at <= weekEnd.getTime()) {
        activeInWeek.add(t.id);
      }
    }
    if (activeInWeek.size > 0) return activeInWeek.size;
    const joinedByWeek = teacherRows.filter(
      (t) => new Date(t.joinedAt).getTime() <= weekEnd.getTime(),
    ).length;
    if (index === weekEnds.length - 1) return teachers;
    return Math.max(0, Math.min(teachers, joinedByWeek || Math.round((teachers * (index + 1)) / 5)));
  });

  return {
    schoolName: settings?.schoolName || "School",
    pendingEnquiries,
    stats: {
      totalStudents: students,
      totalTeachers: teachers,
      parentAdoption,
      platformUsage,
    },
    coverage: {
      ...coveragePct,
      completeCount,
      inProgressCount,
      missingCount,
      totalTopics,
    },
    usageSeries: {
      labels,
      students: [students, students, students, students, students],
      teachers: teachersActiveSeries,
    },
  };
}

const requireTeacherContext = cache(async (tenant: string) => {
  const { session, tenantId } = await requireTeacher(tenant);
  const yearId = await getActiveAcademicYearId(tenantId);
  const scope = await getTeacherScope(tenantId, session.userId);
  return { session, tenantId, yearId, scope };
});

function topicScopeWhere(
  tenantId: string,
  yearId: string | null,
  scope: Awaited<ReturnType<typeof getTeacherScope>>,
) {
  return {
    tenantId,
    ...(yearId ? { academicYearId: yearId } : {}),
    ...(scope.hasAssignments
      ? { chapter: { subjectId: { in: scope.subjectIds } } }
      : {}),
  };
}

const topicListSelect = {
  id: true,
  slug: true,
  title: true,
  number: true,
  contentStatus: true,
  chapter: {
    select: {
      name: true,
      subject: {
        select: {
          id: true,
          name: true,
          class: { select: { name: true, section: true } },
        },
      },
    },
  },
};

function mapTopicRow(t: {
  id: string;
  slug: string;
  title: string;
  number: string;
  contentStatus: string;
  chapter: {
    name: string;
    subject: {
      id?: string;
      name: string;
      class?: { name: string; section: string };
    };
  };
}) {
  const subjectClass = t.chapter.subject.class;
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    number: t.number,
    subjectId: t.chapter.subject.id ?? "",
    subjectName: t.chapter.subject.name,
    classLabel: subjectClass
      ? `${subjectClass.name} ${subjectClass.section}`.trim()
      : "",
    chapterName: t.chapter.name,
    contentStatus: t.contentStatus,
  };
}

export async function loadTeacherContentData(tenant: string) {
  const { session, tenantId, yearId, scope } = await requireTeacherContext(tenant);
  const prisma = getPrismaClient();
  const topicWhere = topicScopeWhere(tenantId, yearId, scope);

  const [topics, contents, quizzes, curriculumSubjects] = await Promise.all([
    prisma.seniorsTopic.findMany({
      where: topicWhere,
      select: topicListSelect,
      orderBy: { sortOrder: "asc" },
    }),
    prisma.seniorsTopicContent.findMany({
      where: {
        tenantId,
        ...(scope.hasAssignments
          ? { topic: { chapter: { subjectId: { in: scope.subjectIds } } } }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        contentType: true,
        uploadedByName: true,
        updatedAt: true,
        topic: {
          select: {
            title: true,
            chapter: {
              select: {
                name: true,
                subject: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.seniorsQuiz.findMany({
      where: {
        tenantId,
        ...(scope.hasAssignments
          ? { topic: { chapter: { subjectId: { in: scope.subjectIds } } } }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true,
        title: true,
        topicId: true,
        questions: true,
        updatedAt: true,
        topic: {
          select: {
            title: true,
            chapter: {
              select: {
                name: true,
                subject: { select: { name: true } },
              },
            },
          },
        },
        _count: { select: { attempts: true } },
      },
    }),
    prisma.seniorsSubject.findMany({
      where: {
        tenantId,
        ...(scope.hasAssignments ? { id: { in: scope.subjectIds } } : {}),
      },
      select: {
        id: true,
        name: true,
        class: { select: { name: true, section: true } },
        chapters: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, number: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return {
    session,
    scope,
    topics: topics.map((t) => mapTopicRow(t)),
    contents: contents.map((c) => ({
      id: c.id,
      title: c.title,
      contentType: c.contentType,
      topicTitle: c.topic.title,
      subjectName: c.topic.chapter.subject.name,
      chapterName: c.topic.chapter.name,
      uploadedByName: c.uploadedByName,
      updatedAt: c.updatedAt,
    })),
    quizzes: quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      topicId: q.topicId,
      topicTitle: q.topic.title,
      subjectName: q.topic.chapter.subject.name,
      chapterName: q.topic.chapter.name,
      questionCount: Array.isArray(q.questions) ? q.questions.length : 0,
      attemptCount: q._count.attempts,
      updatedAt: q.updatedAt,
    })),
    curriculumSubjects: curriculumSubjects.map((s) => ({
      id: s.id,
      name: s.name,
      classLabel: `${s.class.name} ${s.class.section}`.trim(),
      chapters: s.chapters,
    })),
    assignments: [],
    announcements: [],
    studentRecords: [],
  };
}

export async function loadTeacherAssignmentsData(tenant: string) {
  const { session, tenantId, yearId, scope } = await requireTeacherContext(tenant);
  const prisma = getPrismaClient();
  const topicWhere = topicScopeWhere(tenantId, yearId, scope);

  const [topics, assignments, students, classes, studentProfiles] = await Promise.all([
    prisma.seniorsTopic.findMany({
      where: topicWhere,
      select: topicListSelect,
      orderBy: { sortOrder: "asc" },
    }),
    prisma.seniorsAssignment.findMany({
      where: {
        tenantId,
        ...(scope.hasAssignments
          ? {
              OR: [
                { targetClassId: null },
                { targetClassId: { in: scope.classIds } },
              ],
            }
          : {}),
      },
      orderBy: { dueAt: "asc" },
      include: { submissions: true, topicLinks: true, targetClass: true },
    }),
    prisma.platformUser.findMany({
      where: { tenantId, userType: "student" },
      select: { id: true, fullName: true },
    }),
    prisma.seniorsClass.findMany({
      where: {
        tenantId,
        ...(scope.hasAssignments ? { id: { in: scope.classIds } } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.seniorsStudentProfile.findMany({
      where: {
        tenantId,
        ...(scope.hasAssignments ? { classId: { in: scope.classIds } } : {}),
      },
      select: {
        studentId: true,
        classId: true,
        student: { select: { fullName: true } },
      },
    }),
  ]);

  const studentNameById = new Map(students.map((s) => [s.id, s.fullName]));
  const scopedStudentIds = scope.hasAssignments
    ? studentProfiles.map((p) => p.studentId)
    : students.map((s) => s.id);

  return {
    session,
    scope,
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      section: c.section,
    })),
    topics: topics.map((t) => mapTopicRow(t)),
    assignments: assignments.map((a) => {
      const eligibleStudents = a.targetClassId
        ? studentProfiles
            .filter((p) => p.classId === a.targetClassId)
            .map((p) => ({
              id: p.studentId,
              name: p.student.fullName,
            }))
        : students
            .filter(
              (student) =>
                !scope.hasAssignments || scopedStudentIds.includes(student.id),
            )
            .map((student) => ({
              id: student.id,
              name: student.fullName,
            }));
      const submittedStudentIds = new Set(
        a.submissions
          .filter((s) => s.status !== "pending")
          .map((s) => s.studentId),
      );
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        subjectName: a.subjectName,
        chapterName: a.chapterName,
        targetClassId: a.targetClassId,
        targetClassName: a.targetClass
          ? `${a.targetClass.name} ${a.targetClass.section}`.trim()
          : null,
        dueAt: a.dueAt,
        questionCount: a.questionCount,
        attachmentUrls: a.attachmentUrls,
        createdByName: a.createdByName,
        topicIds: a.topicLinks.map((l) => l.topicId),
        expectedStudentCount: eligibleStudents.length,
        notSubmittedStudents: eligibleStudents.filter(
          (student) => !submittedStudentIds.has(student.id),
        ),
        submissions: a.submissions
          .filter((s) => !scope.hasAssignments || scopedStudentIds.includes(s.studentId))
          .map((s) => ({
            id: s.id,
            studentId: s.studentId,
            studentName: studentNameById.get(s.studentId) ?? "Student",
            status: s.status,
            answerText: s.answerText,
            attachmentUrls: s.attachmentUrls,
            score: s.score,
            feedback: s.feedback,
            submittedAt: s.submittedAt,
          })),
      };
    }),
    contents: [],
    quizzes: [],
    announcements: [],
    studentRecords: [],
    curriculumSubjects: [],
  };
}

export async function loadTeacherQuizzesData(tenant: string) {
  const { session, tenantId, yearId, scope } = await requireTeacherContext(tenant);
  const prisma = getPrismaClient();
  const topicWhere = topicScopeWhere(tenantId, yearId, scope);

  const [topics, quizzes, studentProfiles] = await Promise.all([
    prisma.seniorsTopic.findMany({
      where: topicWhere,
      select: topicListSelect,
      orderBy: { sortOrder: "asc" },
    }),
    prisma.seniorsQuiz.findMany({
      where: {
        tenantId,
        ...(scope.hasAssignments
          ? { topic: { chapter: { subjectId: { in: scope.subjectIds } } } }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        topicId: true,
        questions: true,
        updatedAt: true,
        topic: {
          include: {
            chapter: {
              include: { subject: { include: { class: true } } },
            },
          },
        },
        attempts: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            studentId: true,
            score: true,
            maxScore: true,
            submittedAt: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.seniorsStudentProfile.findMany({
      where: {
        tenantId,
        ...(scope.hasAssignments ? { classId: { in: scope.classIds } } : {}),
      },
      select: {
        studentId: true,
        classId: true,
        student: { select: { fullName: true } },
      },
    }),
  ]);

  return {
    session,
    scope,
    topics: topics.map((t) => mapTopicRow(t)),
    quizzes: quizzes.map((q) => {
      const classId = q.topic.chapter.subject.classId;
      const eligibleStudents = studentProfiles
        .filter((p) => p.classId === classId)
        .map((p) => ({ id: p.studentId, name: p.student.fullName }));
      const latestAttemptByStudent = new Map<
        string,
        (typeof q.attempts)[number]
      >();
      for (const attempt of q.attempts) {
        if (!latestAttemptByStudent.has(attempt.studentId)) {
          latestAttemptByStudent.set(attempt.studentId, attempt);
        }
      }
      const latestAttempts = [...latestAttemptByStudent.values()];
      const attemptedStudentIds = new Set(latestAttemptByStudent.keys());
      const scoredAttempts = latestAttempts.filter(
        (attempt) => attempt.score != null && attempt.maxScore != null,
      );
      const percentages = scoredAttempts.map((attempt) =>
        attempt.maxScore && attempt.maxScore > 0
          ? Math.round(((attempt.score ?? 0) / attempt.maxScore) * 100)
          : 0,
      );
      return {
        id: q.id,
        title: q.title,
        topicId: q.topicId,
        topicTitle: q.topic.title,
        subjectName: q.topic.chapter.subject.name,
        chapterName: q.topic.chapter.name,
        className: `${q.topic.chapter.subject.class.name} ${q.topic.chapter.subject.class.section}`.trim(),
        questionCount: Array.isArray(q.questions) ? q.questions.length : 0,
        attemptCount: q.attempts.length,
        attemptedStudentCount: attemptedStudentIds.size,
        eligibleStudentCount: eligibleStudents.length,
        averagePercent:
          percentages.length > 0
            ? Math.round(
                percentages.reduce((sum, value) => sum + value, 0) /
                  percentages.length,
              )
            : null,
        highestPercent:
          percentages.length > 0 ? Math.max(...percentages) : null,
        attempts: latestAttempts.map((attempt) => ({
          id: attempt.id,
          studentId: attempt.studentId,
          studentName:
            studentProfiles.find((p) => p.studentId === attempt.studentId)
              ?.student.fullName ?? "Student",
          score: attempt.score,
          maxScore: attempt.maxScore,
          submittedAt: attempt.submittedAt ?? attempt.createdAt,
        })),
        notAttemptedStudents: eligibleStudents.filter(
          (student) => !attemptedStudentIds.has(student.id),
        ),
        updatedAt: q.updatedAt,
      };
    }),
    contents: [],
    assignments: [],
    announcements: [],
    studentRecords: [],
    curriculumSubjects: [],
  };
}

export async function loadTeacherAnnouncementsData(tenant: string) {
  const { session, tenantId, scope } = await requireTeacherContext(tenant);
  const prisma = getPrismaClient();
  const { isAnnouncementVisibleTo, announcementAudienceLabel, asIdList } =
    await import("@/infrastructure/seniors/seniors-announcement-audience");

  const classWhere = {
    tenantId,
    ...(scope.hasAssignments ? { id: { in: scope.classIds } } : {}),
  };

  const [ownPosts, schoolPosts, classes, studentProfiles] = await Promise.all([
    prisma.seniorsAnnouncement.findMany({
      where: { tenantId, source: "teacher" },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.seniorsAnnouncement.findMany({
      where: { tenantId, source: "school" },
      orderBy: { publishedAt: "desc" },
      take: 40,
    }),
    prisma.seniorsClass.findMany({
      where: classWhere,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, section: true },
    }),
    prisma.seniorsStudentProfile.findMany({
      where: {
        tenantId,
        ...(scope.hasAssignments ? { classId: { in: scope.classIds } } : {}),
      },
      select: {
        studentId: true,
        classId: true,
        student: { select: { id: true, fullName: true } },
        class: { select: { name: true, section: true } },
      },
      orderBy: { student: { fullName: "asc" } },
    }),
  ]);

  const schoolNotices = schoolPosts.filter((item) =>
    isAnnouncementVisibleTo(item, {
      role: "teacher",
      userId: session.userId,
    }),
  );

  const classDirectory = classes.map((c) => ({
    id: c.id,
    name: c.name,
    section: c.section,
  }));
  const peopleDirectory = studentProfiles.map((p) => ({
    id: p.student.id,
    fullName: p.student.fullName,
  }));

  function mapAnnouncement(a: (typeof ownPosts)[number]) {
    return {
      id: a.id,
      title: a.title,
      body: a.body,
      publishedAt: a.publishedAt,
      createdByName: a.createdByName,
      audienceType: a.audienceType,
      targetClassIds: asIdList(a.targetClassIds),
      targetUserIds: asIdList(a.targetUserIds),
      audienceLabel: announcementAudienceLabel(a, {
        classes: classDirectory,
        people: peopleDirectory,
      }),
    };
  }

  return {
    session,
    schoolNotices: schoolNotices.map(mapAnnouncement),
    announcements: ownPosts.map(mapAnnouncement),
    classes: classDirectory.map((c) => ({
      id: c.id,
      name: c.name,
      section: c.section,
    })),
    announcementStudents: studentProfiles.map((p) => ({
      id: p.student.id,
      name: p.student.fullName,
      classId: p.classId,
      className: `${p.class.name} ${p.class.section}`.trim(),
    })),
    topics: [],
    contents: [],
    assignments: [],
    quizzes: [],
    studentRecords: [],
    curriculumSubjects: [],
  };
}

export async function loadTeacherStudentsData(tenant: string) {
  const { session, tenantId, yearId, scope } = await requireTeacherContext(tenant);
  const prisma = getPrismaClient();
  const classFilter = scope.hasAssignments
    ? { classId: { in: scope.classIds } }
    : {};

  const profiles = await prisma.seniorsStudentProfile.findMany({
    where: { tenantId, ...classFilter },
    select: {
      studentId: true,
      classId: true,
      rollNumber: true,
      student: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
      class: { select: { name: true, section: true } },
    },
  });

  const studentIds = profiles.map((p) => p.studentId);
  const classIds = [...new Set(profiles.map((p) => p.classId))];
  const now = new Date();

  if (!studentIds.length) {
    return {
      session,
      scope,
      studentRecords: [],
      topics: [],
      contents: [],
      assignments: [],
      quizzes: [],
      announcements: [],
      curriculumSubjects: [],
    };
  }

  const [
    progressByStudent,
    quizAvgByStudent,
    quizCountByStudent,
    topicRows,
    assignmentMeta,
    overdueAssignments,
    parentLinks,
  ] = await Promise.all([
    prisma.seniorsTopicProgress.groupBy({
      by: ["studentId"],
      where: {
        tenantId,
        isCompleted: true,
        studentId: { in: studentIds },
      },
      _count: { _all: true },
    }),
    prisma.seniorsQuizAttempt.groupBy({
      by: ["studentId"],
      where: {
        tenantId,
        score: { not: null },
        studentId: { in: studentIds },
      },
      _avg: { score: true, maxScore: true },
    }),
    prisma.seniorsQuizAttempt.groupBy({
      by: ["studentId"],
      where: {
        tenantId,
        score: { not: null },
        studentId: { in: studentIds },
      },
      _count: { _all: true },
    }),
    // Lightweight: only classId for topic totals (no full topic payloads)
    prisma.seniorsSubject.findMany({
      where: { tenantId, classId: { in: classIds } },
      select: {
        classId: true,
        chapters: {
          select: {
            _count: {
              select: {
                topics: yearId
                  ? { where: { academicYearId: yearId } }
                  : true,
              },
            },
          },
        },
      },
    }),
    prisma.seniorsAssignment.findMany({
      where: {
        tenantId,
        OR: [{ targetClassId: null }, { targetClassId: { in: classIds } }],
      },
      orderBy: { dueAt: "desc" },
      take: 30,
      select: { id: true, targetClassId: true },
    }),
    prisma.seniorsAssignment.findMany({
      where: {
        tenantId,
        dueAt: { lt: now },
        OR: [{ targetClassId: null }, { targetClassId: { in: classIds } }],
      },
      orderBy: { dueAt: "desc" },
      take: 15,
      select: { id: true, title: true, dueAt: true, targetClassId: true },
    }),
    prisma.seniorsParentChild.findMany({
      where: { tenantId, studentId: { in: studentIds } },
      select: {
        studentId: true,
        parent: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    }),
  ]);

  const assignmentIds = assignmentMeta.map((a) => a.id);
  const overdueIds = overdueAssignments.map((a) => a.id);

  const [submittedByStudent, overdueSubmitted] = await Promise.all([
    assignmentIds.length
      ? prisma.seniorsAssignmentSubmission.groupBy({
          by: ["studentId"],
          where: {
            tenantId,
            studentId: { in: studentIds },
            assignmentId: { in: assignmentIds },
            status: { not: "pending" },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    overdueIds.length
      ? prisma.seniorsAssignmentSubmission.findMany({
          where: {
            tenantId,
            studentId: { in: studentIds },
            assignmentId: { in: overdueIds },
            status: { not: "pending" },
          },
          select: { studentId: true, assignmentId: true },
        })
      : Promise.resolve([]),
  ]);

  const topicsByClass = new Map<string, number>();
  for (const subject of topicRows) {
    const n = subject.chapters.reduce((sum, ch) => sum + ch._count.topics, 0);
    topicsByClass.set(subject.classId, (topicsByClass.get(subject.classId) ?? 0) + n);
  }

  const progressMap = new Map(
    progressByStudent.map((r) => [r.studentId, r._count._all]),
  );
  const quizAvgMap = new Map(
    quizAvgByStudent.map((r) => [r.studentId, r]),
  );
  const quizCountMap = new Map(
    quizCountByStudent.map((r) => [r.studentId, r._count._all]),
  );
  const submittedMap = new Map(
    submittedByStudent.map((r) => [r.studentId, r._count._all]),
  );
  const overdueSubmittedSet = new Set(
    overdueSubmitted.map((s) => `${s.studentId}:${s.assignmentId}`),
  );

  return {
    session,
    scope,
    studentRecords: profiles.map((p) => {
      const completed = progressMap.get(p.studentId) ?? 0;
      const quiz = quizAvgMap.get(p.studentId);
      const avg =
        quiz?._avg.score != null && quiz._avg.maxScore
          ? Math.round((quiz._avg.score / quiz._avg.maxScore) * 100)
          : null;
      const totalTopics = topicsByClass.get(p.classId) ?? 0;
      const classAssignments = assignmentMeta.filter(
        (a) => !a.targetClassId || a.targetClassId === p.classId,
      );
      const missingAssignments = overdueAssignments
        .filter(
          (a) =>
            (!a.targetClassId || a.targetClassId === p.classId) &&
            !overdueSubmittedSet.has(`${p.studentId}:${a.id}`),
        )
        .map((a) => ({ id: a.id, title: a.title, dueAt: a.dueAt }));

      const attentionReasons: string[] = [];
      if (avg != null && avg < 60) {
        attentionReasons.push(`Quiz average is low (${avg}%)`);
      }
      if (missingAssignments.length > 0) {
        attentionReasons.push(
          `${missingAssignments.length} overdue assignment${
            missingAssignments.length === 1 ? "" : "s"
          } not submitted`,
        );
      }
      if (totalTopics > 0 && completed / totalTopics < 0.25) {
        attentionReasons.push(
          `Only ${completed} of ${totalTopics} topics completed`,
        );
      }

      return {
        id: p.studentId,
        name: p.student.fullName,
        email: p.student.email,
        phone: p.student.phone,
        className: `${p.class.name} ${p.class.section}`.trim(),
        classId: p.classId,
        rollNumber: p.rollNumber,
        topicsCompleted: completed,
        totalTopics,
        quizAverage: avg,
        quizAttemptCount: quizCountMap.get(p.studentId) ?? 0,
        assignmentsAssigned: classAssignments.length,
        assignmentsSubmitted: submittedMap.get(p.studentId) ?? 0,
        missingAssignments,
        recentQuizAttempts: [],
        attentionReasons,
        needsAttention: attentionReasons.length > 0,
        parents: parentLinks
          .filter((link) => link.studentId === p.studentId)
          .map((link) => link.parent),
      };
    }),
    topics: [],
    contents: [],
    assignments: [],
    quizzes: [],
    announcements: [],
    curriculumSubjects: [],
  };
}

export async function loadTeacherClassworkData(tenant: string) {
  const [assignments, quizzes] = await Promise.all([
    loadTeacherAssignmentsData(tenant),
    loadTeacherQuizzesData(tenant),
  ]);

  return {
    session: assignments.session,
    scope: assignments.scope,
    classes: assignments.classes,
    topics: assignments.topics,
    assignments: assignments.assignments,
    quizzes: quizzes.quizzes,
    contents: [],
    announcements: [],
    studentRecords: [],
    curriculumSubjects: [],
  };
}

export async function loadTeacherAttendanceData(
  tenant: string,
  options?: { classId?: string; date?: string },
) {
  const { session, tenantId, scope } = await requireTeacherContext(tenant);
  const prisma = getPrismaClient();
  const { loadClassAttendanceForDate } = await import(
    "@/infrastructure/seniors/seniors-attendance"
  );

  const classes = await prisma.seniorsClass.findMany({
    where: {
      tenantId,
      ...(scope.hasAssignments ? { id: { in: scope.classIds } } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      section: true,
      _count: { select: { students: true } },
    },
  });

  const selectedClassId =
    options?.classId && classes.some((c) => c.id === options.classId)
      ? options.classId
      : classes.find((c) => c._count.students > 0)?.id ?? classes[0]?.id ?? null;
  const date = options?.date ? new Date(options.date) : new Date();
  const attendance = selectedClassId
    ? await loadClassAttendanceForDate(tenantId, selectedClassId, date)
    : {
        date,
        students: [] as {
          studentId: string;
          fullName: string;
          rollNumber: string;
          status: string | null;
          note: string;
        }[],
      };

  return {
    session,
    scope,
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      section: c.section,
      studentCount: c._count.students,
    })),
    selectedClassId,
    date: attendance.date.toISOString(),
    students: attendance.students,
  };
}

/** @deprecated Prefer page-specific loaders; kept for any residual callers. */
export async function loadTeacherWorkspace(tenant: string) {
  return loadTeacherContentData(tenant);
}

export async function loadTeacherTopicPreviewData(
  tenant: string,
  topicSlug: string,
): Promise<TopicPageData | null> {
  const { tenantId } = await requireTeacher(tenant);
  const prisma = getPrismaClient();
  const topic = await prisma.seniorsTopic.findFirst({
    where: { tenantId, slug: topicSlug },
    include: {
      chapter: { include: { subject: true } },
      contents: { orderBy: { sortOrder: "asc" } },
      topicLinks: { include: { assignment: true } },
    },
  });
  if (!topic) return null;

  const quizRows = await prisma.seniorsQuiz.findMany({
    where: { tenantId, topicId: topic.id },
    orderBy: { updatedAt: "desc" },
  });

  const chapters = await prisma.seniorsChapter.findMany({
    where: {
      tenantId,
      subjectId: topic.chapter.subjectId,
    },
    orderBy: { sortOrder: "asc" },
    select: {
      topics: {
        where: { academicYearId: topic.academicYearId },
        orderBy: { sortOrder: "asc" },
        select: { slug: true, number: true, title: true },
      },
    },
  });
  const siblings = chapters.flatMap((chapter) => chapter.topics);
  const idx = siblings.findIndex((item) => item.slug === topicSlug);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
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
      questions: (quizDraft
        ? quiz.draftQuestions
        : quiz.questions) as unknown as SeniorsQuizQuestion[],
    };
  });

  return {
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
    contents: topic.contents.map((content) => ({
      id: content.id,
      contentType: content.contentType,
      title: content.title,
      body: content.body,
      fileUrl: content.fileUrl,
      uploadedByName: content.uploadedByName,
      updatedAt: content.updatedAt,
    })),
    homework: topic.topicLinks.map((link) => ({
      id: link.assignment.id,
      title: link.assignment.title,
      dueAt: link.assignment.dueAt,
      questionCount: link.assignment.questionCount,
    })),
    quizzes,
    quiz: quizzes[0] ?? null,
    prevSlug: prev?.slug ?? null,
    nextSlug: next?.slug ?? null,
    prevTitle: prev ? `${prev.number} ${prev.title}` : null,
    nextTitle: next ? `${next.number} ${next.title}` : null,
    topicPosition: idx >= 0 ? idx + 1 : 1,
    topicTotal: siblings.length,
  };
}

export async function loadParentChildrenData(tenant: string) {
  const { tenantId, session } = await requireParent(tenant);
  const prisma = getPrismaClient();
  const {
    loadStudentDashboard,
    loadStudentHomework,
    loadStudentSubjects,
    loadStudentExams,
    getActiveAcademicYearId,
  } = await import("@/infrastructure/seniors/seniors-repository");
  const { daysUntil } = await import("@/application/seniors/continue-learning");

  const [links, announcements, yearId] = await Promise.all([
    prisma.seniorsParentChild.findMany({
      where: { tenantId, parentId: session.userId },
      include: {
        student: {
          include: {
            seniorsStudentProfile: { include: { class: true } },
          },
        },
      },
    }),
    prisma.seniorsAnnouncement.findMany({
      where: { tenantId, source: "school" },
      orderBy: { publishedAt: "desc" },
      take: 40,
    }),
    getActiveAcademicYearId(tenantId),
  ]);

  const childrenDetailed = await Promise.all(
    links.map(async (link) => {
      const childId = link.studentId;
      const [dash, homework, subjects, quizAttempts, exams] = await Promise.all([
        loadStudentDashboard(tenant, tenantId, childId, link.student.fullName),
        loadStudentHomework(tenantId, childId, { includeSubmitted: true }),
        yearId ? loadStudentSubjects(tenantId, yearId, childId) : Promise.resolve([]),
        prisma.seniorsQuizAttempt.findMany({
          where: { tenantId, studentId: childId, score: { not: null } },
          orderBy: { submittedAt: "desc" },
          take: 5,
          include: { quiz: true },
        }),
        loadStudentExams(tenantId, childId),
      ]);

      const progress = dash?.progressSummary ?? {
        percent: 0,
        topicsCompleted: 0,
        topicsTotal: 0,
        testAverage: 0,
      };

      const subjectProgress = subjects
        .map((s) => {
          const topics = s.chapters.flatMap((c) => c.topics);
          const total = topics.length;
          const completed = topics.filter((t) => t.progressPercent >= 100).length;
          return {
            name: s.name,
            completed,
            total,
            percent: total > 0 ? Math.round((completed / total) * 100) : 0,
          };
        })
        .filter((s) => s.total > 0);

      const overdue = homework.filter(
        (h) => h.status === "overdue" && h.submissionStatus === "pending",
      );
      const dueSoon = homework.filter(
        (h) =>
          (h.status === "due_today" || h.status === "due_soon") &&
          h.submissionStatus === "pending",
      );

      return {
        id: childId,
        name: link.student.fullName,
        className: link.student.seniorsStudentProfile?.class?.name ?? "Class",
        progress,
        subjectProgress,
        homeworkDue: homework.filter((h) => h.submissionStatus === "pending").length,
        alerts: [
          ...overdue.map((h) => ({
            id: `hw-${h.id}`,
            type: "overdue" as const,
            title: `Overdue: ${h.title}`,
            detail: `${h.subjectName} • was due ${new Date(h.dueAt).toLocaleDateString()}`,
          })),
          ...dueSoon.map((h) => ({
            id: `due-${h.id}`,
            type: "homework" as const,
            title: `Due soon: ${h.title}`,
            detail: `${h.subjectName} • due ${new Date(h.dueAt).toLocaleDateString()}`,
          })),
          ...exams.slice(0, 2).map((e) => ({
            id: `exam-${e.id}`,
            type: "exam" as const,
            title: e.title,
            detail: `${daysUntil(e.examAt)} days left`,
          })),
        ],
        recentQuizzes: quizAttempts.map((a) => ({
          id: a.id,
          title: a.quiz.title,
          score: a.score,
          maxScore: a.maxScore,
          submittedAt: a.submittedAt,
        })),
        subjects: subjects.map((s) => ({
          name: s.name,
          chapters: s.chapters.map((c) => ({
            name: c.name,
            completedCount: c.completedCount,
            topicCount: c.topicCount,
          })),
        })),
      };
    }),
  );

  const { isAnnouncementVisibleTo } = await import(
    "@/infrastructure/seniors/seniors-announcement-audience"
  );
  const parentClassIds = links
    .map((link) => link.student.seniorsStudentProfile?.classId)
    .filter((id): id is string => Boolean(id));

  return {
    session,
    children: childrenDetailed,
    announcements: announcements
      .filter((item) =>
        isAnnouncementVisibleTo(item, {
          role: "parent",
          userId: session.userId,
          classIds: parentClassIds,
        }),
      )
      .slice(0, 8)
      .map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        publishedAt: a.publishedAt,
      })),
  };
}

export async function loadContentOversight(tenantId: string) {
  const prisma = getPrismaClient();
  const [topics, classes, assignments] = await Promise.all([
    prisma.seniorsTopic.findMany({
      where: { tenantId },
      include: {
        chapter: {
          include: {
            subject: {
              include: {
                class: { select: { id: true, name: true, section: true } },
              },
            },
          },
        },
        contents: {
          select: {
            uploadedById: true,
            uploadedByName: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
      orderBy: [{ sortOrder: "asc" }],
    }),
    prisma.seniorsClass.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, section: true },
    }),
    prisma.seniorsTeacherAssignment.findMany({
      where: { tenantId },
      select: {
        teacherId: true,
        classId: true,
        subjectId: true,
        teacher: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  const teachersById = new Map<
    string,
    { id: string; fullName: string; classIds: Set<string>; subjectIds: Set<string> }
  >();
  for (const row of assignments) {
    const existing = teachersById.get(row.teacherId) ?? {
      id: row.teacher.id,
      fullName: row.teacher.fullName,
      classIds: new Set<string>(),
      subjectIds: new Set<string>(),
    };
    existing.classIds.add(row.classId);
    existing.subjectIds.add(row.subjectId);
    teachersById.set(row.teacherId, existing);
  }

  const assignedBySubject = new Map<string, { id: string; fullName: string }[]>();
  for (const row of assignments) {
    const key = `${row.classId}:${row.subjectId}`;
    const list = assignedBySubject.get(key) ?? [];
    if (!list.some((t) => t.id === row.teacherId)) {
      list.push({ id: row.teacher.id, fullName: row.teacher.fullName });
    }
    assignedBySubject.set(key, list);
  }

  const mappedTopics = topics.map((t) => {
    const klass = t.chapter.subject.class;
    const assigned = assignedBySubject.get(`${klass.id}:${t.chapter.subject.id}`) ?? [];
    const latest = t.contents[0];
    if (latest?.uploadedById) {
      const existing = teachersById.get(latest.uploadedById);
      if (!existing) {
        teachersById.set(latest.uploadedById, {
          id: latest.uploadedById,
          fullName: latest.uploadedByName?.trim() || "Teacher",
          classIds: new Set([klass.id]),
          subjectIds: new Set([t.chapter.subject.id]),
        });
      } else {
        existing.classIds.add(klass.id);
        existing.subjectIds.add(t.chapter.subject.id);
      }
    }
    return {
      id: t.id,
      title: t.title,
      number: t.number,
      contentStatus: t.contentStatus,
      classId: klass.id,
      classLabel: `${klass.name}${klass.section ? ` ${klass.section}` : ""}`.trim(),
      subjectId: t.chapter.subject.id,
      subjectName: t.chapter.subject.name,
      chapterName: t.chapter.name,
      assignedTeacherIds: assigned.map((a) => a.id),
      assignedTeacherNames: assigned.map((a) => a.fullName),
      lastById: latest?.uploadedById ?? null,
      lastByName: latest?.uploadedByName?.trim() || "",
      pieceCount: t.contents.length,
    };
  });

  return {
    classes,
    teachers: [...teachersById.values()]
      .map((t) => ({
        id: t.id,
        fullName: t.fullName,
        classIds: [...t.classIds],
        subjectIds: [...t.subjectIds],
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    topics: mappedTopics,
  };
}

export async function loadSchoolAdminSection(
  tenant: string,
  section:
    | "teachers"
    | "students"
    | "attendance"
    | "classwork"
    | "parent-services"
    | "enquiries"
    | "parents"
    | "classes"
    | "exams"
    | "timetable"
    | "content"
    | "settings"
    | "announcements",
  options?: { classId?: string; date?: string },
) {
  const { session, tenantId } = await requireSchoolAdmin(tenant);
  const prisma = getPrismaClient();

  if (section === "teachers") {
    const [teachers, classes, subjects] = await Promise.all([
      prisma.platformUser.findMany({
        where: { tenantId, userType: "teacher" },
        orderBy: { fullName: "asc" },
        include: {
          seniorsTeacherAssignments: {
            include: {
              class: { select: { id: true, name: true, section: true } },
              subject: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      prisma.seniorsClass.findMany({
        where: { tenantId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.seniorsSubject.findMany({
        where: { tenantId },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, classId: true },
      }),
    ]);
    return {
      section,
      session,
      teachers: teachers.map((t) => ({
        id: t.id,
        fullName: t.fullName,
        email: t.email,
        phone: t.phone,
        joinedAt: t.joinedAt,
        lastLoginAt: t.lastLoginAt,
        assignments: t.seniorsTeacherAssignments.map((a) => ({
          classId: a.classId,
          className: a.class.name,
          section: a.class.section,
          subjectId: a.subjectId,
          subjectName: a.subject.name,
        })),
      })),
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        section: c.section,
      })),
      subjects,
    };
  }

  if (section === "attendance") {
    const { loadClassAttendanceForDate, loadSchoolAttendanceOverview } =
      await import("@/infrastructure/seniors/seniors-attendance");
    const month = options?.date ? new Date(options.date) : new Date();
    const overview = await loadSchoolAttendanceOverview(tenantId, month);
    const selectedClassId =
      options?.classId && overview.classes.some((c) => c.id === options.classId)
        ? options.classId
        : null;
    const detailDate = options?.date ? new Date(options.date) : new Date();
    const classDetail = selectedClassId
      ? await loadClassAttendanceForDate(tenantId, selectedClassId, detailDate)
      : null;

    return {
      section,
      session,
      month: overview.month,
      classes: overview.classes,
      selectedClassId,
      detailDate: classDetail?.date.toISOString() ?? detailDate.toISOString(),
      students: classDetail?.students ?? [],
    };
  }

  if (section === "classwork") {
    const [assignments, quizzes, studentProfiles] = await Promise.all([
      prisma.seniorsAssignment.findMany({
        where: { tenantId },
        orderBy: { dueAt: "desc" },
        take: 50,
        include: {
          submissions: { orderBy: { submittedAt: "desc" } },
          targetClass: true,
        },
      }),
      prisma.seniorsQuiz.findMany({
        where: { tenantId },
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          topic: {
            select: {
              title: true,
              chapter: {
                select: {
                  name: true,
                  subject: {
                    select: {
                      name: true,
                      class: { select: { name: true, section: true } },
                    },
                  },
                },
              },
            },
          },
          attempts: {
            orderBy: { submittedAt: "desc" },
            take: 200,
            select: {
              id: true,
              studentId: true,
              score: true,
              maxScore: true,
              submittedAt: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.seniorsStudentProfile.findMany({
        where: { tenantId },
        select: {
          studentId: true,
          student: { select: { fullName: true } },
        },
      }),
    ]);

    const studentNameById = new Map(
      studentProfiles.map((p) => [p.studentId, p.student.fullName]),
    );

    return {
      section,
      session,
      assignments: assignments.map((a) => ({
        id: a.id,
        title: a.title,
        className: a.targetClass
          ? `${a.targetClass.name} ${a.targetClass.section}`.trim()
          : "All classes",
        dueAt: a.dueAt,
        submissionCount: a.submissions.filter((s) => s.status !== "pending").length,
        submissions: a.submissions
          .filter((s) => s.status !== "pending")
          .map((s) => ({
            id: s.id,
            studentName: studentNameById.get(s.studentId) ?? "Student",
            status: s.status,
            score: s.score,
            submittedAt: s.submittedAt,
          })),
      })),
      quizzes: quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        topicTitle: q.topic.title,
        subjectName: q.topic.chapter.subject.name,
        className: `${q.topic.chapter.subject.class.name} ${q.topic.chapter.subject.class.section}`.trim(),
        attemptCount: q.attempts.length,
        attempts: q.attempts.map((attempt) => ({
          id: attempt.id,
          studentName: studentNameById.get(attempt.studentId) ?? "Student",
          score: attempt.score,
          maxScore: attempt.maxScore,
          submittedAt: attempt.submittedAt ?? attempt.createdAt,
        })),
        updatedAt: q.updatedAt,
      })),
    };
  }

  if (section === "parent-services") {
    const { loadSchoolAdminParentServices } = await import(
      "@/infrastructure/seniors/seniors-parent-services"
    );
    const services = await loadSchoolAdminParentServices(tenantId);
    return { section, session, ...services };
  }

  if (section === "students") {
    const [students, classes, profiles] = await Promise.all([
      prisma.platformUser.findMany({
        where: { tenantId, userType: "student" },
        orderBy: { joinedAt: "desc" },
      }),
      prisma.seniorsClass.findMany({
        where: { tenantId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.seniorsStudentProfile.findMany({
        where: { tenantId },
        include: { class: true },
      }),
    ]);
    const profileByStudent = new Map(profiles.map((p) => [p.studentId, p]));
    return {
      section,
      session,
      students: students.map((s) => {
        const profile = profileByStudent.get(s.id);
        return {
          id: s.id,
          fullName: s.fullName,
          email: s.email,
          phone: s.phone,
          rollNumber: profile?.rollNumber ?? "",
          classId: profile?.classId ?? "",
          className: profile?.class?.name ?? "Unassigned",
          sectionName: profile?.class?.section ?? "",
        };
      }),
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        section: c.section,
      })),
    };
  }

  if (section === "parents") {
    const [parents, students] = await Promise.all([
      prisma.platformUser.findMany({
        where: { tenantId, userType: "parent" },
        include: {
          seniorsParentLinks: {
            include: { student: { select: { id: true, fullName: true } } },
          },
        },
        orderBy: { fullName: "asc" },
      }),
      prisma.platformUser.findMany({
        where: { tenantId, userType: "student" },
        select: {
          id: true,
          fullName: true,
          email: true,
          seniorsStudentProfile: {
            select: { class: { select: { name: true, section: true } } },
          },
        },
        orderBy: { fullName: "asc" },
      }),
    ]);
    return {
      section,
      session,
      parents: parents.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        email: p.email,
        phone: p.phone,
        children: p.seniorsParentLinks.map((l) => ({
          id: l.student.id,
          name: l.student.fullName,
        })),
      })),
      students: students.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        email: s.email,
        classLabel: s.seniorsStudentProfile
          ? `${s.seniorsStudentProfile.class.name} ${s.seniorsStudentProfile.class.section}`.trim()
          : "",
      })),
    };
  }

  if (section === "classes") {
    const classes = await prisma.seniorsClass.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { students: true, subjects: true } },
        subjects: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true },
        },
      },
    });
    return {
      section,
      session,
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        section: c.section,
        board: c.board,
        sortOrder: c.sortOrder,
        studentCount: c._count.students,
        subjectCount: c._count.subjects,
        subjects: c.subjects,
      })),
    };
  }

  if (section === "content") {
    return { section, session, ...(await loadContentOversight(tenantId)) };
  }

  if (section === "exams") {
    const [exams, classes, subjects] = await Promise.all([
      prisma.seniorsExam.findMany({
        where: { tenantId },
        include: { targetClass: { select: { id: true, name: true, section: true } } },
        orderBy: { examAt: "asc" },
      }),
      prisma.seniorsClass.findMany({
        where: { tenantId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, section: true },
      }),
      prisma.seniorsSubject.findMany({
        where: { tenantId },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, classId: true },
      }),
    ]);
    return {
      section,
      session,
      exams: exams.map((exam) => ({
        id: exam.id,
        title: exam.title,
        subjectName: exam.subjectName,
        examAt: exam.examAt,
        targetClassId: exam.targetClassId,
        classLabel: exam.targetClass
          ? `${exam.targetClass.name}${exam.targetClass.section ? ` ${exam.targetClass.section}` : ""}`
          : "Whole school",
      })),
      classes,
      subjects,
    };
  }

  if (section === "timetable") {
    const classes = await prisma.seniorsClass.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { section: "asc" }],
      select: {
        id: true,
        name: true,
        section: true,
        _count: { select: { students: true } },
        timetableSlots: {
          orderBy: [{ dayOfWeek: "asc" }, { periodIndex: "asc" }],
          select: {
            id: true,
            dayOfWeek: true,
            periodIndex: true,
            startTime: true,
            endTime: true,
            subjectName: true,
            teacherName: true,
            room: true,
            isBreak: true,
          },
        },
      },
    });
    const naturalLabel = (c: { name: string; section: string }) =>
      `${c.name} ${c.section}`.replace(/(\d+)/g, (n) => n.padStart(4, "0"));
    const sorted = [...classes].sort((a, b) => {
      // Prefer demo / classes with students so admin doesn't default to empty dupes
      if ((b._count.students > 0) !== (a._count.students > 0)) {
        return b._count.students > 0 ? 1 : -1;
      }
      return naturalLabel(a).localeCompare(naturalLabel(b));
    });
    return {
      section,
      session,
      classes: sorted.map((c) => ({
        id: c.id,
        name: c.name,
        section: c.section,
        studentCount: c._count.students,
        slotCount: c.timetableSlots.length,
        periods: c.timetableSlots,
      })),
    };
  }

  if (section === "announcements") {
    const [announcements, classes, students, teachers, parents] = await Promise.all([
      prisma.seniorsAnnouncement.findMany({
        where: { tenantId, source: "school" },
        orderBy: { publishedAt: "desc" },
      }),
      prisma.seniorsClass.findMany({
        where: { tenantId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, section: true },
      }),
      prisma.platformUser.findMany({
        where: { tenantId, userType: "student" },
        select: {
          id: true,
          fullName: true,
          seniorsStudentProfile: {
            select: { class: { select: { name: true, section: true } } },
          },
        },
        orderBy: { fullName: "asc" },
      }),
      prisma.platformUser.findMany({
        where: { tenantId, userType: "teacher" },
        select: { id: true, fullName: true },
        orderBy: { fullName: "asc" },
      }),
      prisma.platformUser.findMany({
        where: { tenantId, userType: "parent" },
        select: { id: true, fullName: true },
        orderBy: { fullName: "asc" },
      }),
    ]);
    return {
      section,
      session,
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        publishedAt: a.publishedAt,
        createdByName: a.createdByName,
        audienceType: a.audienceType,
        audienceRoles: a.audienceRoles,
        targetClassIds: a.targetClassIds,
        targetUserIds: a.targetUserIds,
      })),
      classes,
      students: students.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        classLabel: s.seniorsStudentProfile
          ? `${s.seniorsStudentProfile.class.name} ${s.seniorsStudentProfile.class.section}`.trim()
          : "",
      })),
      teachers,
      parents,
    };
  }

  if (section === "enquiries") {
    const [enquiries, classes, subjects] = await Promise.all([
      prisma.seniorsJoinRequest.findMany({
        where: { tenantId },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      }),
      prisma.seniorsClass.findMany({
        where: { tenantId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.seniorsSubject.findMany({
        where: { tenantId },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, classId: true },
      }),
    ]);

    return {
      section,
      session,
      enquiries: enquiries.map((e) => ({
        id: e.id,
        role: e.role,
        fullName: e.fullName,
        email: e.email,
        phone: e.phone,
        requestedClassLabel: e.requestedClassLabel,
        rollNumber: e.rollNumber,
        requestedSubject: e.requestedSubject,
        status: e.status,
        rejectionReason: e.rejectionReason,
        reviewedAt: e.reviewedAt,
        createdAt: e.createdAt,
      })),
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        section: c.section,
      })),
      subjects,
    };
  }

  const settings = await prisma.seniorsSchoolSettings.findUnique({ where: { tenantId } });
  return {
    section,
    session,
    settings: settings ?? {
      schoolName: "",
      logoUrl: "",
      primaryColor: "#2563EB",
      markingScheme: "",
      answerFormat: "",
    },
  };
}
