import { getPrismaClient } from "@/infrastructure/database/prisma";
import type { SeniorsTimetablePeriod } from "@/domain/seniors/types";
import { isoWeekday } from "@/domain/seniors/timetable-utils";

export type { SeniorsTimetablePeriod };

function mapSchoolSlot(s: {
  id: string;
  dayOfWeek: number;
  periodIndex: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName: string;
  room: string;
  isBreak: boolean;
}): SeniorsTimetablePeriod {
  return {
    id: s.id,
    dayOfWeek: s.dayOfWeek,
    periodIndex: s.periodIndex,
    startTime: s.startTime,
    endTime: s.endTime,
    subjectName: s.subjectName,
    teacherName: s.teacherName,
    room: s.room,
    isBreak: s.isBreak,
  };
}

function mapPersonalSlot(s: {
  id: string;
  dayOfWeek: number;
  periodIndex: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName: string;
  room: string;
  note: string;
  isBreak: boolean;
}): SeniorsTimetablePeriod {
  return {
    id: s.id,
    dayOfWeek: s.dayOfWeek,
    periodIndex: s.periodIndex,
    startTime: s.startTime,
    endTime: s.endTime,
    subjectName: s.subjectName,
    teacherName: s.teacherName,
    room: s.room,
    isBreak: s.isBreak,
    note: s.note,
  };
}

export async function loadClassTimetable(
  tenantId: string,
  classId: string,
): Promise<SeniorsTimetablePeriod[]> {
  const prisma = getPrismaClient();
  const slots = await prisma.seniorsTimetableSlot.findMany({
    where: { tenantId, classId },
    orderBy: [{ dayOfWeek: "asc" }, { periodIndex: "asc" }],
  });
  return slots.map(mapSchoolSlot);
}

export type ClassTimetableSlotInput = {
  dayOfWeek: number;
  periodIndex?: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName?: string;
  room?: string;
  isBreak?: boolean;
};

function normalizeSchoolTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) throw new Error(`Invalid time: ${value}`);
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) throw new Error(`Invalid time: ${value}`);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseDayOfWeekToken(raw: string): number {
  const t = raw.trim().toLowerCase();
  if (/^[1-7]$/.test(t)) return Number(t);
  const map: Record<string, number> = {
    mon: 1,
    monday: 1,
    tue: 2,
    tues: 2,
    tuesday: 2,
    wed: 3,
    wednesday: 3,
    thu: 4,
    thur: 4,
    thurs: 4,
    thursday: 4,
    fri: 5,
    friday: 5,
    sat: 6,
    saturday: 6,
    sun: 7,
    sunday: 7,
  };
  const day = map[t];
  if (!day) throw new Error(`Invalid day: ${raw}`);
  return day;
}

function normalizeSchoolSlotInput(input: ClassTimetableSlotInput, index: number) {
  const dayOfWeek = Number(input.dayOfWeek);
  if (dayOfWeek < 1 || dayOfWeek > 7) throw new Error("dayOfWeek must be 1–7");
  const startTime = normalizeSchoolTime(input.startTime);
  const endTime = normalizeSchoolTime(input.endTime);
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if (eh * 60 + em <= sh * 60 + sm) {
    throw new Error(`End time must be after start (${startTime}–${endTime})`);
  }
  const periodIndex =
    input.periodIndex != null && Number(input.periodIndex) > 0
      ? Number(input.periodIndex)
      : index + 1;
  return {
    dayOfWeek,
    periodIndex,
    startTime,
    endTime,
    subjectName: (input.subjectName || (input.isBreak ? "Break" : "")).trim(),
    teacherName: (input.teacherName ?? "").trim(),
    room: (input.room ?? "").trim(),
    isBreak: Boolean(input.isBreak),
  };
}

/** Replace a class timetable completely (school-admin). */
export async function replaceClassTimetable(
  tenantId: string,
  classId: string,
  inputs: ClassTimetableSlotInput[],
) {
  const prisma = getPrismaClient();
  const klass = await prisma.seniorsClass.findFirst({
    where: { id: classId, tenantId },
    select: { id: true },
  });
  if (!klass) throw new Error("Class not found");

  const normalized = inputs.map((input, index) =>
    normalizeSchoolSlotInput(input, index),
  );
  const byDay = new Map<number, typeof normalized>();
  for (const row of normalized) {
    const list = byDay.get(row.dayOfWeek) ?? [];
    list.push(row);
    byDay.set(row.dayOfWeek, list);
  }
  const rows: {
    tenantId: string;
    classId: string;
    dayOfWeek: number;
    periodIndex: number;
    startTime: string;
    endTime: string;
    subjectName: string;
    teacherName: string;
    room: string;
    isBreak: boolean;
  }[] = [];
  for (const [, list] of byDay) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    const used = new Set<number>();
    list.forEach((row, i) => {
      let periodIndex = row.periodIndex;
      if (used.has(periodIndex)) periodIndex = i + 1;
      while (used.has(periodIndex)) periodIndex += 1;
      used.add(periodIndex);
      rows.push({ tenantId, classId, ...row, periodIndex });
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.seniorsTimetableSlot.deleteMany({ where: { tenantId, classId } });
    if (rows.length > 0) {
      await tx.seniorsTimetableSlot.createMany({ data: rows });
    }
  });

  return loadClassTimetable(tenantId, classId);
}

export async function clearClassTimetable(tenantId: string, classId: string) {
  const prisma = getPrismaClient();
  await prisma.seniorsTimetableSlot.deleteMany({ where: { tenantId, classId } });
}

/** Delete a single published period without recreating the rest (stable IDs). */
export async function deleteClassTimetableSlot(
  tenantId: string,
  classId: string,
  slotId: string,
) {
  const prisma = getPrismaClient();
  const deleted = await prisma.seniorsTimetableSlot.deleteMany({
    where: { id: slotId, tenantId, classId },
  });
  if (deleted.count === 0) throw new Error("Period not found");
  return loadClassTimetable(tenantId, classId);
}

/**
 * CSV columns (header required):
 * day,startTime,endTime,subjectName,teacherName,room,isBreak
 * day accepts Mon/Monday/1–7. periodIndex optional.
 */
export function parseSchoolTimetableCsv(csvText: string): ClassTimetableSlotInput[] {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) throw new Error("CSV is empty");

  const split = (line: string) =>
    line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));

  const headerCells = split(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = headerCells.some((h) =>
    ["day", "dayofweek", "start", "starttime", "subject", "subjectname"].includes(h),
  );
  const rows = hasHeader ? lines.slice(1) : lines;
  if (rows.length === 0) throw new Error("CSV has no data rows");

  const idx = (names: string[]) =>
    headerCells.findIndex((h) => names.includes(h));

  const dayI = hasHeader ? idx(["day", "dayofweek", "weekday"]) : 0;
  const startI = hasHeader ? idx(["starttime", "start", "from"]) : 1;
  const endI = hasHeader ? idx(["endtime", "end", "to"]) : 2;
  const subjectI = hasHeader ? idx(["subjectname", "subject", "title"]) : 3;
  const teacherI = hasHeader ? idx(["teachername", "teacher"]) : 4;
  const roomI = hasHeader ? idx(["room", "note"]) : 5;
  const breakI = hasHeader ? idx(["isbreak", "break"]) : 6;
  const periodI = hasHeader ? idx(["periodindex", "period"]) : -1;

  if (dayI < 0 || startI < 0 || endI < 0 || subjectI < 0) {
    throw new Error("CSV needs day, startTime, endTime, subjectName columns");
  }

  const parsed = rows.map((line, rowIndex) => {
    const cells = split(line);
    const breakRaw = breakI >= 0 ? (cells[breakI] ?? "").toLowerCase() : "";
    const isBreak = ["1", "true", "yes", "y", "break"].includes(breakRaw);
    return {
      dayOfWeek: parseDayOfWeekToken(cells[dayI] ?? ""),
      periodIndex:
        periodI >= 0 && cells[periodI] ? Number(cells[periodI]) : undefined,
      startTime: cells[startI] ?? "",
      endTime: cells[endI] ?? "",
      subjectName: cells[subjectI] ?? (isBreak ? "Break" : ""),
      teacherName: teacherI >= 0 ? cells[teacherI] ?? "" : "",
      room: roomI >= 0 ? cells[roomI] ?? "" : "",
      isBreak,
      _row: rowIndex,
    };
  });

  // Assign periodIndex per day by start time when not provided
  const byDay = new Map<number, typeof parsed>();
  for (const row of parsed) {
    const list = byDay.get(row.dayOfWeek) ?? [];
    list.push(row);
    byDay.set(row.dayOfWeek, list);
  }
  const result: ClassTimetableSlotInput[] = [];
  for (const [, list] of byDay) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    list.forEach((row, i) => {
      result.push({
        dayOfWeek: row.dayOfWeek,
        periodIndex: row.periodIndex && row.periodIndex > 0 ? row.periodIndex : i + 1,
        startTime: row.startTime,
        endTime: row.endTime,
        subjectName: row.subjectName,
        teacherName: row.teacherName,
        room: row.room,
        isBreak: row.isBreak,
      });
    });
  }
  return result;
}

export async function loadPersonalTimetable(
  tenantId: string,
  studentId: string,
): Promise<SeniorsTimetablePeriod[]> {
  const prisma = getPrismaClient();
  const slots = await prisma.seniorsPersonalTimetableSlot.findMany({
    where: { tenantId, studentId },
    orderBy: [{ dayOfWeek: "asc" }, { periodIndex: "asc" }],
  });
  return slots.map(mapPersonalSlot);
}

export async function loadStudentTimetable(tenantId: string, studentId: string) {
  const prisma = getPrismaClient();
  const profile = await prisma.seniorsStudentProfile.findFirst({
    where: { tenantId, studentId },
    select: {
      classId: true,
      class: {
        select: {
          name: true,
          section: true,
          subjects: { orderBy: { sortOrder: "asc" }, select: { name: true } },
        },
      },
    },
  });

  const subjectOptions = profile?.class?.subjects.map((s) => s.name) ?? [];
  const className = profile?.class
    ? [profile.class.name, profile.class.section].filter(Boolean).join(" ").trim()
    : "";

  const [schoolPeriods, personalPeriods] = await Promise.all([
    profile?.classId
      ? loadClassTimetable(tenantId, profile.classId)
      : Promise.resolve([] as SeniorsTimetablePeriod[]),
    loadPersonalTimetable(tenantId, studentId),
  ]);

  return {
    className,
    schoolPeriods,
    personalPeriods,
    /** Back-compat for older UI/cache readers */
    periods: schoolPeriods,
    subjectOptions,
    todayDayOfWeek: isoWeekday(),
  };
}

export type PersonalSlotInput = {
  id?: string;
  dayOfWeek: number;
  /** Optional; auto-derived from startTime when omitted */
  periodIndex?: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName?: string;
  room?: string;
  note?: string;
  isBreak?: boolean;
};

function normalizeTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) throw new Error("Time must be HH:MM");
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) throw new Error("Invalid time");
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function periodIndexFromStart(startTime: string) {
  return timeToMinutes(startTime) + 1; // 1..1440
}

function validateSlotInput(input: PersonalSlotInput) {
  if (input.dayOfWeek < 1 || input.dayOfWeek > 7) {
    throw new Error("dayOfWeek must be 1–7");
  }
  const startTime = normalizeTime(input.startTime);
  const endTime = normalizeTime(input.endTime);
  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    throw new Error("End time must be after start time");
  }
  return { startTime, endTime };
}

function timeToMinutes(value: string) {
  const [h, m] = value.split(":").map((n) => Number(n));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export async function upsertPersonalTimetableSlot(
  tenantId: string,
  studentId: string,
  input: PersonalSlotInput,
) {
  const { startTime, endTime } = validateSlotInput(input);
  const periodIndex = input.periodIndex ?? periodIndexFromStart(startTime);
  const prisma = getPrismaClient();

  const payload = {
    dayOfWeek: input.dayOfWeek,
    periodIndex,
    startTime,
    endTime,
    subjectName: input.subjectName.trim() || (input.isBreak ? "Break" : ""),
    teacherName: (input.teacherName ?? "").trim(),
    room: (input.room ?? "").trim(),
    note: (input.note ?? "").trim(),
    isBreak: Boolean(input.isBreak),
  };

  if (input.id) {
    const existing = await prisma.seniorsPersonalTimetableSlot.findFirst({
      where: { id: input.id, tenantId, studentId },
    });
    if (!existing) throw new Error("Slot not found");
    const slot = await prisma.seniorsPersonalTimetableSlot.update({
      where: { id: input.id },
      data: payload,
    });
    return mapPersonalSlot(slot);
  }

  const existingByTime = await prisma.seniorsPersonalTimetableSlot.findFirst({
    where: {
      tenantId,
      studentId,
      dayOfWeek: input.dayOfWeek,
      startTime,
    },
  });

  if (existingByTime) {
    const slot = await prisma.seniorsPersonalTimetableSlot.update({
      where: { id: existingByTime.id },
      data: payload,
    });
    return mapPersonalSlot(slot);
  }

  const slot = await prisma.seniorsPersonalTimetableSlot.create({
    data: {
      tenantId,
      studentId,
      ...payload,
    },
  });
  return mapPersonalSlot(slot);
}

export async function deletePersonalTimetableSlot(
  tenantId: string,
  studentId: string,
  slotId: string,
) {
  const prisma = getPrismaClient();
  const existing = await prisma.seniorsPersonalTimetableSlot.findFirst({
    where: { id: slotId, tenantId, studentId },
  });
  if (!existing) throw new Error("Slot not found");
  await prisma.seniorsPersonalTimetableSlot.delete({ where: { id: slotId } });
}

export async function clearPersonalTimetable(tenantId: string, studentId: string) {
  const prisma = getPrismaClient();
  await prisma.seniorsPersonalTimetableSlot.deleteMany({
    where: { tenantId, studentId },
  });
}

/** Copy school class timetable into the student's personal timetable (replace all). */
export async function copySchoolTimetableToPersonal(
  tenantId: string,
  studentId: string,
) {
  const prisma = getPrismaClient();
  const profile = await prisma.seniorsStudentProfile.findFirst({
    where: { tenantId, studentId },
    select: { classId: true },
  });
  if (!profile?.classId) throw new Error("Class not assigned");

  const school = await loadClassTimetable(tenantId, profile.classId);
  await prisma.seniorsPersonalTimetableSlot.deleteMany({
    where: { tenantId, studentId },
  });
  if (school.length === 0) return [];

  await prisma.seniorsPersonalTimetableSlot.createMany({
    data: school.map((s) => ({
      tenantId,
      studentId,
      dayOfWeek: s.dayOfWeek,
      periodIndex: s.periodIndex,
      startTime: s.startTime,
      endTime: s.endTime,
      subjectName: s.subjectName,
      teacherName: s.teacherName,
      room: s.room,
      note: "",
      isBreak: s.isBreak,
    })),
  });
  return loadPersonalTimetable(tenantId, studentId);
}
