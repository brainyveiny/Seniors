import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isApiError,
  requireSchoolAdminApi,
  requireStudentApi,
  requireTeacherApi,
} from "@/infrastructure/seniors/seniors-api-auth";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import {
  getTeacherScope,
  loadStudentHomework,
} from "@/infrastructure/seniors/seniors-repository";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const requestedRole = request.nextUrl.searchParams.get("role");

  if (requestedRole === "school-admin") {
    const auth = await requireSchoolAdminApi(request, slug);
    if (isApiError(auth)) return auth;

    try {
      const prisma = getPrismaClient();
      const { countPendingParentServiceRequests } = await import(
        "@/infrastructure/seniors/seniors-parent-services"
      );
      const [pending, pendingCount, leavePending, transportPending, orderPending] =
        await Promise.all([
        prisma.seniorsJoinRequest.findMany({
          where: { tenantId: auth.tenantId, status: "pending" },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            role: true,
            fullName: true,
            email: true,
            requestedClassLabel: true,
            requestedSubject: true,
            createdAt: true,
          },
        }),
        prisma.seniorsJoinRequest.count({
          where: { tenantId: auth.tenantId, status: "pending" },
        }),
        prisma.seniorsLeaveRequest.count({ where: { tenantId: auth.tenantId, status: "pending" } }),
        prisma.seniorsTransportUpdateRequest.count({
          where: { tenantId: auth.tenantId, status: "pending" },
        }),
        prisma.seniorsServiceSelection.count({
          where: { tenantId: auth.tenantId, status: "submitted" },
        }),
      ]);

      const servicePending = await countPendingParentServiceRequests(auth.tenantId);

      const items: {
        id: string;
        type: string;
        title: string;
        body: string;
        href: string;
        urgency: string;
      }[] = pending.map((row) => {
        const roleLabel = row.role === "teacher" ? "Teacher" : "Student";
        const detail =
          row.role === "teacher"
            ? row.requestedSubject
              ? `Subject: ${row.requestedSubject}`
              : "Subject not specified"
            : row.requestedClassLabel
              ? `Class: ${row.requestedClassLabel}`
              : "Class not specified";
        return {
          id: `enquiry-${row.id}`,
          type: "join_enquiry",
          title: `${roleLabel} enquiry: ${row.fullName}`,
          body: `${row.email} · ${detail}`,
          href: "school-admin/enquiries",
          urgency: "attention",
        };
      });

      if (leavePending > 0) {
        items.unshift({
          id: "parent-leave-pending",
          type: "parent_service",
          title: `${leavePending} leave request${leavePending > 1 ? "s" : ""} pending`,
          body: "Review parent leave applications",
          href: "school-admin/parent-services",
          urgency: "attention" as const,
        });
      }
      if (transportPending > 0) {
        items.unshift({
          id: "parent-transport-pending",
          type: "parent_service",
          title: `${transportPending} transport update${transportPending > 1 ? "s" : ""} pending`,
          body: "Review route and stop change requests",
          href: "school-admin/parent-services",
          urgency: "attention" as const,
        });
      }
      if (orderPending > 0) {
        items.unshift({
          id: "parent-orders-pending",
          type: "parent_service",
          title: `${orderPending} parent order${orderPending > 1 ? "s" : ""} pending`,
          body: "Uniform, books, hobby club and elective orders",
          href: "school-admin/parent-services",
          urgency: "attention",
        });
      }

      return NextResponse.json({
        items,
        unreadCount: pendingCount + servicePending,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load notifications";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (requestedRole === "teacher") {
    const auth = await requireTeacherApi(request, slug);
    if (isApiError(auth)) return auth;

    try {
      const prisma = getPrismaClient();
      const scope = await getTeacherScope(
        auth.tenantId,
        auth.session.userId,
      );
      const profiles = await prisma.seniorsStudentProfile.findMany({
        where: {
          tenantId: auth.tenantId,
          ...(scope.hasAssignments
            ? { classId: { in: scope.classIds } }
            : {}),
        },
        select: {
          studentId: true,
          class: { select: { name: true, section: true } },
          student: { select: { fullName: true } },
        },
      });
      const averages = await prisma.seniorsQuizAttempt.groupBy({
        by: ["studentId"],
        where: {
          tenantId: auth.tenantId,
          studentId: { in: profiles.map((profile) => profile.studentId) },
          score: { not: null },
        },
        _avg: { score: true, maxScore: true },
      });
      const attentionItems = profiles.flatMap((profile) => {
        const average = averages.find(
          (row) => row.studentId === profile.studentId,
        );
        const percent =
          average?._avg.score != null && average._avg.maxScore
            ? Math.round(
                (average._avg.score / average._avg.maxScore) * 100,
              )
            : null;
        if (percent == null || percent >= 60) return [];
        const className =
          `${profile.class.name} ${profile.class.section}`.trim();
        return [
          {
            id: `attention-${profile.studentId}`,
            type: "student_attention" as const,
            title: `${profile.student.fullName} needs attention`,
            body: `${className} · Quiz average ${percent}%`,
            href: `teacher/students?student=${profile.studentId}`,
            urgency: "attention" as const,
          },
        ];
      });

      const schoolPosts = await prisma.seniorsAnnouncement.findMany({
        where: { tenantId: auth.tenantId, source: "school" },
        orderBy: { publishedAt: "desc" },
        take: 20,
      });
      const { isAnnouncementVisibleTo } = await import(
        "@/infrastructure/seniors/seniors-announcement-audience"
      );
      const schoolItems = schoolPosts
        .filter((item) =>
          isAnnouncementVisibleTo(item, {
            role: "teacher",
            userId: auth.session.userId,
          }),
        )
        .slice(0, 5)
        .map((item) => ({
          id: `ann-${item.id}`,
          type: "announcement" as const,
          title: item.title,
          body: item.body.slice(0, 120),
          href: "teacher/announcements",
          urgency: "info" as const,
        }));

      const items = [...schoolItems, ...attentionItems];
      return NextResponse.json({
        items,
        unreadCount: items.length,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load notifications";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const auth = await requireStudentApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const prisma = getPrismaClient();
    const [homework, announcements, profile] = await Promise.all([
      loadStudentHomework(auth.tenantId, auth.session.userId, { includeSubmitted: true }),
      prisma.seniorsAnnouncement.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { publishedAt: "desc" },
        take: 20,
      }),
      prisma.seniorsStudentProfile.findFirst({
        where: { tenantId: auth.tenantId, studentId: auth.session.userId },
        select: { classId: true },
      }),
    ]);
    const { isAnnouncementVisibleTo } = await import(
      "@/infrastructure/seniors/seniors-announcement-audience"
    );
    const visibleAnnouncements = announcements.filter((item) =>
      isAnnouncementVisibleTo(item, {
        role: "student",
        userId: auth.session.userId,
        classIds: profile?.classId ? [profile.classId] : [],
      }),
    );

    const pendingHomework = homework.filter(
      (h) => !h.submissionStatus || h.submissionStatus === "pending",
    );
    const returnedHomework = homework
      .filter((h) => h.submissionStatus === "graded")
      .sort((a, b) => {
        const aTime = a.gradedAt ? new Date(a.gradedAt).getTime() : 0;
        const bTime = b.gradedAt ? new Date(b.gradedAt).getTime() : 0;
        return bTime - aTime;
      });

    const items = [
      ...returnedHomework.slice(0, 5).map((h) => ({
        id: `hw-returned-${h.id}`,
        type: "homework_returned" as const,
        title: `Homework returned: ${h.title}`,
        body:
          h.score != null
            ? `${h.subjectName} · Score ${h.score}${h.feedback ? ` · ${h.feedback.slice(0, 80)}` : ""}`
            : `${h.subjectName} · Teacher returned your work`,
        href: `student/homework/${h.id}`,
        urgency: "returned" as const,
      })),
      ...pendingHomework.slice(0, 5).map((h) => ({
        id: `hw-${h.id}`,
        type: "homework" as const,
        title: h.title,
        body: `${h.subjectName} · Due ${new Date(h.dueAt).toLocaleDateString()}`,
        href: `student/homework/${h.id}`,
        urgency: h.status,
      })),
      ...visibleAnnouncements.slice(0, 5).map((a) => ({
        id: `ann-${a.id}`,
        type: "announcement" as const,
        title: a.title,
        body: a.body.slice(0, 120),
        href: "student/school",
        urgency: "info" as const,
      })),
    ];

    return NextResponse.json({
      items,
      unreadCount: returnedHomework.length + pendingHomework.length,
      returnedCount: returnedHomework.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
