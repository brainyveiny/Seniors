"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Pencil,
  Plus,
  School,
  Trash2,
  UserRound,
} from "lucide-react";
import type { SeniorsStudentTimetableData, SeniorsTimetablePeriod } from "@/domain/seniors/types";
import type { SiteContext } from "@/application/hooks/use-site-context";
import { SeniorsCard, SeniorsEmptyState } from "@/presentation/components/templates/seniors/shared/SeniorsUi";
import { StudentHeaderActions } from "@/presentation/components/templates/seniors/student/StudentHeaderActions";
import { cn } from "@/shared/lib/utils";
import {
  findCurrentOrNextPeriod,
  isoWeekday,
  weekdayLabel,
} from "@/domain/seniors/timetable-utils";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

const SUBJECT_TONES = [
  "border-[color-mix(in_srgb,#3B82F6_45%,var(--sp-border,#E5E7EB))] bg-[color-mix(in_srgb,#3B82F6_16%,var(--sp-surface,#fff))] text-[var(--sp-text-strong,#111827)]",
  "border-[color-mix(in_srgb,#10B981_45%,var(--sp-border,#E5E7EB))] bg-[color-mix(in_srgb,#10B981_16%,var(--sp-surface,#fff))] text-[var(--sp-text-strong,#111827)]",
  "border-[color-mix(in_srgb,#F59E0B_45%,var(--sp-border,#E5E7EB))] bg-[color-mix(in_srgb,#F59E0B_16%,var(--sp-surface,#fff))] text-[var(--sp-text-strong,#111827)]",
  "border-[color-mix(in_srgb,#EC4899_45%,var(--sp-border,#E5E7EB))] bg-[color-mix(in_srgb,#EC4899_16%,var(--sp-surface,#fff))] text-[var(--sp-text-strong,#111827)]",
  "border-[color-mix(in_srgb,#8B5CF6_45%,var(--sp-border,#E5E7EB))] bg-[color-mix(in_srgb,#8B5CF6_16%,var(--sp-surface,#fff))] text-[var(--sp-text-strong,#111827)]",
  "border-[color-mix(in_srgb,#14B8A6_45%,var(--sp-border,#E5E7EB))] bg-[color-mix(in_srgb,#14B8A6_16%,var(--sp-surface,#fff))] text-[var(--sp-text-strong,#111827)]",
];

const SUBJECT_ACCENTS = [
  "#2563EB",
  "#059669",
  "#EA580C",
  "#DB2777",
  "#7C3AED",
  "#0F766E",
];

type SourceTab = "school" | "personal";

type DraftSlot = {
  id?: string;
  dayOfWeek: number;
  periodIndex?: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName: string;
  room: string;
  note: string;
  isBreak: boolean;
};

function toTimeInputValue(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
}

function subjectTone(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i) * (i + 1)) % 997;
  return SUBJECT_TONES[hash % SUBJECT_TONES.length];
}

function subjectAccent(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i) * (i + 1)) % 997;
  return SUBJECT_ACCENTS[hash % SUBJECT_ACCENTS.length];
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function buildMonthCells(month: Date) {
  const first = startOfMonth(month);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function periodLookup(periods: SeniorsTimetablePeriod[]) {
  const map = new Map<string, SeniorsTimetablePeriod>();
  for (const p of periods) map.set(`${p.dayOfWeek}:${p.periodIndex}`, p);
  return map;
}

function normalizeData(data: SeniorsStudentTimetableData) {
  const schoolPeriods = data.schoolPeriods ?? data.periods ?? [];
  const personalPeriods = data.personalPeriods ?? [];
  return {
    ...data,
    schoolPeriods,
    personalPeriods,
    subjectOptions: data.subjectOptions ?? [],
  };
}

export function StudentTimetablePage({
  ctx,
  data: initialData,
}: {
  ctx: SiteContext;
  data: SeniorsStudentTimetableData;
}) {
  const [data, setData] = useState(() => normalizeData(initialData));
  const [source, setSource] = useState<SourceTab>("school");
  const today = new Date();
  const todayIso = isoWeekday(today);
  const [selectedDay, setSelectedDay] = useState(
    todayIso >= 1 && todayIso <= 7 ? todayIso : 1,
  );
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(today));
  const [draft, setDraft] = useState<DraftSlot | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const apiUrl = `/api/tenants/${encodeURIComponent(ctx.tenant)}/seniors/student/timetable`;

  useEffect(() => {
    setData(normalizeData(initialData));
  }, [initialData]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(apiUrl, { cache: "no-store" });
        const json = (await res.json()) as {
          ok?: boolean;
          data?: SeniorsStudentTimetableData;
        };
        if (!cancelled && res.ok && json.data) {
          setData(normalizeData(json.data));
        }
      } catch {
        /* keep initial */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  const activePeriods =
    source === "school" ? data.schoolPeriods : data.personalPeriods;

  const { current } = useMemo(
    () => findCurrentOrNextPeriod(activePeriods),
    [activePeriods],
  );

  const periodIndexes = useMemo(() => {
    const set = new Set(data.schoolPeriods.map((p) => p.periodIndex));
    return [...set].sort((a, b) => a - b);
  }, [data.schoolPeriods]);

  const bySlot = useMemo(() => periodLookup(activePeriods), [activePeriods]);

  const timeLabels = useMemo(() => {
    const labels = new Map<number, { start: string; end: string }>();
    for (const p of activePeriods) {
      if (!labels.has(p.periodIndex)) {
        labels.set(p.periodIndex, { start: p.startTime, end: p.endTime });
      }
    }
    return labels;
  }, [activePeriods]);

  const personalByDay = useMemo(() => {
    const groups = WEEKDAYS.map((day) => ({
      day,
      slots: data.personalPeriods
        .filter((p) => p.dayOfWeek === day)
        .slice()
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }));
    return groups;
  }, [data.personalPeriods]);

  const personalDaySlots = useMemo(
    () => personalByDay.find((g) => g.day === selectedDay)?.slots ?? [],
    [personalByDay, selectedDay],
  );

  const personalNowId = useMemo(() => {
    if (selectedDay !== todayIso) return null;
    return findCurrentOrNextPeriod(personalDaySlots).current?.id ?? null;
  }, [personalDaySlots, selectedDay, todayIso]);

  const monthCells = useMemo(() => buildMonthCells(monthCursor), [monthCursor]);
  const selectedDatePreview = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + (selectedDay - todayIso));
    return base;
  }, [selectedDay, todayIso]);

  async function refreshFromServer() {
    const res = await fetch(apiUrl, { cache: "no-store" });
    const json = (await res.json()) as { ok?: boolean; data?: SeniorsStudentTimetableData };
    if (res.ok && json.data) setData(normalizeData(json.data));
  }

  function openAddPersonal(dayOfWeek = selectedDay) {
    setError("");
    setDraft({
      dayOfWeek,
      startTime: "18:00",
      endTime: "19:00",
      subjectName: "",
      teacherName: "",
      room: "",
      note: "",
      isBreak: false,
    });
  }

  function openEditPersonal(slot: SeniorsTimetablePeriod) {
    setError("");
    setDraft({
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      periodIndex: slot.periodIndex,
      startTime: toTimeInputValue(slot.startTime),
      endTime: toTimeInputValue(slot.endTime),
      subjectName: slot.subjectName,
      teacherName: slot.teacherName,
      room: slot.room,
      note: slot.note ?? "",
      isBreak: slot.isBreak,
    });
  }

  async function postSlot(payload: {
    id?: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    subjectName: string;
    teacherName?: string;
    room?: string;
    note?: string;
    isBreak?: boolean;
    periodIndex?: number;
  }) {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to save");
  }

  async function saveDraft() {
    if (!draft) return;
    if (!draft.subjectName.trim() && !draft.isBreak) {
      setError("Title likho");
      return;
    }
    if (!draft.startTime || !draft.endTime) {
      setError("Start aur end time chahiye");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await postSlot({
        id: draft.id,
        dayOfWeek: draft.dayOfWeek,
        periodIndex: draft.periodIndex,
        startTime: draft.startTime,
        endTime: draft.endTime,
        subjectName: draft.subjectName.trim(),
        teacherName: draft.teacherName.trim(),
        room: draft.room.trim(),
        note: (draft.note || draft.room).trim(),
        isBreak: draft.isBreak,
      });
      setSelectedDay(draft.dayOfWeek);
      setDraft(null);
      await refreshFromServer();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function removeSlot(id: string) {
    if (!window.confirm("Delete this period from your timetable?")) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to delete");
      setDraft(null);
      await refreshFromServer();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  async function clearAllPersonal() {
    if (!window.confirm("Clear your entire personal timetable?")) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-all" }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to clear");
      setDraft(null);
      await refreshFromServer();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clear");
    } finally {
      setSaving(false);
    }
  }

  async function copyFromSchool() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copy-school" }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to copy");
      setSource("personal");
      await refreshFromServer();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to copy");
    } finally {
      setSaving(false);
    }
  }

  const emptySchool = data.schoolPeriods.length === 0;
  const emptyPersonal = data.personalPeriods.length === 0;

  return (
    <div className="relative space-y-6 pb-2">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 -top-4 h-36 rounded-3xl opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 12% 0%, color-mix(in srgb, var(--sp-accent, #2563EB) 10%, transparent), transparent 70%)",
        }}
      />

      <header className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={ctx.sitePath("student/home")}
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--sp-muted,#6B7280)] transition hover:text-[var(--sp-accent,#2563EB)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--sp-muted,#6B7280)]">
            From your dashboard
          </p>
          <h1 className="mt-1 text-[1.75rem] font-semibold tracking-tight text-[var(--sp-text-strong,#111827)] sm:text-[1.875rem]">
            Set timetable
          </h1>
          <p className="mt-1.5 text-sm text-[var(--sp-muted,#6B7280)]">
            {data.className
              ? `${data.className} · school + personal calendars`
              : "School timetable and your own personal timetable"}
          </p>
        </div>
        <StudentHeaderActions ctx={ctx} />
      </header>

      <div className="relative inline-flex rounded-xl border border-[var(--sp-border,#E5E7EB)] bg-[var(--sp-surface,#fff)] p-1">
        <button
          type="button"
          onClick={() => setSource("school")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition",
            source === "school"
              ? "bg-[var(--sp-accent-soft,#EFF6FF)] text-[var(--sp-accent,#1D4ED8)]"
              : "text-[var(--sp-muted,#6B7280)] hover:text-[var(--sp-text-strong,#111827)]",
          )}
        >
          <School className="h-4 w-4" />
          School timetable
          <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums">
            {data.schoolPeriods.filter((p) => !p.isBreak).length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSource("personal")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition",
            source === "personal"
              ? "bg-[var(--sp-accent-soft,#EFF6FF)] text-[var(--sp-accent,#1D4ED8)]"
              : "text-[var(--sp-muted,#6B7280)] hover:text-[var(--sp-text-strong,#111827)]",
          )}
        >
          <UserRound className="h-4 w-4" />
          My timetable
          <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums">
            {data.personalPeriods.filter((p) => !p.isBreak).length}
          </span>
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {source === "school" && emptySchool ? (
        <SeniorsEmptyState
          title="School timetable not set"
          description="School abhi is class ka timetable publish nahi kiya. Personal timetable My timetable tab pe bana sakte ho."
        />
      ) : null}

      {source === "personal" ? (
        <div className="relative">
          <SeniorsCard className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sp-border,#E5E7EB)] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--sp-accent-soft,#EFF6FF)] text-[var(--sp-accent,#2563EB)]">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-[var(--sp-text-strong,#111827)]">
                    Personal schedule
                  </h2>
                  <p className="text-xs text-[var(--sp-muted,#6B7280)]">
                    {data.personalPeriods.filter((p) => !p.isBreak).length} entries this week
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openAddPersonal(selectedDay)}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--sp-accent,#2563EB)] px-3.5 py-2 text-sm font-medium text-[var(--sp-on-brand)] hover:bg-[var(--sp-brand-hover)]"
              >
                <Plus className="h-4 w-4" />
                New entry
              </button>
            </div>

            <div className="border-b border-[var(--sp-border,#E5E7EB)] bg-[var(--sp-page,#F9FAFB)] px-3 py-3 sm:px-5">
              <div className="grid grid-cols-7 gap-1">
                {personalByDay.map(({ day, slots }) => {
                  const active = day === selectedDay;
                  const isToday = day === todayIso;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "relative flex flex-col items-center rounded-lg px-1 py-2.5 transition",
                        active
                          ? "bg-[var(--sp-surface,#fff)] shadow-sm ring-1 ring-[var(--sp-border,#E5E7EB)]"
                          : "hover:bg-[color-mix(in_srgb,var(--sp-surface,#fff)_70%,transparent)]",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[10px] font-medium uppercase tracking-[0.06em]",
                          active
                            ? "text-[var(--sp-accent,#2563EB)]"
                            : "text-[var(--sp-muted,#6B7280)]",
                        )}
                      >
                        {weekdayLabel(day).slice(0, 3)}
                      </span>
                      <span
                        className={cn(
                          "mt-1.5 text-[13px] font-semibold tabular-nums",
                          active
                            ? "text-[var(--sp-text-strong,#111827)]"
                            : isToday
                              ? "text-[var(--sp-accent,#2563EB)]"
                              : "text-[var(--sp-text,#374151)]",
                        )}
                      >
                        {slots.length}
                      </span>
                      <span
                        className={cn(
                          "mt-1.5 h-0.5 w-4 rounded-full transition",
                          active ? "bg-[var(--sp-accent,#2563EB)]" : "bg-transparent",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-5 py-5">
              <div className="mb-5 flex items-end justify-between gap-3 border-b border-[var(--sp-border,#E5E7EB)] pb-4">
                <div>
                  <p className="text-xs font-medium text-[var(--sp-muted,#6B7280)]">
                    {selectedDay === todayIso ? "Today" : "Selected day"}
                  </p>
                  <h3 className="mt-0.5 text-xl font-semibold tracking-tight text-[var(--sp-text-strong,#111827)]">
                    {weekdayLabel(selectedDay)}
                  </h3>
                </div>
                <p className="pb-0.5 text-sm tabular-nums text-[var(--sp-muted,#6B7280)]">
                  {personalDaySlots.length === 0
                    ? "No entries"
                    : `${personalDaySlots.length} ${personalDaySlots.length === 1 ? "entry" : "entries"}`}
                </p>
              </div>

              {personalDaySlots.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-12 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--sp-border,#E5E7EB)] bg-[var(--sp-surface,#fff)] text-[var(--sp-muted,#6B7280)]">
                    <Clock3 className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-[var(--sp-text-strong,#111827)]">
                    No schedule for {weekdayLabel(selectedDay)}
                  </p>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed text-[var(--sp-muted,#6B7280)]">
                    Add tuition, revision, or any personal block for this day.
                  </p>
                  <button
                    type="button"
                    onClick={() => openAddPersonal(selectedDay)}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[var(--sp-border,#E5E7EB)] bg-[var(--sp-surface,#fff)] px-3.5 py-2 text-sm font-medium text-[var(--sp-text,#374151)] hover:bg-[var(--sp-page,#F9FAFB)]"
                  >
                    <Plus className="h-4 w-4" />
                    Add entry
                  </button>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {personalDaySlots.map((slot) => {
                    const isNow = personalNowId === slot.id && !slot.isBreak;
                    const accent = slot.isBreak
                      ? "#9CA3AF"
                      : subjectAccent(slot.subjectName);
                    return (
                      <li key={slot.id}>
                        <div
                          className={cn(
                            "group flex items-stretch overflow-hidden rounded-xl border border-[var(--sp-border,#E5E7EB)] bg-[var(--sp-surface,#fff)] transition hover:border-[color-mix(in_srgb,var(--sp-border,#E5E7EB)_50%,#94A3B8)]",
                            isNow && "border-[var(--sp-accent,#2563EB)] shadow-sm",
                          )}
                        >
                          <div
                            className="w-1 shrink-0"
                            style={{ backgroundColor: accent }}
                            aria-hidden
                          />
                          <div className="flex min-w-0 flex-1 items-start gap-4 px-4 py-3.5">
                            <div className="w-[4.5rem] shrink-0 pt-0.5">
                              <p className="text-sm font-semibold tabular-nums text-[var(--sp-text-strong,#111827)]">
                                {slot.startTime}
                              </p>
                              <p className="mt-0.5 text-xs tabular-nums text-[var(--sp-muted,#6B7280)]">
                                {slot.endTime}
                              </p>
                              {isNow ? (
                                <span className="mt-2 inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--sp-accent,#1D4ED8)] bg-[var(--sp-accent-soft,#EFF6FF)]">
                                  Now
                                </span>
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-[var(--sp-text-strong,#111827)]">
                                {slot.subjectName || (slot.isBreak ? "Break" : "Untitled")}
                              </p>
                              {[slot.teacherName, slot.room, slot.note]
                                .filter(Boolean)
                                .join(" · ") ? (
                                <p className="mt-1 truncate text-xs text-[var(--sp-muted,#6B7280)]">
                                  {[slot.teacherName, slot.room, slot.note]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              ) : (
                                <p className="mt-1 text-xs text-[var(--sp-muted,#9CA3AF)]">
                                  No details added
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                              <button
                                type="button"
                                disabled={saving}
                                aria-label="Edit entry"
                                onClick={() => openEditPersonal(slot)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--sp-muted,#6B7280)] hover:bg-[var(--sp-page,#F3F4F6)] hover:text-[var(--sp-text-strong,#111827)] disabled:opacity-60"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                aria-label="Delete entry"
                                onClick={() => void removeSlot(slot.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--sp-muted,#6B7280)] hover:bg-[#FEF2F2] hover:text-[#B91C1C] disabled:opacity-60"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--sp-border,#E5E7EB)] bg-[var(--sp-page,#F9FAFB)] px-5 py-3">
              <button
                type="button"
                disabled={saving || emptySchool}
                onClick={() => void copyFromSchool()}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--sp-muted,#6B7280)] hover:bg-[var(--sp-surface,#fff)] hover:text-[var(--sp-text,#374151)] disabled:opacity-50"
              >
                <Copy className="h-3.5 w-3.5" />
                Import school timetable
              </button>
              {!emptyPersonal ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void clearAllPersonal()}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--sp-muted,#6B7280)] hover:bg-[var(--sp-surface,#fff)] hover:text-[#B91C1C] disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear week
                </button>
              ) : null}
            </div>
          </SeniorsCard>
        </div>
      ) : null}

      {source === "school" && !emptySchool ? (
        <div className="relative grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
          <SeniorsCard className="h-fit p-4">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="rounded-lg p-1.5 text-[var(--sp-muted,#6B7280)] transition hover:bg-[var(--sp-page,#F3F4F6)]"
                aria-label="Previous month"
                onClick={() => setMonthCursor((m) => addMonths(m, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-[var(--sp-text-strong,#111827)]">
                {monthLabel(monthCursor)}
              </p>
              <button
                type="button"
                className="rounded-lg p-1.5 text-[var(--sp-muted,#6B7280)] transition hover:bg-[var(--sp-page,#F3F4F6)]"
                aria-label="Next month"
                onClick={() => setMonthCursor((m) => addMonths(m, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--sp-muted,#9CA3AF)]">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {monthCells.map((cell, idx) => {
                if (!cell) return <span key={`e-${idx}`} className="h-8" />;
                const iso = isoWeekday(cell);
                const isToday = sameDay(cell, today);
                const isSelectedWeekday = iso === selectedDay;
                return (
                  <button
                    key={cell.toISOString()}
                    type="button"
                    onClick={() => setSelectedDay(iso)}
                    className={cn(
                      "flex h-8 items-center justify-center rounded-lg text-xs font-semibold transition",
                      "text-[var(--sp-text,#374151)] hover:bg-[var(--sp-accent-soft,#EFF6FF)]",
                      isSelectedWeekday &&
                        "bg-[var(--sp-accent,#2563EB)] text-white hover:bg-[var(--sp-accent,#2563EB)]",
                      isToday &&
                        !isSelectedWeekday &&
                        "ring-1 ring-[var(--sp-accent,#2563EB)] ring-offset-1 ring-offset-[var(--sp-surface,#fff)]",
                    )}
                  >
                    {cell.getDate()}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--sp-muted,#6B7280)]">
              School set karta hai ye schedule. Apne custom times ke liye “My timetable” tab kholo.
            </p>
          </SeniorsCard>

          <SeniorsCard className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sp-border,#E5E7EB)] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--sp-accent-soft,#EFF6FF)] text-[var(--sp-accent,#2563EB)]">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-[var(--sp-text-strong,#111827)]">
                    School week calendar
                  </h2>
                  <p className="text-xs text-[var(--sp-muted,#6B7280)]">
                    Focusing {weekdayLabel(selectedDay)}
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--sp-page,#F9FAFB)] px-2.5 py-1 text-xs font-medium text-[var(--sp-muted,#6B7280)]">
                <Clock3 className="h-3.5 w-3.5" />
                {selectedDatePreview.toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[820px] p-3 sm:p-4">
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: `72px repeat(7, minmax(0, 1fr))` }}
                >
                  <div />
                  {WEEKDAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "rounded-xl px-2 py-2 text-center transition",
                        selectedDay === day
                          ? "bg-[color-mix(in_srgb,var(--sp-accent,#2563EB)_18%,var(--sp-surface,#fff))]"
                          : "hover:bg-[var(--sp-page,#F9FAFB)]",
                      )}
                    >
                      <p
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-wide",
                          selectedDay === day
                            ? "text-[var(--sp-accent,#1D4ED8)]"
                            : "text-[var(--sp-muted,#6B7280)]",
                        )}
                      >
                        {weekdayLabel(day).slice(0, 3)}
                      </p>
                      {day === todayIso ? (
                        <p className="mt-0.5 text-[10px] font-semibold text-[var(--sp-accent,#2563EB)]">
                          Today
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[10px] text-transparent">.</p>
                      )}
                    </button>
                  ))}

                  {periodIndexes.map((periodIndex) => {
                    const time = timeLabels.get(periodIndex);
                    return (
                      <div key={`row-${periodIndex}`} className="contents">
                        <div className="flex flex-col justify-center pr-1 text-right">
                          <span className="text-[11px] font-semibold tabular-nums text-[var(--sp-text,#374151)]">
                            {time?.start}
                          </span>
                          <span className="text-[10px] tabular-nums text-[var(--sp-muted,#9CA3AF)]">
                            {time?.end}
                          </span>
                        </div>
                        {WEEKDAYS.map((day) => {
                          const slot = bySlot.get(`${day}:${periodIndex}`);
                          const isActiveCol = day === selectedDay;
                          const isNow =
                            day === todayIso && current?.id === slot?.id && !slot?.isBreak;

                          if (!slot) {
                            return (
                              <div
                                key={`${day}-${periodIndex}`}
                                className={cn(
                                  "flex min-h-[64px] items-center justify-center rounded-xl border border-[var(--sp-border,#E5E7EB)] bg-[var(--sp-surface,#fff)] text-[11px] font-medium text-[var(--sp-muted,#9CA3AF)]",
                                  isActiveCol &&
                                    "bg-[color-mix(in_srgb,var(--sp-accent,#2563EB)_10%,var(--sp-surface,#fff))] ring-1 ring-[var(--sp-border,#D1D5DB)]",
                                )}
                              >
                                —
                              </div>
                            );
                          }

                          if (slot.isBreak) {
                            return (
                              <div
                                key={slot.id}
                                className={cn(
                                  "flex min-h-[64px] items-center justify-center rounded-xl border border-dashed border-[var(--sp-border,#E5E7EB)] bg-[color-mix(in_srgb,var(--sp-page,#F9FAFB)_80%,var(--sp-surface,#fff))] px-2 text-center text-[11px] font-semibold text-[var(--sp-text,#374151)]",
                                  isActiveCol && "ring-1 ring-[var(--sp-border,#D1D5DB)]",
                                )}
                              >
                                {slot.subjectName || "Break"}
                              </div>
                            );
                          }

                          return (
                            <div
                              key={slot.id}
                              className={cn(
                                "flex min-h-[64px] flex-col justify-center rounded-xl border px-2.5 py-2 text-left",
                                subjectTone(slot.subjectName),
                                isActiveCol && "shadow-sm",
                                isNow &&
                                  "ring-2 ring-[var(--sp-accent,#2563EB)] ring-offset-1 ring-offset-[var(--sp-surface,#fff)]",
                              )}
                            >
                              <p className="line-clamp-2 text-xs font-semibold leading-snug">
                                {slot.subjectName}
                              </p>
                              {slot.teacherName ? (
                                <p className="mt-0.5 truncate text-[10px] text-[var(--sp-muted,#6B7280)]">
                                  {slot.teacherName}
                                </p>
                              ) : null}
                              {isNow ? (
                                <span className="mt-1 w-fit rounded bg-[var(--sp-accent,#2563EB)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                  Now
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </SeniorsCard>
        </div>
      ) : null}

      {draft ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => !saving && setDraft(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--sp-border,#E5E7EB)] bg-[var(--sp-surface,#fff)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold tracking-tight text-[var(--sp-text-strong,#111827)]">
              {draft.id ? "Edit entry" : "New entry"}
            </h3>
            <p className="mt-1 text-sm text-[var(--sp-muted,#6B7280)]">
              Set the day, title, and time for this block.
            </p>
            {error ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-[var(--sp-muted,#6B7280)]">
                Day
                <select
                  value={draft.dayOfWeek}
                  onChange={(e) =>
                    setDraft({ ...draft, dayOfWeek: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--sp-border,#E5E7EB)] bg-[var(--sp-surface,#fff)] px-3 py-2 text-sm text-[var(--sp-text-strong,#111827)]"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <option key={day} value={day}>
                      {weekdayLabel(day)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-[var(--sp-muted,#6B7280)]">
                Title
                <input
                  list="timetable-subjects"
                  value={draft.subjectName}
                  onChange={(e) => setDraft({ ...draft, subjectName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--sp-border,#E5E7EB)] bg-[var(--sp-surface,#fff)] px-3 py-2.5 text-sm text-[var(--sp-text-strong,#111827)]"
                  placeholder="Maths, Tuition, Self study…"
                  autoFocus={!draft.id}
                />
              </label>
              <datalist id="timetable-subjects">
                {data.subjectOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-[var(--sp-muted,#6B7280)]">
                  Start
                  <input
                    type="time"
                    value={draft.startTime}
                    onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[var(--sp-border,#E5E7EB)] bg-[var(--sp-surface,#fff)] px-3 py-2 text-sm text-[var(--sp-text-strong,#111827)]"
                  />
                </label>
                <label className="block text-xs font-semibold text-[var(--sp-muted,#6B7280)]">
                  End
                  <input
                    type="time"
                    value={draft.endTime}
                    onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[var(--sp-border,#E5E7EB)] bg-[var(--sp-surface,#fff)] px-3 py-2 text-sm text-[var(--sp-text-strong,#111827)]"
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-[var(--sp-muted,#6B7280)]">
                Teacher (optional)
                <input
                  value={draft.teacherName}
                  onChange={(e) => setDraft({ ...draft, teacherName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--sp-border,#E5E7EB)] bg-[var(--sp-surface,#fff)] px-3 py-2 text-sm text-[var(--sp-text-strong,#111827)]"
                />
              </label>
              <label className="block text-xs font-semibold text-[var(--sp-muted,#6B7280)]">
                Room / note
                <input
                  value={draft.room}
                  onChange={(e) =>
                    setDraft({ ...draft, room: e.target.value, note: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--sp-border,#E5E7EB)] bg-[var(--sp-surface,#fff)] px-3 py-2 text-sm text-[var(--sp-text-strong,#111827)]"
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-[var(--sp-text,#374151)]">
                <input
                  type="checkbox"
                  checked={draft.isBreak}
                  onChange={(e) => setDraft({ ...draft, isBreak: e.target.checked })}
                />
                This is a break
              </label>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              {draft.id ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void removeSlot(draft.id!)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-[#F87171] hover:bg-[color-mix(in_srgb,#EF4444_12%,transparent)] disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setDraft(null)}
                  className="rounded-lg border border-[var(--sp-border,#E5E7EB)] px-4 py-2 text-sm font-semibold text-[var(--sp-text,#374151)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveDraft()}
                  className="rounded-lg bg-[var(--sp-accent,#2563EB)] px-4 py-2 text-sm font-semibold text-[var(--sp-on-brand)] hover:bg-[var(--sp-brand-hover)] disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
