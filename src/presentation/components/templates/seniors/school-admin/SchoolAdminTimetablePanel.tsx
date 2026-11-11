"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  CalendarDays,
  Download,
  FileSpreadsheet,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  SeniorsCard,
  SeniorsEmptyState,
} from "@/presentation/components/templates/seniors/shared/SeniorsUi";
import { weekdayLabel } from "@/domain/seniors/timetable-utils";
import type { SeniorsTimetablePeriod } from "@/domain/seniors/types";
import { writeSeniorsCachedJson } from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";
import { cn } from "@/shared/lib/utils";

const INPUT =
  "w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#1F2937] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:outline-none";
const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60";
const BTN_GHOST =
  "inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-60";
const BTN_DANGER =
  "inline-flex items-center gap-1.5 rounded-lg border border-[#FECACA] bg-white px-3 py-2 text-sm font-medium text-[#B91C1C] hover:bg-[#FEF2F2] disabled:opacity-60";

const CSV_TEMPLATE = `day,startTime,endTime,subjectName,teacherName,room,isBreak
Mon,08:00,08:45,Maths,Mr Sharma,A1,false
Mon,08:45,09:30,English,Ms Khan,A1,false
Mon,09:30,09:45,Break,,,true
Tue,08:00,08:45,Science,Mr Patel,Lab 1,false
`;

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export type TimetableAdminData = {
  section: "timetable";
  classes: {
    id: string;
    name: string;
    section: string;
    studentCount?: number;
    slotCount: number;
    periods: SeniorsTimetablePeriod[];
  }[];
};

type DraftForm = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName: string;
  room: string;
  isBreak: boolean;
};

const emptyDraft = (): DraftForm => ({
  dayOfWeek: 1,
  startTime: "08:00",
  endTime: "08:45",
  subjectName: "",
  teacherName: "",
  room: "",
  isBreak: false,
});

export function SchoolAdminTimetablePanel({ data }: { data: TimetableAdminData }) {
  const ctx = useSeniorsSite();
  const fileRef = useRef<HTMLInputElement>(null);
  const [classes, setClasses] = useState(data.classes);
  const [classId, setClassId] = useState(data.classes[0]?.id ?? "");
  const [draft, setDraft] = useState<DraftForm>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const apiUrl = `/api/tenants/${encodeURIComponent(ctx.tenant)}/seniors/school-admin/timetable`;
  const pageCacheUrl = `/api/tenants/${encodeURIComponent(ctx.tenant)}/seniors/school-admin/page?view=timetable`;

  function applyPeriods(nextClassId: string, next: SeniorsTimetablePeriod[]) {
    setClasses((prev) => {
      const updated = prev.map((c) =>
        c.id === nextClassId ? { ...c, periods: next, slotCount: next.length } : c,
      );
      writeSeniorsCachedJson(pageCacheUrl, { section: "timetable", classes: updated });
      return updated;
    });
  }

  // Keep class list shape from server; don't thrash periods on every parent re-render
  useEffect(() => {
    setClasses((prev) => {
      if (prev.length === 0) return data.classes;
      const prevIds = prev.map((c) => c.id).join(",");
      const nextIds = data.classes.map((c) => c.id).join(",");
      if (prevIds !== nextIds) return data.classes;
      return prev;
    });
    setClassId((prev) => prev || data.classes[0]?.id || "");
  }, [data.classes]);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/tenants/${encodeURIComponent(ctx.tenant)}/seniors/school-admin/timetable?classId=${encodeURIComponent(classId)}`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as {
          ok?: boolean;
          periods?: SeniorsTimetablePeriod[];
        };
        if (!cancelled && res.ok && json.ok && Array.isArray(json.periods)) {
          applyPeriods(classId, json.periods);
        }
      } catch {
        /* keep page payload */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classId, ctx.tenant]);

  const selected = useMemo(
    () => classes.find((c) => c.id === classId) ?? null,
    [classes, classId],
  );

  const periods = selected?.periods ?? [];

  const byDay = useMemo(() => {
    return DAYS.map((day) => ({
      day,
      slots: periods
        .filter((p) => p.dayOfWeek === day)
        .slice()
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    })).filter((g) => g.slots.length > 0);
  }, [periods]);

  const classLabel = selected
    ? `${selected.name}${selected.section ? ` ${selected.section}` : ""}`.trim()
    : "";

  async function uploadCsvText(csv: string) {
    if (!classId) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upload-csv", classId, csv }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        periods?: SeniorsTimetablePeriod[];
        imported?: number;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Upload failed");
      applyPeriods(classId, json.periods ?? []);
      setMessage(`Saved ${json.imported ?? json.periods?.length ?? 0} periods for ${classLabel}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  async function readFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv") && file.type && !file.type.includes("csv")) {
      setError("Please choose a .csv file");
      return;
    }
    const text = await file.text();
    await uploadCsvText(text);
  }

  async function saveDraft(e?: FormEvent) {
    e?.preventDefault();
    if (!classId) return;
    if (!draft.isBreak && !draft.subjectName.trim()) {
      setError("Subject / title required");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const existing = periods.map((p) => ({
        dayOfWeek: p.dayOfWeek,
        periodIndex: p.periodIndex,
        startTime: p.startTime,
        endTime: p.endTime,
        subjectName: p.subjectName,
        teacherName: p.teacherName,
        room: p.room,
        isBreak: p.isBreak,
      }));
      const slots = [
        ...existing,
        {
          dayOfWeek: draft.dayOfWeek,
          startTime: draft.startTime,
          endTime: draft.endTime,
          subjectName: draft.subjectName.trim() || (draft.isBreak ? "Break" : ""),
          teacherName: draft.teacherName.trim(),
          room: draft.room.trim(),
          isBreak: draft.isBreak,
        },
      ];
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "replace", classId, slots }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        periods?: SeniorsTimetablePeriod[];
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to save");
      applyPeriods(classId, json.periods ?? []);
      const nextStart = draft.endTime;
      const [h, m] = nextStart.split(":").map(Number);
      const total = ((h * 60 + m + 45) % (24 * 60) + 24 * 60) % (24 * 60);
      const nextEnd = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
      setDraft({
        ...emptyDraft(),
        dayOfWeek: draft.dayOfWeek,
        startTime: nextStart,
        endTime: nextEnd,
      });
      setMessage("Period added");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function removePeriod(id: string) {
    if (!classId) return;
    if (!window.confirm("Remove this period?")) return;
    const previous = periods;
    // Optimistic: remove instantly so the list doesn't flash / reload
    applyPeriods(
      classId,
      periods.filter((p) => p.id !== id),
    );
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-slot", classId, slotId: id }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        periods?: SeniorsTimetablePeriod[];
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to remove");
      applyPeriods(classId, json.periods ?? []);
      setMessage("Period removed");
    } catch (e) {
      applyPeriods(classId, previous);
      setError(e instanceof Error ? e.message : "Failed to remove");
    } finally {
      setSaving(false);
    }
  }

  async function clearTimetable() {
    if (!classId) return;
    if (!window.confirm(`Clear timetable for ${classLabel}? Students will not see a school schedule until you add one again.`)) {
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear", classId }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Clear failed");
      applyPeriods(classId, []);
      setMessage("Timetable cleared");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clear failed");
    } finally {
      setSaving(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "timetable-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (classes.length === 0) {
    return (
      <SeniorsEmptyState
        title="No classes yet"
        description="Create a class first, then set its timetable here."
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#111827]">
          Class timetable
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Select the exact class (e.g. Class 9 A), then add periods or upload CSV.
          Students only see the timetable for their own class.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      <SeniorsCard className="p-5">
        <label className="block text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
          Class
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setError("");
              setMessage("");
            }}
            className={`${INPUT} mt-1.5`}
          >
            {classes.map((klass) => {
              const label = `${klass.name}${klass.section ? ` ${klass.section}` : ""}`.trim();
              const students =
                typeof klass.studentCount === "number" ? ` · ${klass.studentCount} students` : "";
              const slots =
                klass.slotCount > 0 ? ` · ${klass.slotCount} periods` : " · no timetable";
              return (
                <option key={klass.id} value={klass.id}>
                  {label}
                  {students}
                  {slots}
                </option>
              );
            })}
          </select>
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!classId || saving || periods.length === 0}
            onClick={() => void clearTimetable()}
            className={BTN_DANGER}
          >
            <Trash2 className="h-4 w-4" />
            Clear timetable
          </button>
          <button type="button" onClick={downloadTemplate} className={BTN_GHOST}>
            <Download className="h-4 w-4" />
            Sample CSV
          </button>
        </div>
      </SeniorsCard>

      <SeniorsCard className="p-5">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-[#2563EB]" />
          <h2 className="text-sm font-semibold text-[#111827]">Upload CSV file</h2>
        </div>
        <p className="mt-1 text-xs text-[#6B7280]">
          Easiest way for a full week. Replaces the current timetable for this class.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void readFile(file);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          disabled={!classId || saving}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void readFile(file);
          }}
          className={cn(
            "mt-4 flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 py-10 text-center transition",
            dragOver
              ? "border-[#2563EB] bg-[#EFF6FF]"
              : "border-[#D1D5DB] bg-[#F9FAFB] hover:border-[#2563EB] hover:bg-[#EFF6FF]/40",
            saving && "opacity-60",
          )}
        >
          <Upload className="h-6 w-6 text-[#2563EB]" />
          <p className="mt-3 text-sm font-semibold text-[#111827]">
            {saving ? "Uploading…" : "Drop CSV here or click to choose"}
          </p>
          <p className="mt-1 text-xs text-[#6B7280]">
            Columns: day, start, end, subject, teacher, room
          </p>
        </button>
      </SeniorsCard>

      <SeniorsCard className="p-5">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-[#2563EB]" />
          <h2 className="text-sm font-semibold text-[#111827]">Add one period</h2>
        </div>
        <p className="mt-1 text-xs text-[#6B7280]">
          Use this for small edits without a spreadsheet.
        </p>

        <form onSubmit={(e) => void saveDraft(e)} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-[#6B7280]">
            Day
            <select
              value={draft.dayOfWeek}
              onChange={(e) =>
                setDraft((d) => ({ ...d, dayOfWeek: Number(e.target.value) }))
              }
              className={`${INPUT} mt-1`}
            >
              {DAYS.map((day) => (
                <option key={day} value={day}>
                  {weekdayLabel(day)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-[#6B7280]">
            Subject / title
            <input
              value={draft.subjectName}
              onChange={(e) => setDraft((d) => ({ ...d, subjectName: e.target.value }))}
              className={`${INPUT} mt-1`}
              placeholder="Maths"
            />
          </label>
          <label className="block text-xs font-medium text-[#6B7280]">
            Start
            <input
              type="time"
              value={draft.startTime}
              onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
              className={`${INPUT} mt-1`}
            />
          </label>
          <label className="block text-xs font-medium text-[#6B7280]">
            End
            <input
              type="time"
              value={draft.endTime}
              onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
              className={`${INPUT} mt-1`}
            />
          </label>
          <label className="block text-xs font-medium text-[#6B7280]">
            Teacher (optional)
            <input
              value={draft.teacherName}
              onChange={(e) => setDraft((d) => ({ ...d, teacherName: e.target.value }))}
              className={`${INPUT} mt-1`}
              placeholder="Mr Sharma"
            />
          </label>
          <label className="block text-xs font-medium text-[#6B7280]">
            Room (optional)
            <input
              value={draft.room}
              onChange={(e) => setDraft((d) => ({ ...d, room: e.target.value }))}
              className={`${INPUT} mt-1`}
              placeholder="A1"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[#374151] sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.isBreak}
              onChange={(e) => setDraft((d) => ({ ...d, isBreak: e.target.checked }))}
            />
            This is a break
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving || !classId} className={BTN_PRIMARY}>
              <Plus className="h-4 w-4" />
              {saving ? "Saving…" : "Add period"}
            </button>
          </div>
        </form>
      </SeniorsCard>

      <SeniorsCard className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#2563EB]" />
            <div>
              <h2 className="text-sm font-semibold text-[#111827]">
                {classLabel || "Schedule"}
              </h2>
              <p className="text-xs text-[#6B7280]">
                {periods.length === 0
                  ? "Nothing published yet"
                  : `${periods.length} periods · visible to students`}
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          {periods.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-[#111827]">No timetable yet</p>
              <p className="mt-1 text-xs text-[#6B7280]">
                Upload a CSV or add periods above.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {byDay.map(({ day, slots }) => (
                <section key={day}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                    {weekdayLabel(day)}
                  </h3>
                  <ul className="space-y-2">
                    {slots.map((slot) => (
                      <li
                        key={slot.id}
                        className="flex items-start gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-3"
                      >
                        <div className="w-[4.5rem] shrink-0 text-xs font-semibold tabular-nums text-[#111827]">
                          {slot.startTime}
                          <span className="mt-0.5 block font-medium text-[#6B7280]">
                            {slot.endTime}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#111827]">
                            {slot.subjectName || (slot.isBreak ? "Break" : "Untitled")}
                          </p>
                          {[slot.teacherName, slot.room].filter(Boolean).join(" · ") ? (
                            <p className="mt-0.5 truncate text-xs text-[#6B7280]">
                              {[slot.teacherName, slot.room].filter(Boolean).join(" · ")}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          disabled={saving}
                          aria-label="Remove period"
                          onClick={() => void removePeriod(slot.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-[#FEF2F2] hover:text-[#B91C1C] disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </SeniorsCard>
    </div>
  );
}
