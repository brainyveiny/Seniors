"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronDown,
  ClipboardList,
  FileUp,
  HelpCircle,
  Megaphone,
  Plus,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { SiteContext } from "@/application/hooks/use-site-context";
import {
  SeniorsActivityChip,
  SeniorsCard,
} from "@/presentation/components/templates/seniors/shared/SeniorsUi";
import { SENIORS_PASTEL } from "@/presentation/components/templates/seniors/shared/seniors-nav";
import { SeniorsHeaderActions } from "@/presentation/components/templates/seniors/shared/SeniorsHeaderActions";

export type TeacherDashboardData = {
  session: { fullName: string };
  schoolName: string;
  classes?: { id: string; label: string }[];
  selectedClassId?: string | null;
  stats: {
    classes: number;
    students: number;
    pendingAssignments: number;
    upcomingTests: number;
  };
  topicStatus: {
    id: string;
    title: string;
    number: string;
    subjectName: string;
    chapterName: string;
    contentStatus: "complete" | "in_progress" | "missing";
  }[];
  priorities: {
    homeworkToReview: number;
    topicsMissing: number;
    upcomingTestsThisWeek: number;
  };
  recentActivity: { id: string; message: string; at: Date }[];
};

function relativeTime(at: Date) {
  const ms = Date.now() - new Date(at).getTime();
  const hours = Math.round(ms / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function topicStatusMeta(status: "complete" | "in_progress" | "missing") {
  if (status === "complete") {
    return {
      label: "Complete",
      className: "bg-[#F0FDF4] text-[#15803D]",
    };
  }
  if (status === "in_progress") {
    return {
      label: "In progress",
      className: "bg-[#FFFBEB] text-[#A16207]",
    };
  }
  return {
    label: "Missing",
    className: "bg-[#FFF7ED] text-[#C2410C]",
  };
}

function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  pastel,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  pastel: keyof typeof SENIORS_PASTEL;
}) {
  return (
    <SeniorsCard pastel={pastel} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#6B7280]">{label}</p>
          <p className="mt-1.5 text-3xl font-bold tracking-tight text-[#111827]">{value}</p>
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      </div>
    </SeniorsCard>
  );
}

function QuickAction({
  href,
  label,
  icon,
  tint,
  border,
  text,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  tint: string;
  border: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors hover:opacity-90"
      style={{ backgroundColor: tint, borderColor: border, color: text }}
    >
      {icon}
      {label}
    </Link>
  );
}

const CLASS_STORAGE_KEY = "seniors-teacher-dashboard-class";

export function TeacherDashboardPage({
  ctx,
  data: initialData,
}: {
  ctx: SiteContext;
  data: TeacherDashboardData;
}) {
  const displayName = initialData.session.fullName;
  const [data, setData] = useState(initialData);
  const [classId, setClassId] = useState(initialData.selectedClassId ?? "");
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    setData(initialData);
    setClassId(initialData.selectedClassId ?? "");
  }, [initialData]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CLASS_STORAGE_KEY);
      if (!stored) return;
      const exists = (initialData.classes ?? []).some((c) => c.id === stored);
      if (exists && stored !== (initialData.selectedClassId ?? "")) {
        void switchClass(stored);
      }
    } catch {
      /* ignore */
    }
    // Hydrate preferred class once after first paint
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function switchClass(nextId: string) {
    setClassId(nextId);
    setSwitching(true);
    try {
      window.localStorage.setItem(CLASS_STORAGE_KEY, nextId);
    } catch {
      /* ignore */
    }
    try {
      const qs = new URLSearchParams({ view: "dashboard" });
      if (nextId) qs.set("classId", nextId);
      const res = await fetch(
        `/api/tenants/${encodeURIComponent(ctx.tenant)}/seniors/teacher/page?${qs}`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        data?: TeacherDashboardData;
        error?: string;
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error ?? "Failed to load class dashboard");
      }
      setData({
        ...json.data,
        session: json.data.session ?? initialData.session,
      });
    } catch {
      /* keep previous data */
    } finally {
      setSwitching(false);
    }
  }

  const classOptions = data.classes ?? [];
  const selectedLabel =
    classOptions.find((c) => c.id === classId)?.label || "All classes";

  return (
    <div className={`space-y-6 ${switching ? "opacity-70 transition-opacity" : ""}`}>
      {/* Greeting row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[28px] font-bold leading-tight tracking-tight text-[var(--sp-text-strong,#18181B)]">
          Welcome back, {displayName} 👋
        </h2>
        <div className="flex items-center gap-3">
          <label className="relative inline-flex min-w-[10rem] items-center">
            <span className="sr-only">Filter by class</span>
            <select
              value={classId}
              onChange={(e) => void switchClass(e.target.value)}
              disabled={switching || classOptions.length === 0}
              className="w-full appearance-none rounded-full border border-[var(--sp-border,#E4E4E7)] bg-[var(--sp-surface-3,#f4f4f5)] py-2 pl-3.5 pr-9 text-sm font-medium text-[var(--sp-text-strong,#18181B)] focus:border-[var(--sp-accent,#18181B)] focus:outline-none focus:ring-2 focus:ring-[var(--sp-accent,#18181B)]/10 disabled:opacity-60"
              aria-label="Class"
            >
              <option value="">All classes</option>
              {classOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          </label>
          <SeniorsHeaderActions
            ctx={ctx}
            role="teacher"
            displayName={displayName}
            subtitle={
              classId ? `${selectedLabel} · ${data.schoolName}` : data.schoolName
            }
          />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Pending Assignments"
          value={data.stats.pendingAssignments}
          pastel="peach"
          icon={<ClipboardList className="h-5 w-5" />}
          iconBg="#FEE2E2"
          iconColor="#DC2626"
        />
        <StatCard
          label="Upcoming Tests"
          value={data.stats.upcomingTests}
          pastel="purple"
          icon={<Calendar className="h-5 w-5" />}
          iconBg="#DBEAFE"
          iconColor="#2563EB"
        />
      </div>

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.9fr]">
        {/* Left column */}
        <div className="space-y-5">
          <SeniorsCard pastel="blue" className="overflow-hidden p-0">
            <div className="border-b border-white/40 px-5 py-4">
              <h3 className="text-base font-bold text-[#111827]">Content Status (This Term)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#F3F4F6] text-xs font-medium text-[#6B7280]">
                    <th className="px-5 py-3 font-medium">Topic</th>
                    <th className="px-3 py-3 font-medium">Subject</th>
                    <th className="px-5 py-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topicStatus.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-5 py-8 text-center text-sm text-[#6B7280]"
                      >
                        No topics yet. Create topics in Topic Studio.
                      </td>
                    </tr>
                  ) : (
                    data.topicStatus.map((row) => {
                      const status = topicStatusMeta(row.contentStatus);
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-[#F3F4F6] last:border-0"
                        >
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-[#111827]">
                              {row.number ? `${row.number} ` : ""}
                              {row.title}
                            </p>
                            {row.chapterName ? (
                              <p className="mt-0.5 text-xs text-[#9CA3AF]">
                                {row.chapterName}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3.5 text-[#4B5563]">
                            {row.subjectName}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span
                              className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[#F3F4F6] px-5 py-3">
              <Link
                href={ctx.sitePath("teacher/content")}
                className="text-sm font-medium text-[#2563EB] hover:underline"
              >
                View all topics →
              </Link>
            </div>
          </SeniorsCard>

          <SeniorsCard pastel="cyan" className="p-5">
            <h3 className="text-base font-bold text-[var(--sp-text-strong,#18181B)]">Recent Activity</h3>
            <ul className="mt-4 space-y-2.5">
              {data.recentActivity.length === 0 ? (
                <li className="text-sm text-[var(--sp-muted,#71717A)]">No recent activity yet.</li>
              ) : (
                data.recentActivity.map((a, i) => {
                  const pastels = Object.keys(SENIORS_PASTEL) as (keyof typeof SENIORS_PASTEL)[];
                  const pastel = pastels[i % pastels.length];
                  return (
                    <li key={a.id}>
                      <SeniorsActivityChip
                        title={a.message}
                        time={relativeTime(a.at)}
                        icon={<Sparkles className="h-3.5 w-3.5" />}
                        pastel={pastel}
                        className="w-full"
                      />
                    </li>
                  );
                })
              )}
            </ul>
            <Link
              href={ctx.sitePath("teacher/content")}
              className="mt-4 inline-block text-sm font-medium text-[#2563EB] hover:underline"
            >
              View all activity →
            </Link>
          </SeniorsCard>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <SeniorsCard pastel="green" className="p-5">
            <h3 className="text-base font-bold text-[#111827]">Pending Priorities</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href={ctx.sitePath("teacher/classwork?review=1")}
                  className="flex items-start gap-3 rounded-xl border border-[#FED7AA] bg-[#FFF7ED] px-3.5 py-3 hover:opacity-95"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFEDD5] text-[#EA580C]">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">Homework to Review</p>
                    <p className="text-xs text-[#9A3412]">
                      {data.priorities.homeworkToReview} submissions
                    </p>
                  </div>
                </Link>
              </li>
              <li>
                <Link
                  href={ctx.sitePath("teacher/content")}
                  className="flex items-start gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-3 hover:opacity-95"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FEE2E2] text-[#DC2626]">
                    <TriangleAlert className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">Topics Missing Content</p>
                    <p className="text-xs text-[#991B1B]">
                      {data.priorities.topicsMissing} topics
                    </p>
                  </div>
                </Link>
              </li>
              <li>
                <Link
                  href={ctx.sitePath("teacher/classwork?tab=quizzes")}
                  className="flex items-start gap-3 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3.5 py-3 hover:opacity-95"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#DBEAFE] text-[#2563EB]">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">Quiz Results</p>
                    <p className="text-xs text-[#1E40AF]">
                      View student exam attempts
                    </p>
                  </div>
                </Link>
              </li>
            </ul>
          </SeniorsCard>

          <SeniorsCard pastel="purple" className="p-5">
            <h3 className="text-base font-bold text-[#111827]">Quick Actions</h3>
            <div className="mt-4 space-y-2.5">
              <QuickAction
                href={ctx.sitePath("teacher/classwork?review=1")}
                label="Review Submissions"
                icon={<ClipboardList className="h-4 w-4" />}
                tint="#F0FDF4"
                border="#86EFAC"
                text="#15803D"
              />
              <QuickAction
                href={ctx.sitePath("teacher/assignments")}
                label="Create Assignment"
                icon={<Plus className="h-4 w-4" />}
                tint="#ECFDF5"
                border="#A7F3D0"
                text="#047857"
              />
              <QuickAction
                href={ctx.sitePath("teacher/classwork?tab=quizzes")}
                label="View Quiz Results"
                icon={<HelpCircle className="h-4 w-4" />}
                tint="#EEF2FF"
                border="#C7D2FE"
                text="#4338CA"
              />
              <QuickAction
                href={ctx.sitePath("teacher/quizzes")}
                label="Create Quiz"
                icon={<HelpCircle className="h-4 w-4" />}
                tint="#F5F3FF"
                border="#C4B5FD"
                text="#6D28D9"
              />
              <QuickAction
                href={ctx.sitePath("teacher/announcements")}
                label="Create Announcement"
                icon={<Megaphone className="h-4 w-4" />}
                tint="#EFF6FF"
                border="#93C5FD"
                text="#1D4ED8"
              />
              <QuickAction
                href={ctx.sitePath("teacher/content")}
                label="Upload Content"
                icon={<FileUp className="h-4 w-4" />}
                tint="#F9FAFB"
                border="#D1D5DB"
                text="#374151"
              />
            </div>
          </SeniorsCard>
        </div>
      </div>
    </div>
  );
}
