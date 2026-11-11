import { unstable_cache } from "next/cache";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { seniorsDashboardsTag } from "@/infrastructure/seniors/seniors-dashboard-cache";

export type AttendanceStatus = "present" | "absent" | "late" | "holiday";

const ATTENDANCE_REVALIDATE_SECONDS = 60;

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function loadStudentAttendanceSummary(
  tenantId: string,
  studentId: string,
  month = new Date(),
) {
  return unstable_cache(
    async () => {
      const prisma = getPrismaClient();
      const from = startOfMonth(month);
      const to = endOfMonth(month);

      const records = await prisma.seniorsAttendance.findMany({
        where: {
          tenantId,
          studentId,
          date: { gte: from, lte: to },
        },
        orderBy: { date: "desc" },
      });

      const present = records.filter((r) => r.status === "present" || r.status === "late").length;
      const absent = records.filter((r) => r.status === "absent").length;
      const late = records.filter((r) => r.status === "late").length;
      const total = records.length;
      const percent = total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        month: month.toISOString(),
        percent,
        daysPresent: present,
        daysAbsent: absent,
        daysLate: late,
        daysRecorded: total,
        records: records.map((r) => ({
          id: r.id,
          date: r.date,
          status: r.status as AttendanceStatus,
          note: r.note,
        })),
      };
    },
    [
      "student-attendance",
      tenantId,
      studentId,
      String(month.getFullYear()),
      String(month.getMonth()),
    ],
    {
      revalidate: ATTENDANCE_REVALIDATE_SECONDS,
      tags: [seniorsDashboardsTag(tenantId)],
    },
  )();
}

export async function loadClassAttendanceForDate(
  tenantId: string,
  classId: string,
  date: Date,
) {
  const prisma = getPrismaClient();
  const dateOnly = new Date(toDateKey(date));

  const [students, records] = await Promise.all([
    prisma.seniorsStudentProfile.findMany({
      where: { tenantId, classId },
      include: {
        student: { select: { id: true, fullName: true } },
      },
      orderBy: { rollNumber: "asc" },
    }),
    prisma.seniorsAttendance.findMany({
      where: {
        tenantId,
        date: dateOnly,
        studentId: {
          in: (
            await prisma.seniorsStudentProfile.findMany({
              where: { tenantId, classId },
              select: { studentId: true },
            })
          ).map((s) => s.studentId),
        },
      },
    }),
  ]);

  const byStudent = new Map(records.map((r) => [r.studentId, r]));

  return {
    date: dateOnly,
    students: students.map((s) => {
      const record = byStudent.get(s.studentId);
      return {
        studentId: s.studentId,
        fullName: s.student.fullName,
        rollNumber: s.rollNumber,
        status: (record?.status as AttendanceStatus | undefined) ?? null,
        note: record?.note ?? "",
      };
    }),
  };
}

export async function loadSchoolAttendanceOverview(
  tenantId: string,
  month = new Date(),
) {
  const prisma = getPrismaClient();
  const from = startOfMonth(month);
  const to = endOfMonth(month);

  const [classes, profiles, records] = await Promise.all([
    prisma.seniorsClass.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        section: true,
        _count: { select: { students: true } },
      },
    }),
    prisma.seniorsStudentProfile.findMany({
      where: { tenantId },
      select: { studentId: true, classId: true },
    }),
    prisma.seniorsAttendance.findMany({
      where: { tenantId, date: { gte: from, lte: to } },
      select: { studentId: true, date: true, status: true },
      orderBy: { date: "desc" },
    }),
  ]);

  const classByStudent = new Map(profiles.map((p) => [p.studentId, p.classId]));
  const statsByClass = new Map<
    string,
    { days: Set<string>; present: number; total: number; lastDate: Date | null }
  >();

  for (const record of records) {
    const classId = classByStudent.get(record.studentId);
    if (!classId) continue;
    const bucket =
      statsByClass.get(classId) ?? {
        days: new Set<string>(),
        present: 0,
        total: 0,
        lastDate: null,
      };
    const dateKey = toDateKey(record.date);
    bucket.days.add(dateKey);
    bucket.total += 1;
    if (record.status === "present" || record.status === "late") {
      bucket.present += 1;
    }
    if (!bucket.lastDate || record.date > bucket.lastDate) {
      bucket.lastDate = record.date;
    }
    statsByClass.set(classId, bucket);
  }

  return {
    month: from.toISOString(),
    classes: classes.map((c) => {
      const stats = statsByClass.get(c.id);
      const daysRecorded = stats?.days.size ?? 0;
      const presentPercent =
        stats && stats.total > 0
          ? Math.round((stats.present / stats.total) * 100)
          : 0;
      return {
        id: c.id,
        name: c.name,
        section: c.section,
        studentCount: c._count.students,
        daysRecorded,
        presentPercent,
        lastRecordedDate: stats?.lastDate?.toISOString() ?? null,
      };
    }),
  };
}

export async function saveClassAttendance(
  tenantId: string,
  classId: string,
  date: Date,
  entries: { studentId: string; status: AttendanceStatus; note?: string }[],
  markedById?: string,
) {
  const prisma = getPrismaClient();
  const dateOnly = new Date(toDateKey(date));

  const classStudentIds = (
    await prisma.seniorsStudentProfile.findMany({
      where: { tenantId, classId },
      select: { studentId: true },
    })
  ).map((s) => s.studentId);

  const validIds = new Set(classStudentIds);
  const filtered = entries.filter((e) => validIds.has(e.studentId));

  await prisma.$transaction(
    filtered.map((entry) =>
      prisma.seniorsAttendance.upsert({
        where: {
          tenantId_studentId_date: {
            tenantId,
            studentId: entry.studentId,
            date: dateOnly,
          },
        },
        create: {
          tenantId,
          studentId: entry.studentId,
          date: dateOnly,
          status: entry.status,
          note: entry.note?.trim() ?? "",
          markedById,
        },
        update: {
          status: entry.status,
          note: entry.note?.trim() ?? "",
          markedById,
        },
      }),
    ),
  );

  return { saved: filtered.length };
}
