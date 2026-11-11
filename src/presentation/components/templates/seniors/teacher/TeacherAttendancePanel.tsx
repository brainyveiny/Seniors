"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import { SeniorsCard } from "@/presentation/components/templates/seniors/shared/SeniorsUi";
import {
  loadSeniorsCachedJson,
  writeSeniorsCachedJson,
} from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";

export type TeacherAttendanceData = {
  classes: { id: string; name: string; section: string; studentCount: number }[];
  selectedClassId: string | null;
  date: string;
  students: {
    studentId: string;
    fullName: string;
    rollNumber: string;
    status: "present" | "absent" | "late" | "holiday" | null;
    note: string;
  }[];
};

type AttendanceStatus = "present" | "absent" | "late";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "present", label: "Present", color: "#15803D" },
  { value: "absent", label: "Absent", color: "#B91C1C" },
  { value: "late", label: "Late", color: "#B45309" },
];

export function TeacherAttendancePanel({ data }: { data: TeacherAttendanceData }) {
  const ctx = useSeniorsSite();
  const [classId, setClassId] = useState(data.selectedClassId ?? data.classes[0]?.id ?? "");
  const [date, setDate] = useState(data.date.slice(0, 10));
  const [rows, setRows] = useState(data.students);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const pageUrl = `/api/tenants/${encodeURIComponent(ctx.tenant)}/seniors/teacher/page?view=attendance&classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}`;
  const apiUrl = `/api/tenants/${encodeURIComponent(ctx.tenant)}/seniors/teacher/attendance`;

  const presentCount = useMemo(
    () => rows.filter((r) => r.status === "present" || r.status === "late").length,
    [rows],
  );

  async function reload() {
    const payload = await loadSeniorsCachedJson<TeacherAttendanceData>(pageUrl, true);
    if (payload) {
      setRows(payload.students);
      writeSeniorsCachedJson(pageUrl, payload);
    }
  }

  async function handleClassOrDateChange(nextClassId: string, nextDate: string) {
    setClassId(nextClassId);
    setDate(nextDate);
    const url = `/api/tenants/${encodeURIComponent(ctx.tenant)}/seniors/teacher/page?view=attendance&classId=${encodeURIComponent(nextClassId)}&date=${encodeURIComponent(nextDate)}`;
    const payload = await loadSeniorsCachedJson<TeacherAttendanceData>(url, true);
    if (payload) setRows(payload.students);
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          date,
          entries: rows
            .filter((r) => r.status)
            .map((r) => ({
              studentId: r.studentId,
              status: r.status as AttendanceStatus,
              note: r.note,
            })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save attendance");
      setMessage(`Saved attendance for ${json.saved ?? rows.length} students.`);
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function setStatus(studentId: string, status: AttendanceStatus) {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)),
    );
  }

  function markAll(status: AttendanceStatus) {
    setRows((prev) => prev.map((r) => ({ ...r, status })));
  }

  if (data.classes.length === 0) {
    return (
      <SeniorsCard pastel="peach" className="p-6 text-sm text-[#6B7280]">
        No classes assigned yet. Ask your school admin to assign you to a class.
      </SeniorsCard>
    );
  }

  return (
    <div className="space-y-5">
      <SeniorsCard pastel="blue" className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[#6B7280]">Class</span>
            <select
              className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
              value={classId}
              onChange={(e) => handleClassOrDateChange(e.target.value, date)}
            >
              {data.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.section} ({c.studentCount} students)
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[#6B7280]">Date</span>
            <input
              type="date"
              className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
              value={date}
              onChange={(e) => handleClassOrDateChange(classId, e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-xs font-semibold text-[#15803D]"
              onClick={() => markAll("present")}
            >
              Mark all present
            </button>
            <button
              type="button"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
              onClick={handleSave}
              disabled={saving || rows.length === 0}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save attendance"}
            </button>
          </div>
        </div>
        {message ? <p className="mt-3 text-sm text-[#374151]">{message}</p> : null}
      </SeniorsCard>

      <SeniorsCard pastel="green" className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#111827]">
            {rows.length} students · {presentCount} present/late
          </p>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-[#6B7280]">No students in this class.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.studentId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold text-[#111827]">{row.fullName}</p>
                  {row.rollNumber ? (
                    <p className="text-xs text-[#6B7280]">Roll {row.rollNumber}</p>
                  ) : null}
                </div>
                <div className="flex gap-1.5">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(row.studentId, opt.value)}
                      className="rounded-full px-2.5 py-1 text-xs font-semibold transition"
                      style={{
                        backgroundColor: row.status === opt.value ? opt.color : "#F3F4F6",
                        color: row.status === opt.value ? "#fff" : "#6B7280",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SeniorsCard>

      <div className="flex items-start gap-2 rounded-lg bg-[#EFF6FF] p-4 text-sm text-[#1E40AF]">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        Mark daily attendance here. Parents and school admins can view the records in their portals.
      </div>
    </div>
  );
}
