"use client";

import { useState } from "react";
import { Eye, Info } from "lucide-react";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import { SeniorsCard } from "@/presentation/components/templates/seniors/shared/SeniorsUi";
import { SENIORS_PASTEL } from "@/presentation/components/templates/seniors/shared/seniors-nav";
import { loadSeniorsCachedJson } from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";
import { formatDate } from "@/shared/lib/format-date";

export type AttendanceAdminData = {
  section: "attendance";
  month: string;
  classes: {
    id: string;
    name: string;
    section: string;
    studentCount: number;
    daysRecorded: number;
    presentPercent: number;
    lastRecordedDate: string | null;
  }[];
  selectedClassId: string | null;
  detailDate: string;
  students: {
    studentId: string;
    fullName: string;
    rollNumber: string;
    status: "present" | "absent" | "late" | "holiday" | null;
    note: string;
  }[];
};

const STATUS_LABELS: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  holiday: "Holiday",
};

export function SchoolAdminAttendancePanel({ data }: { data: AttendanceAdminData }) {
  const ctx = useSeniorsSite();
  const [month, setMonth] = useState(data.month.slice(0, 7));
  const [classes, setClasses] = useState(data.classes);
  const [selectedClassId, setSelectedClassId] = useState(data.selectedClassId);
  const [detailDate, setDetailDate] = useState(data.detailDate.slice(0, 10));
  const [students, setStudents] = useState(data.students);
  const [loading, setLoading] = useState(false);

  async function loadOverview(nextMonth: string) {
    setLoading(true);
    try {
      const url = `/api/tenants/${encodeURIComponent(ctx.tenant)}/seniors/school-admin/page?view=attendance&date=${encodeURIComponent(`${nextMonth}-01`)}`;
      const payload = await loadSeniorsCachedJson<AttendanceAdminData>(url, true);
      if (payload) {
        setClasses(payload.classes);
        setMonth(payload.month.slice(0, 7));
        setSelectedClassId(null);
        setStudents([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function viewClassDetail(classId: string, date: string) {
    setLoading(true);
    try {
      const url = `/api/tenants/${encodeURIComponent(ctx.tenant)}/seniors/school-admin/page?view=attendance&classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}`;
      const payload = await loadSeniorsCachedJson<AttendanceAdminData>(url, true);
      if (payload) {
        setSelectedClassId(classId);
        setDetailDate(payload.detailDate.slice(0, 10));
        setStudents(payload.students);
      }
    } finally {
      setLoading(false);
    }
  }

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm text-[#4B5563]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#6B7280]" />
        Teachers mark daily attendance. This page shows a read-only summary for each class.
      </div>

      <SeniorsCard variant="elevated" className="overflow-hidden p-0">
        <div
          className="flex flex-wrap items-end justify-between gap-3 px-4 py-4 sm:px-5"
          style={{ backgroundColor: SENIORS_PASTEL.blue }}
        >
          <div>
            <h3 className="text-base font-bold text-[#111827]">Class attendance overview</h3>
            <p className="mt-0.5 text-sm text-[#4B5563]">
              Monthly summary across all classes
            </p>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[#4B5563]">Month</span>
            <input
              type="month"
              className="rounded-lg border border-white/60 bg-white px-3 py-2 text-sm"
              value={month}
              onChange={(e) => loadOverview(e.target.value)}
              disabled={loading}
            />
          </label>
        </div>

        <div className="bg-white px-4 py-4 sm:px-5">
          {classes.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No classes yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#F3F4F6] text-xs font-medium text-[#6B7280]">
                    <th className="px-3 py-2.5">Class</th>
                    <th className="px-3 py-2.5">Students</th>
                    <th className="px-3 py-2.5">Days recorded</th>
                    <th className="px-3 py-2.5">Present %</th>
                    <th className="px-3 py-2.5">Last recorded</th>
                    <th className="px-3 py-2.5 text-right">View</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c.id} className="border-b border-[#F3F4F6] last:border-0">
                      <td className="px-3 py-3 font-semibold text-[#111827]">
                        {c.name} {c.section}
                      </td>
                      <td className="px-3 py-3 text-[#4B5563]">{c.studentCount}</td>
                      <td className="px-3 py-3 text-[#4B5563]">{c.daysRecorded}</td>
                      <td className="px-3 py-3 font-medium text-[#374151]">
                        {c.presentPercent}%
                      </td>
                      <td className="px-3 py-3 text-[#6B7280]">
                        {c.lastRecordedDate ? formatDate(c.lastRecordedDate) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-2.5 py-1 text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB]"
                          onClick={() =>
                            viewClassDetail(
                              c.id,
                              c.lastRecordedDate?.slice(0, 10) ?? detailDate,
                            )
                          }
                          disabled={loading}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SeniorsCard>

      {selectedClassId && selectedClass ? (
        <SeniorsCard variant="elevated" className="overflow-hidden p-0">
          <div
            className="flex flex-wrap items-end justify-between gap-3 px-4 py-4 sm:px-5"
            style={{ backgroundColor: SENIORS_PASTEL.green }}
          >
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                {selectedClass.name} {selectedClass.section} — daily records
              </h3>
              <p className="mt-0.5 text-sm text-[#4B5563]">
                Student attendance for the selected date
              </p>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#4B5563]">Date</span>
              <input
                type="date"
                className="rounded-lg border border-white/60 bg-white px-3 py-2 text-sm"
                value={detailDate}
                onChange={(e) => viewClassDetail(selectedClassId, e.target.value)}
                disabled={loading}
              />
            </label>
          </div>

          <div className="bg-white px-4 py-4 sm:px-5">
            {students.length === 0 ? (
              <p className="text-sm text-[#6B7280]">
                No attendance recorded for this date. Teachers mark attendance from their portal.
              </p>
            ) : (
              <ul className="space-y-2">
                {students.map((row) => {
                  const statusLabel = row.status ? STATUS_LABELS[row.status] : "Not marked";
                  return (
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
                      <span className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-xs font-medium text-[#374151]">
                        {statusLabel}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SeniorsCard>
      ) : null}
    </div>
  );
}
