import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireSchoolAdminApi } from "@/infrastructure/seniors/seniors-api-auth";
import {
  approveSeniorsJoinRequest,
  rejectSeniorsJoinRequest,
} from "@/infrastructure/seniors/seniors-join-requests";
import {
  bulkCreateParents,
  bulkCreateStudents,
  bulkCreateTeachers,
  createAnnouncement,
  createSchoolExam,
  createSchoolClass,
  createSchoolSubject,
  createSchoolUser,
  deleteAnnouncement,
  deleteAnnouncements,
  deleteSchoolClass,
  deleteSchoolClasses,
  deleteSchoolExam,
  deleteSchoolExams,
  deleteSchoolSubject,
  addAssignmentToTeachers,
  deleteSchoolUser,
  deleteSchoolUsers,
  moveStudentsToClass,
  promoteClassStudents,
  setTeacherAssignments,
  setParentChildren,
  unlinkParentChild,
  updateAnnouncement,
  updateAnnouncementsAudience,
  updateSchoolClass,
  updateSchoolClassesBoard,
  updateSchoolExam,
  updateSchoolExamsClass,
  updateSchoolSubject,
  updateSchoolUser,
  upsertSchoolSettings,
} from "@/infrastructure/seniors/seniors-mutations";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { loadContentOversight } from "@/application/seniors/role-server";
import { revalidateTag } from "next/cache";
import { seniorsTenantShellCacheTag } from "@/application/tenant/tenant-server";
import { revalidateSeniorsDashboards } from "@/infrastructure/seniors/seniors-dashboard-cache";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireSchoolAdminApi(request, slug);
  if (isApiError(auth)) return auth;

  const section = request.nextUrl.searchParams.get("section") || "teachers";
  const prisma = getPrismaClient();

  if (section === "teachers") {
    const [teachers, classes, subjects] = await Promise.all([
      prisma.platformUser.findMany({
        where: { tenantId: auth.tenantId, userType: "teacher" },
        orderBy: { fullName: "asc" },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          joinedAt: true,
          lastLoginAt: true,
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
        where: { tenantId: auth.tenantId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.seniorsSubject.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, classId: true },
      }),
    ]);
    return NextResponse.json({
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
    });
  }

  if (section === "students") {
    const students = await prisma.seniorsStudentProfile.findMany({
      where: { tenantId: auth.tenantId },
      include: {
        student: { select: { id: true, fullName: true, email: true, phone: true, joinedAt: true } },
        class: true,
      },
      orderBy: { createdAt: "desc" },
    });
    const classes = await prisma.seniorsClass.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({
      students: students.map((s) => ({
        id: s.student.id,
        fullName: s.student.fullName,
        email: s.student.email,
        phone: s.student.phone,
        rollNumber: s.rollNumber,
        classId: s.classId,
        className: s.class.name,
        section: s.class.section,
        joinedAt: s.student.joinedAt,
      })),
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        section: c.section,
        board: c.board,
      })),
    });
  }

  if (section === "parents") {
    const parents = await prisma.platformUser.findMany({
      where: { tenantId: auth.tenantId, userType: "parent" },
      include: {
        seniorsParentLinks: {
          include: { student: { select: { id: true, fullName: true } } },
        },
      },
      orderBy: { fullName: "asc" },
    });
    const students = await prisma.platformUser.findMany({
      where: { tenantId: auth.tenantId, userType: "student" },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: "asc" },
    });
    return NextResponse.json({
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
      students,
    });
  }

  if (section === "classes") {
    const classes = await prisma.seniorsClass.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { students: true, subjects: true } },
        subjects: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true },
        },
      },
    });
    return NextResponse.json({
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
    });
  }

  if (section === "content") {
    return NextResponse.json(await loadContentOversight(auth.tenantId));
  }

  if (section === "settings") {
    const settings = await prisma.seniorsSchoolSettings.findUnique({
      where: { tenantId: auth.tenantId },
    });
    return NextResponse.json({
      settings: settings ?? {
        schoolName: "",
        logoUrl: "",
        primaryColor: "#2563EB",
        markingScheme: "",
        answerFormat: "",
      },
    });
  }

  if (section === "enquiries") {
    const [enquiries, classes, subjects] = await Promise.all([
      prisma.seniorsJoinRequest.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      }),
      prisma.seniorsClass.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.seniorsSubject.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, classId: true },
      }),
    ]);
    return NextResponse.json({
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
    });
  }

  return NextResponse.json({ error: "Unknown section" }, { status: 400 });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireSchoolAdminApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const body = (await request.json()) as {
      action?:
        | "create-user"
        | "update-user"
        | "delete-user"
        | "bulk-delete-users"
        | "bulk-add-teacher-assignment"
        | "bulk-move-students"
        | "save-settings"
        | "link-parent"
        | "unlink-parent"
        | "create-class"
        | "update-class"
        | "delete-class"
        | "bulk-delete-classes"
        | "bulk-update-classes-board"
        | "bulk-add-subject"
        | "create-subject"
        | "update-subject"
        | "delete-subject"
        | "set-teacher-assignments"
        | "promote-class"
        | "bulk-create-students"
        | "bulk-create-teachers"
        | "bulk-create-parents"
        | "approve-join-request"
        | "reject-join-request"
        | "create-exam"
        | "update-exam"
        | "delete-exam"
        | "bulk-delete-exams"
        | "bulk-update-exams-class"
        | "create-announcement"
        | "update-announcement"
        | "delete-announcement"
        | "bulk-delete-announcements"
        | "bulk-update-announcements-audience";
      requestId?: string;
      rejectionReason?: string;
      userId?: string;
      userIds?: string[];
      classId?: string;
      classIds?: string[];
      subjectId?: string;
      examId?: string;
      examIds?: string[];
      announcementId?: string;
      announcementIds?: string[];
      audienceType?: "all" | "roles" | "people";
      audienceRoles?: string[];
      targetClassIds?: string[];
      targetUserIds?: string[];
      fromClassId?: string;
      toClassId?: string;
      fullName?: string;
      email?: string;
      password?: string;
      userType?: "student" | "parent" | "teacher";
      phone?: string;
      rollNumber?: string;
      childStudentId?: string;
      childStudentIds?: string[];
      parentId?: string;
      name?: string;
      names?: string[];
      section?: string;
      board?: string;
      sortOrder?: number;
      schoolName?: string;
      logoUrl?: string;
      primaryColor?: string;
      markingScheme?: string;
      answerFormat?: string;
      title?: string;
      body?: string;
      subjectName?: string;
      examAt?: string;
      targetClassId?: string | null;
      assignments?: { classId: string; subjectId: string }[];
      students?: {
        fullName: string;
        email: string;
        password?: string;
        phone?: string;
        classId: string;
        rollNumber?: string;
      }[];
      teachers?: {
        fullName: string;
        email: string;
        password?: string;
        phone?: string;
      }[];
      parents?: {
        fullName: string;
        email: string;
        password?: string;
        phone?: string;
        children?: string[];
      }[];
    };

    if (body.action === "create-announcement" || body.action === "update-announcement") {
      if (!body.title?.trim() || !body.body?.trim()) {
        return NextResponse.json(
          { error: "Title and message are required" },
          { status: 400 },
        );
      }
      if (body.action === "update-announcement" && !body.announcementId) {
        return NextResponse.json({ error: "announcementId is required" }, { status: 400 });
      }
      const input = {
        title: body.title,
        body: body.body,
        audienceType: body.audienceType,
        audienceRoles: body.audienceRoles,
        targetClassIds: body.targetClassIds,
        targetUserIds: body.targetUserIds,
      };
      const announcement =
        body.action === "create-announcement"
          ? await createAnnouncement(auth.tenantId, {
              ...input,
              createdByName: auth.session.fullName,
              source: "school" as const,
            })
          : await updateAnnouncement(auth.tenantId, body.announcementId!, input);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json(
        { ok: true, announcement },
        { status: body.action === "create-announcement" ? 201 : 200 },
      );
    }

    if (body.action === "delete-announcement") {
      if (!body.announcementId) {
        return NextResponse.json({ error: "announcementId is required" }, { status: 400 });
      }
      await deleteAnnouncement(auth.tenantId, body.announcementId);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "bulk-delete-announcements") {
      if (!Array.isArray(body.announcementIds) || body.announcementIds.length === 0) {
        return NextResponse.json({ error: "announcementIds are required" }, { status: 400 });
      }
      const result = await deleteAnnouncements(auth.tenantId, body.announcementIds);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "bulk-update-announcements-audience") {
      if (!Array.isArray(body.announcementIds) || body.announcementIds.length === 0) {
        return NextResponse.json({ error: "announcementIds are required" }, { status: 400 });
      }
      const result = await updateAnnouncementsAudience(auth.tenantId, body.announcementIds, {
        source: "school",
        audienceType: body.audienceType,
        audienceRoles: body.audienceRoles,
        targetClassIds: body.targetClassIds,
        targetUserIds: body.targetUserIds,
      });
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "create-exam" || body.action === "update-exam") {
      if (!body.title?.trim() || !body.examAt) {
        return NextResponse.json(
          { error: "Exam title and date are required" },
          { status: 400 },
        );
      }
      if (body.action === "update-exam" && !body.examId) {
        return NextResponse.json({ error: "examId is required" }, { status: 400 });
      }
      const input = {
        title: body.title,
        subjectName: body.subjectName,
        examAt: body.examAt,
        targetClassId: body.targetClassId,
      };
      const exam =
        body.action === "create-exam"
          ? await createSchoolExam(auth.tenantId, input)
          : await updateSchoolExam(auth.tenantId, body.examId!, input);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json(
        { ok: true, exam },
        { status: body.action === "create-exam" ? 201 : 200 },
      );
    }

    if (body.action === "delete-exam") {
      if (!body.examId) {
        return NextResponse.json({ error: "examId is required" }, { status: 400 });
      }
      await deleteSchoolExam(auth.tenantId, body.examId);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "bulk-delete-exams") {
      if (!Array.isArray(body.examIds) || body.examIds.length === 0) {
        return NextResponse.json({ error: "examIds are required" }, { status: 400 });
      }
      const result = await deleteSchoolExams(auth.tenantId, body.examIds);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "bulk-update-exams-class") {
      if (!Array.isArray(body.examIds) || body.examIds.length === 0) {
        return NextResponse.json({ error: "examIds are required" }, { status: 400 });
      }
      const result = await updateSchoolExamsClass(
        auth.tenantId,
        body.examIds,
        body.targetClassId ?? null,
      );
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "approve-join-request") {
      if (!body.requestId) {
        return NextResponse.json({ error: "requestId is required" }, { status: 400 });
      }
      const result = await approveSeniorsJoinRequest(
        auth.tenantId,
        body.requestId,
        auth.session.userId,
        {
          classId: body.classId,
          rollNumber: body.rollNumber,
          teacherAssignments: body.assignments,
        },
      );
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({
        ok: true,
        user: {
          id: result.user.id,
          fullName: result.user.fullName,
          email: result.user.email,
          role: result.user.userType,
        },
        request: {
          id: result.request.id,
          status: result.request.status,
        },
      });
    }

    if (body.action === "reject-join-request") {
      if (!body.requestId) {
        return NextResponse.json({ error: "requestId is required" }, { status: 400 });
      }
      const request = await rejectSeniorsJoinRequest(
        auth.tenantId,
        body.requestId,
        auth.session.userId,
        body.rejectionReason ?? "",
      );
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({
        ok: true,
        request: {
          id: request.id,
          status: request.status,
          rejectionReason: request.rejectionReason,
        },
      });
    }

    if (body.action === "save-settings") {
      // School name, logo and colours are managed by the Seniors super admin.
      const settings = await upsertSchoolSettings(auth.tenantId, {
        markingScheme: body.markingScheme,
        answerFormat: body.answerFormat,
      });
      revalidateTag(seniorsTenantShellCacheTag(slug), { expire: 0 });
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, settings });
    }

    if (body.action === "create-class") {
      if (!body.name?.trim()) {
        return NextResponse.json({ error: "Class name is required" }, { status: 400 });
      }
      const klass = await createSchoolClass(auth.tenantId, {
        name: body.name,
        section: body.section,
        board: body.board,
        sortOrder: body.sortOrder,
      });
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, class: klass }, { status: 201 });
    }

    if (body.action === "update-class") {
      if (!body.classId) {
        return NextResponse.json({ error: "classId is required" }, { status: 400 });
      }
      const klass = await updateSchoolClass(auth.tenantId, body.classId, {
        name: body.name,
        section: body.section,
        board: body.board,
        sortOrder: body.sortOrder,
      });
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, class: klass });
    }

    if (body.action === "delete-class") {
      if (!body.classId) {
        return NextResponse.json({ error: "classId is required" }, { status: 400 });
      }
      await deleteSchoolClass(auth.tenantId, body.classId);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "bulk-delete-classes") {
      if (!Array.isArray(body.classIds) || body.classIds.length === 0) {
        return NextResponse.json({ error: "classIds are required" }, { status: 400 });
      }
      const result = await deleteSchoolClasses(auth.tenantId, body.classIds);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "bulk-update-classes-board") {
      if (!Array.isArray(body.classIds) || body.classIds.length === 0) {
        return NextResponse.json({ error: "classIds are required" }, { status: 400 });
      }
      const result = await updateSchoolClassesBoard(
        auth.tenantId,
        body.classIds,
        body.board ?? "CBSE",
      );
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "bulk-add-subject") {
      const names = (
        Array.isArray(body.names) && body.names.length > 0
          ? body.names
          : body.name?.trim()
            ? [body.name]
            : []
      )
        .map((n) => n.trim())
        .filter(Boolean);
      if (!Array.isArray(body.classIds) || body.classIds.length === 0 || names.length === 0) {
        return NextResponse.json(
          { error: "classIds and at least one subject name are required" },
          { status: 400 },
        );
      }
      const created: { classId: string; id: string; name: string }[] = [];
      const skipped: { classId: string; reason: string }[] = [];
      for (const classId of body.classIds) {
        for (const name of names) {
          try {
            const subject = await createSchoolSubject(auth.tenantId, {
              classId,
              name,
              sortOrder: body.sortOrder,
            });
            created.push({ classId, id: subject.id, name: subject.name });
          } catch (error) {
            skipped.push({
              classId,
              reason: error instanceof Error ? error.message : "Failed",
            });
          }
        }
      }
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, created, skipped });
    }

    if (body.action === "create-subject") {
      if (!body.classId || !body.name?.trim()) {
        return NextResponse.json(
          { error: "classId and subject name are required" },
          { status: 400 },
        );
      }
      const subject = await createSchoolSubject(auth.tenantId, {
        classId: body.classId,
        name: body.name,
        sortOrder: body.sortOrder,
      });
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, subject }, { status: 201 });
    }

    if (body.action === "update-subject") {
      if (!body.subjectId) {
        return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
      }
      const subject = await updateSchoolSubject(auth.tenantId, body.subjectId, {
        name: body.name,
        sortOrder: body.sortOrder,
      });
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, subject });
    }

    if (body.action === "delete-subject") {
      if (!body.subjectId) {
        return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
      }
      await deleteSchoolSubject(auth.tenantId, body.subjectId);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "set-teacher-assignments") {
      if (!body.userId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 });
      }
      const assignments = await setTeacherAssignments(
        auth.tenantId,
        body.userId,
        body.assignments ?? [],
      );
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({
        ok: true,
        assignments: assignments.map((a) => ({
          classId: a.classId,
          className: a.class.name,
          section: a.class.section,
          subjectId: a.subjectId,
          subjectName: a.subject.name,
        })),
      });
    }

    if (body.action === "promote-class") {
      if (!body.fromClassId || !body.toClassId) {
        return NextResponse.json(
          { error: "fromClassId and toClassId are required" },
          { status: 400 },
        );
      }
      const result = await promoteClassStudents(
        auth.tenantId,
        body.fromClassId,
        body.toClassId,
      );
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "bulk-create-students") {
      if (!Array.isArray(body.students) || body.students.length === 0) {
        return NextResponse.json({ error: "students array is required" }, { status: 400 });
      }
      const results = await bulkCreateStudents(auth.tenantId, body.students);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({
        ok: true,
        results,
        created: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
      });
    }

    if (body.action === "bulk-create-teachers") {
      if (!Array.isArray(body.teachers) || body.teachers.length === 0) {
        return NextResponse.json({ error: "teachers array is required" }, { status: 400 });
      }
      const assignment =
        body.classId && body.subjectId
          ? { classId: body.classId, subjectId: body.subjectId }
          : undefined;
      const results = await bulkCreateTeachers(auth.tenantId, body.teachers, assignment);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({
        ok: true,
        results,
        created: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
      });
    }

    if (body.action === "bulk-create-parents") {
      if (!Array.isArray(body.parents) || body.parents.length === 0) {
        return NextResponse.json({ error: "parents array is required" }, { status: 400 });
      }
      const results = await bulkCreateParents(auth.tenantId, body.parents);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({
        ok: true,
        results,
        created: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
      });
    }

    if (body.action === "link-parent") {
      if (!body.parentId || !body.childStudentId) {
        return NextResponse.json(
          { error: "parentId and childStudentId are required" },
          { status: 400 },
        );
      }
      const prisma = getPrismaClient();
      const link = await prisma.seniorsParentChild.upsert({
        where: {
          parentId_studentId: {
            parentId: body.parentId,
            studentId: body.childStudentId,
          },
        },
        create: {
          tenantId: auth.tenantId,
          parentId: body.parentId,
          studentId: body.childStudentId,
        },
        update: {},
      });
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, link });
    }

    if (body.action === "unlink-parent") {
      if (!body.parentId || !body.childStudentId) {
        return NextResponse.json(
          { error: "parentId and childStudentId are required" },
          { status: 400 },
        );
      }
      await unlinkParentChild(auth.tenantId, body.parentId, body.childStudentId);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "update-user") {
      if (!body.userId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 });
      }
      const user = await updateSchoolUser(auth.tenantId, body.userId, {
        fullName: body.fullName,
        email: body.email,
        password: body.password,
        phone: body.phone,
        classId: body.classId,
        rollNumber: body.rollNumber,
      });

      if (body.assignments && user.userType === "teacher") {
        await setTeacherAssignments(auth.tenantId, body.userId, body.assignments);
      }

      if (Array.isArray(body.childStudentIds) && user.userType === "parent") {
        await setParentChildren(auth.tenantId, body.userId, body.childStudentIds);
      }

      const prisma = getPrismaClient();
      if (user.userType === "student") {
        const profile = await prisma.seniorsStudentProfile.findUnique({
          where: { studentId: user.id },
          include: { class: true },
        });
        revalidateSeniorsDashboards(auth.tenantId);
        return NextResponse.json({
          ok: true,
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            rollNumber: profile?.rollNumber ?? "",
            classId: profile?.classId ?? "",
            className: profile?.class.name ?? "",
            sectionName: profile?.class.section ?? "",
          },
        });
      }

      if (user.userType === "teacher") {
        const assignments = await prisma.seniorsTeacherAssignment.findMany({
          where: { tenantId: auth.tenantId, teacherId: user.id },
          include: {
            class: { select: { name: true, section: true } },
            subject: { select: { name: true } },
          },
        });
        revalidateSeniorsDashboards(auth.tenantId);
        return NextResponse.json({
          ok: true,
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            assignments: assignments.map((a) => ({
              classId: a.classId,
              className: a.class.name,
              section: a.class.section,
              subjectId: a.subjectId,
              subjectName: a.subject.name,
            })),
          },
        });
      }

      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({
        ok: true,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
        },
      });
    }

    if (body.action === "delete-user") {
      if (!body.userId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 });
      }
      await deleteSchoolUser(auth.tenantId, body.userId);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "bulk-delete-users") {
      if (!Array.isArray(body.userIds) || body.userIds.length === 0) {
        return NextResponse.json({ error: "userIds are required" }, { status: 400 });
      }
      const result = await deleteSchoolUsers(
        auth.tenantId,
        body.userIds,
        body.userType === "teacher" || body.userType === "student" || body.userType === "parent"
          ? body.userType
          : undefined,
      );
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "bulk-move-students") {
      if (!Array.isArray(body.userIds) || body.userIds.length === 0 || !body.classId) {
        return NextResponse.json(
          { error: "userIds and classId are required" },
          { status: 400 },
        );
      }
      const result = await moveStudentsToClass(auth.tenantId, body.userIds, body.classId);
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "bulk-add-teacher-assignment") {
      if (
        !Array.isArray(body.userIds) ||
        body.userIds.length === 0 ||
        !body.classId ||
        !body.subjectId
      ) {
        return NextResponse.json(
          { error: "userIds, classId and subjectId are required" },
          { status: 400 },
        );
      }
      const result = await addAssignmentToTeachers(auth.tenantId, body.userIds, {
        classId: body.classId,
        subjectId: body.subjectId,
      });
      revalidateSeniorsDashboards(auth.tenantId);
      return NextResponse.json({ ok: true, ...result });
    }

    if (
      !body.fullName?.trim() ||
      !body.email?.trim() ||
      !body.password?.trim() ||
      !body.userType
    ) {
      return NextResponse.json(
        { error: "fullName, email, password and userType are required" },
        { status: 400 },
      );
    }

    const user = await createSchoolUser(auth.tenantId, {
      fullName: body.fullName,
      email: body.email,
      password: body.password,
      userType: body.userType,
      phone: body.phone,
      classId: body.classId,
      rollNumber: body.rollNumber,
      childStudentId: body.childStudentId,
      childStudentIds: body.childStudentIds,
    });

    let assignments: {
      classId: string;
      className: string;
      section: string;
      subjectId: string;
      subjectName: string;
    }[] = [];
    if (body.userType === "teacher" && body.assignments?.length) {
      const saved = await setTeacherAssignments(
        auth.tenantId,
        user.id,
        body.assignments,
      );
      assignments = saved.map((a) => ({
        classId: a.classId,
        className: a.class.name,
        section: a.class.section,
        subjectId: a.subjectId,
        subjectName: a.subject.name,
      }));
    }

    revalidateSeniorsDashboards(auth.tenantId);
    return NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          userType: user.userType,
          assignments,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
