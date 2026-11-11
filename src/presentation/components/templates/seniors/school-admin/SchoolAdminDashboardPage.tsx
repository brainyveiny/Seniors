"use client";

import Link from "next/link";
import {
  Inbox,
  UserCheck,
  Users,
} from "lucide-react";
import type { SiteContext } from "@/application/hooks/use-site-context";
import {
  SeniorsCard,
  SeniorsKpiCard,
  SeniorsPastelPill,
} from "@/presentation/components/templates/seniors/shared/SeniorsUi";
import { SeniorsHeaderActions } from "@/presentation/components/templates/seniors/shared/SeniorsHeaderActions";

export type SchoolAdminDashboardData = {
  adminName: string;
  schoolName: string;
  pendingEnquiries: number;
  stats: {
    totalStudents: number;
    totalTeachers: number;
    parentAdoption: number;
    platformUsage: number;
  };
  coverage: {
    complete: number;
    inProgress: number;
    missing: number;
    completeCount: number;
    inProgressCount: number;
    missingCount: number;
    totalTopics: number;
  };
  usageSeries: {
    labels: string[];
    students: number[];
    teachers: number[];
  };
};

function Sparkline({ color }: { color: string }) {
  return (
    <svg width="72" height="28" viewBox="0 0 72 28" fill="none" aria-hidden>
      <path
        d="M1 22 C8 20, 12 10, 20 14 C28 18, 32 6, 40 10 C48 14, 54 4, 62 7 C66 9, 68 5, 71 3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M1 22 C8 20, 12 10, 20 14 C28 18, 32 6, 40 10 C48 14, 54 4, 62 7 C66 9, 68 5, 71 3 L71 28 L1 28 Z"
        fill={color}
        opacity="0.12"
      />
    </svg>
  );
}

function formatNumber(n: number) {
  return n.toLocaleString("en-IN");
}

function niceMax(value: number) {
  if (value <= 0) return 5;
  const padded = value * 1.25;
  const magnitude = 10 ** Math.floor(Math.log10(padded));
  const normalized = padded / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function TeachersActiveChart({
  labels,
  teachers,
}: {
  labels: string[];
  teachers: number[];
}) {
  const w = 560;
  const h = 220;
  const pad = { t: 16, r: 16, b: 36, l: 44 };
  const peak = Math.max(0, ...teachers);
  const maxY = niceMax(peak);
  const minY = 0;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const tickCount = 5;

  const toX = (i: number) => pad.l + (i / Math.max(labels.length - 1, 1)) * innerW;
  const toY = (v: number) => pad.t + innerH - ((v - minY) / (maxY - minY)) * innerH;

  const path = teachers
    .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
    .join(" ");

  const area =
    teachers.length > 0
      ? `${path} L ${toX(teachers.length - 1).toFixed(1)} ${toY(0).toFixed(1)} L ${toX(0).toFixed(1)} ${toY(0).toFixed(1)} Z`
      : "";

  const yTicks = [
    ...new Set(
      Array.from({ length: tickCount + 1 }, (_, i) =>
        Math.round((maxY / tickCount) * i),
      ),
    ),
  ];

  const gridStroke = "var(--sp-border, #F3F4F6)";
  const labelFill = "var(--sp-muted-2, #9CA3AF)";

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-auto w-full"
      role="img"
      aria-label="How much teachers are active"
    >
      {yTicks.map((t, i) => (
        <g key={`y-${i}-${t}`}>
          <line
            x1={pad.l}
            x2={w - pad.r}
            y1={toY(t)}
            y2={toY(t)}
            stroke={gridStroke}
            strokeWidth="1"
          />
          <text
            x={pad.l - 8}
            y={toY(t) + 4}
            textAnchor="end"
            fill={labelFill}
            fontSize="10"
          >
            {t}
          </text>
        </g>
      ))}
      {area ? <path d={area} fill="#71717A" opacity="0.08" /> : null}
      <path
        d={path}
        fill="none"
        stroke="#52525B"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {teachers.map((v, i) => (
        <circle
          key={`pt-${i}`}
          cx={toX(i)}
          cy={toY(v)}
          r="3"
          fill="#52525B"
          stroke="var(--sp-surface, #fff)"
          strokeWidth="2"
        />
      ))}
      {labels.map((label, i) =>
        i % 2 === 0 || i === labels.length - 1 ? (
          <text
            key={label + i}
            x={toX(i)}
            y={h - 10}
            textAnchor="middle"
            fill={labelFill}
            fontSize="10"
          >
            {label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function CoverageDonut({
  complete,
  inProgress,
  missing,
  totalTopics,
}: {
  complete: number;
  inProgress: number;
  missing: number;
  totalTopics: number;
}) {
  const size = 168;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const completeLen = (complete / 100) * c;
  const inProgressLen = (inProgress / 100) * c;
  const missingLen = (missing / 100) * c;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#FEE2E2" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#22C55E"
          strokeWidth={stroke}
          strokeDasharray={`${completeLen} ${c - completeLen}`}
          strokeDashoffset={0}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#FACC15"
          strokeWidth={stroke}
          strokeDasharray={`${inProgressLen} ${c - inProgressLen}`}
          strokeDashoffset={-completeLen}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#F87171"
          strokeWidth={stroke}
          strokeDasharray={`${missingLen} ${c - missingLen}`}
          strokeDashoffset={-(completeLen + inProgressLen)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[11px] font-medium text-[#6B7280]">Total Topics</p>
        <p className="text-lg font-bold text-[#111827]">{formatNumber(totalTopics)}</p>
      </div>
    </div>
  );
}

export function SchoolAdminDashboardPage({
  ctx,
  data,
}: {
  ctx: SiteContext;
  data: SchoolAdminDashboardData;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[28px] font-bold leading-tight tracking-tight text-[#111827]">
          Welcome, {data.adminName}
        </h2>
        <div className="flex items-center gap-3">
          <SeniorsHeaderActions
            ctx={ctx}
            role="school-admin"
            displayName={data.adminName}
            subtitle={data.schoolName}
          />
        </div>
      </div>

      {data.pendingEnquiries > 0 ? (
        <Link
          href={ctx.sitePath("school-admin/enquiries")}
          className="block rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 transition hover:bg-[#FEE2E2]"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#DC2626]">
              <Inbox className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#B91C1C]">
                Action required: {data.pendingEnquiries} pending{" "}
                {data.pendingEnquiries === 1 ? "enquiry" : "enquiries"}
              </p>
              <p className="mt-0.5 text-sm text-[#7F1D1D]">
                New student/teacher signup requests are waiting for approve or reject.
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-[#DC2626]">
              Review →
            </span>
          </div>
        </Link>
      ) : null}

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SeniorsKpiCard
          label="Total Students"
          value={formatNumber(data.stats.totalStudents)}
          pastel="blue"
          icon={<Users className="h-5 w-5" />}
        />
        <SeniorsKpiCard
          label="Total Teachers"
          value={formatNumber(data.stats.totalTeachers)}
          pastel="green"
          icon={<UserCheck className="h-5 w-5" />}
        />
        <SeniorsKpiCard
          label="Platform Usage"
          value={`${data.stats.platformUsage}%`}
          subtext="This Month"
          pastel="purple"
          trend={<Sparkline color="#7C3AED" />}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <SeniorsCard pastel="green" className="flex h-full flex-col p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                How much teachers are active
              </h3>
              <p className="mt-1 text-3xl font-bold tracking-tight text-[#111827]">
                {formatNumber(data.stats.totalTeachers)}
                <span className="ml-2 text-sm font-medium text-[#6B7280]">
                  active now
                </span>
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#6B7280]">
              <span className="h-2 w-2 rounded-full bg-[#16A34A]" /> Teachers
            </span>
          </div>
          <div className="mt-auto">
            <TeachersActiveChart
              labels={data.usageSeries.labels}
              teachers={data.usageSeries.teachers}
            />
          </div>
        </SeniorsCard>

        <SeniorsCard pastel="peach" className="flex h-full flex-col p-5">
          <h3 className="text-base font-bold text-[var(--sp-text-strong,#111827)]">
            Content Coverage (By Topics)
          </h3>
          <div className="mt-5 flex flex-1 flex-col items-center justify-center gap-6 sm:flex-row sm:items-center">
            <CoverageDonut
              complete={data.coverage.complete}
              inProgress={data.coverage.inProgress}
              missing={data.coverage.missing}
              totalTopics={data.coverage.totalTopics}
            />
            <div className="w-full space-y-2.5 sm:w-auto sm:min-w-[220px]">
              <SeniorsPastelPill
                pastel="green"
                label="Complete"
                value={`${formatNumber(data.coverage.completeCount)} (${data.coverage.complete}%)`}
              />
              <SeniorsPastelPill
                pastel="orange"
                label="In Progress"
                value={`${formatNumber(data.coverage.inProgressCount)} (${data.coverage.inProgress}%)`}
              />
              <SeniorsPastelPill
                pastel="pink"
                label="Missing"
                value={`${formatNumber(data.coverage.missingCount)} (${data.coverage.missing}%)`}
              />
            </div>
          </div>
          <div className="mt-auto flex justify-end pt-5">
            <Link
              href={ctx.sitePath("school-admin/content")}
              className="text-sm font-medium text-[var(--sp-brand-text)] hover:underline"
            >
              View detailed report →
            </Link>
          </div>
        </SeniorsCard>
      </div>
    </div>
  );
}
