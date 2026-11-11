"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Bus,
  Calendar,
  ClipboardList,
  CreditCard,
  GraduationCap,
  Info,
  Megaphone,
  Shirt,
  UserRound,
} from "lucide-react";
import type { SiteContext } from "@/application/hooks/use-site-context";
import { SeniorsCard } from "@/presentation/components/templates/seniors/shared/SeniorsUi";
import { SeniorsHeaderActions } from "@/presentation/components/templates/seniors/shared/SeniorsHeaderActions";
import { formatDate } from "@/shared/lib/format-date";

export type ParentDashboardData = {
  session: { fullName: string };
  activeChildId?: string | null;
  children: { id: string; name: string; className: string }[];
  progress: {
    percent: number;
    topicsCompleted: number;
    topicsTotal: number;
    testAverage: number;
  };
  homeworkDue: number;
  attendancePercent?: number;
  announcementCount?: number;
  subjectProgress: {
    name: string;
    completed: number;
    total: number;
    percent: number;
  }[];
  exams: { id: string; title: string; examAt: Date; daysLeft: number }[];
  announcements: { id: string; title: string; body: string; publishedAt: Date }[];
};

function Sparkline({ color }: { color: string }) {
  return (
    <svg width="72" height="28" viewBox="0 0 72 28" fill="none" aria-hidden>
      <path
        d="M1 20 C10 18, 14 8, 22 12 C30 16, 34 6, 42 10 C50 14, 54 4, 62 8 C66 10, 68 6, 71 4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M1 20 C10 18, 14 8, 22 12 C30 16, 34 6, 42 10 C50 14, 54 4, 62 8 C66 10, 68 6, 71 4 L71 28 L1 28 Z"
        fill={color}
        opacity="0.12"
      />
    </svg>
  );
}

const QUICK_ACCESS = [
  { href: "parent/profile", label: "Profile", icon: UserRound, bg: "#DBEAFE", color: "#2563EB" },
  { href: "parent/homework", label: "Classwork", icon: ClipboardList, bg: "#FCE7F3", color: "#DB2777" },
  { href: "parent/fees", label: "Fees", icon: CreditCard, bg: "#FEE2E2", color: "#B91C1C" },
  { href: "parent/leave", label: "Apply Leave", icon: Calendar, bg: "#FFEDD5", color: "#EA580C" },
  { href: "parent/transport", label: "Transport", icon: Bus, bg: "#FEF3C7", color: "#B45309" },
  { href: "parent/uniform", label: "Uniform", icon: Shirt, bg: "#E0E7FF", color: "#4F46E5" },
  { href: "parent/books", label: "Books", icon: BookOpen, bg: "#FEF9C3", color: "#CA8A04" },
  { href: "parent/hobby-club", label: "Hobby Club", icon: GraduationCap, bg: "#DCFCE7", color: "#16A34A" },
  { href: "parent/elective", label: "Elective", icon: BookOpen, bg: "#CFFAFE", color: "#0891B2" },
  { href: "parent/attendance", label: "Attendance", icon: GraduationCap, bg: "#F3E8FF", color: "#7C3AED" },
  { href: "parent/announcements", label: "News", icon: Megaphone, bg: "#DCFCE7", color: "#16A34A" },
] as const;

const ANN_ICON_STYLES = [
  { bg: "#FFEDD5", color: "#EA580C", Icon: Megaphone },
  { bg: "#FEF9C3", color: "#CA8A04", Icon: Calendar },
  { bg: "#DCFCE7", color: "#16A34A", Icon: Calendar },
] as const;

export function ParentDashboardPage({
  ctx,
  data,
}: {
  ctx: SiteContext;
  data: ParentDashboardData;
}) {
  const router = useRouter();
  const activeId = data.activeChildId ?? data.children[0]?.id;
  const child = data.children.find((c) => c.id === activeId) ?? data.children[0];
  const exams = data.exams.slice(0, 2);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[28px] font-bold leading-tight tracking-tight text-[#111827]">
          Welcome, {data.session.fullName}
        </h2>
        <div className="flex items-center gap-3">
          {data.children.length > 1 ? (
            <select
              className="rounded-full border border-[#E5E7EB] bg-white px-3.5 py-2 text-sm font-medium text-[#374151] shadow-sm"
              value={activeId ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                router.push(ctx.sitePath(`parent/dashboard?child=${id}`));
              }}
            >
              {data.children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.className})
                </option>
              ))}
            </select>
          ) : child ? (
            <Link
              href={ctx.sitePath("parent/children")}
              className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3.5 py-2 text-sm font-medium text-[#374151] shadow-sm"
            >
              {child.name} ({child.className})
            </Link>
          ) : null}
          <SeniorsHeaderActions
            ctx={ctx}
            role="parent"
            displayName={data.session.fullName}
          />
        </div>
      </div>

      {!child ? (
        <SeniorsCard pastel="pink" className="p-5">
          <p className="font-semibold text-[#111827]">No linked children</p>
          <p className="mt-1 text-sm text-[#6B7280]">
            Ask the school admin to link your account to a student.
          </p>
        </SeniorsCard>
      ) : null}

      {child ? (
        <SeniorsCard pastel="purple" className="p-5">
          <h3 className="text-sm font-semibold text-[#6B7280]">Quick Access</h3>
          <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-8">
            {QUICK_ACCESS.map((item) => (
              <Link
                key={item.href}
                href={ctx.sitePath(
                  `${item.href}${activeId ? `?child=${activeId}` : ""}`,
                )}
                className="flex flex-col items-center gap-2 rounded-xl p-2 transition hover:bg-[#F9FAFB]"
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: item.bg, color: item.color }}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-center text-[10px] font-medium leading-tight text-[#374151] sm:text-xs">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </SeniorsCard>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <SeniorsCard pastel="blue" className="p-4">
          <p className="text-xs font-medium text-[#6B7280]">Overall Progress</p>
          <div className="mt-1 flex items-end justify-between gap-2">
            <div>
              <p className="text-3xl font-bold tracking-tight text-[#111827]">
                {data.progress.percent}%
              </p>
              <p className="mt-1 text-xs text-[#6B7280]">
                ({data.progress.topicsCompleted} / {data.progress.topicsTotal} Topics Completed)
              </p>
            </div>
            <Sparkline color="#2563EB" />
          </div>
        </SeniorsCard>

        <SeniorsCard pastel="green" className="p-4">
          <p className="text-xs font-medium text-[#6B7280]">Average Test Score</p>
          <div className="mt-1 flex items-end justify-between gap-2">
            <div>
              <p className="text-3xl font-bold tracking-tight text-[#111827]">
                {data.progress.testAverage}%
              </p>
              <p className="mt-1 text-xs text-[#6B7280]">(Last 5 Tests)</p>
            </div>
            <Sparkline color="#16A34A" />
          </div>
        </SeniorsCard>

        <SeniorsCard className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[#6B7280]">Upcoming Exams</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-[#111827]">
                {data.exams.length}
              </p>
              <p className="mt-1 text-xs text-[#6B7280]">Scheduled</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEE2E2] text-[#DC2626]">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
        </SeniorsCard>

        <Link href={ctx.sitePath(`parent/homework${activeId ? `?child=${activeId}` : ""}`)}>
          <SeniorsCard pastel="orange" className="p-4 transition hover:border-[#2563EB]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-[#6B7280]">Homework Due</p>
                <p className="mt-1.5 text-3xl font-bold tracking-tight text-[#111827]">
                  {data.homeworkDue}
                </p>
                <p className="mt-1 text-xs text-[#2563EB]">View classwork →</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFEDD5] text-[#EA580C]">
                <ClipboardList className="h-5 w-5" />
              </div>
            </div>
          </SeniorsCard>
        </Link>

        <Link href={ctx.sitePath(`parent/attendance${activeId ? `?child=${activeId}` : ""}`)}>
          <SeniorsCard className="p-4 transition hover:border-[#7C3AED]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-[#6B7280]">Attendance</p>
                <p className="mt-1.5 text-3xl font-bold tracking-tight text-[#111827]">
                  {data.attendancePercent ?? 0}%
                </p>
                <p className="mt-1 text-xs text-[#7C3AED]">This month →</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#7C3AED]">
                <GraduationCap className="h-5 w-5" />
              </div>
            </div>
          </SeniorsCard>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={ctx.sitePath("parent/announcements")}>
          <SeniorsCard pastel="green" className="flex items-center justify-between p-4 transition hover:border-[#16A34A]">
            <div>
              <p className="text-sm font-semibold text-[#111827]">School Announcements</p>
              <p className="mt-1 text-xs text-[#6B7280]">
                {data.announcementCount ?? data.announcements.length} recent updates
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#16A34A]">
              <Megaphone className="h-5 w-5" />
            </div>
          </SeniorsCard>
        </Link>
        <Link href={ctx.sitePath(`parent/calendar${activeId ? `?child=${activeId}` : ""}`)}>
          <SeniorsCard className="flex items-center justify-between p-4 transition hover:border-[#0891B2]">
            <div>
              <p className="text-sm font-semibold text-[#111827]">Events & Calendar</p>
              <p className="mt-1 text-xs text-[#6B7280]">
                {data.exams.length} upcoming exams
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#CFFAFE] text-[#0891B2]">
              <Calendar className="h-5 w-5" />
            </div>
          </SeniorsCard>
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <SeniorsCard pastel="blue" className="p-5">
          <h3 className="text-base font-bold text-[#111827]">Subject Wise Progress</h3>
          <ul className="mt-4 space-y-4">
            {data.subjectProgress.length === 0 ? (
              <li className="text-sm text-[#6B7280]">No subject progress yet.</li>
            ) : (
              data.subjectProgress.map((s) => (
                <li key={s.name}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-[#111827]">{s.name}</span>
                    <span className="text-xs text-[#6B7280]">
                      {s.completed} / {s.total} Topics
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
                    <div
                      className="h-full rounded-full bg-[#2563EB]"
                      style={{ width: `${s.percent}%` }}
                    />
                  </div>
                </li>
              ))
            )}
          </ul>
        </SeniorsCard>

        <SeniorsCard className="p-5">
          <h3 className="text-base font-bold text-[#111827]">Upcoming Exams</h3>
          <ul className="mt-4 space-y-3">
            {exams.length === 0 ? (
              <li className="text-sm text-[#6B7280]">No upcoming exams.</li>
            ) : (
              exams.map((e) => (
                <li
                  key={e.id}
                  className="flex items-start gap-3 rounded-xl border border-[#E5E7EB] px-3.5 py-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FEE2E2] text-[#DC2626]">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">{e.title}</p>
                    <p className="text-xs text-[#6B7280]">
                      {e.daysLeft} days left • {formatDate(e.examAt)}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </SeniorsCard>

        <SeniorsCard pastel="green" className="p-5">
          <h3 className="text-base font-bold text-[#111827]">School Announcements</h3>
          <ul className="mt-4 space-y-3">
            {data.announcements.length === 0 ? (
              <li className="text-sm text-[#6B7280]">No announcements yet.</li>
            ) : (
              data.announcements.slice(0, 3).map((a, i) => {
                const style = ANN_ICON_STYLES[i % ANN_ICON_STYLES.length];
                return (
                  <li key={a.id} className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: style.bg, color: style.color }}
                    >
                      <style.Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{a.title}</p>
                      <p className="text-xs text-[#6B7280]">
                        {formatDate(a.publishedAt)}
                      </p>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
          <Link
            href={ctx.sitePath("parent/announcements")}
            className="mt-4 inline-block text-sm font-medium text-[#2563EB] hover:underline"
          >
            View all →
          </Link>
        </SeniorsCard>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-[#EFF6FF] p-4 text-sm text-[#1E40AF]">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Progress reflects topics your child has completed and quiz scores from school content.
      </div>
    </div>
  );
}
