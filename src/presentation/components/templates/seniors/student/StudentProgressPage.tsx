"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Atom,
  BarChart3,
  BookOpen,
  Calculator,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Globe2,
  Languages,
} from "lucide-react";
import type { SiteContext } from "@/application/hooks/use-site-context";
import type { SeniorsSubjectSummary } from "@/domain/seniors/types";
import {
  StudentEmptyState,
  StudentLiftCard,
  StudentPageHero,
} from "@/presentation/components/templates/seniors/student/StudentPageChrome";
import {
  ChapterBarChart,
  ProgressDonut,
  SubjectBarChart,
} from "@/presentation/components/templates/seniors/student/StudentProgressCharts";
import { cn } from "@/shared/lib/utils";

function titleCaseName(name: string) {
  const t = name.trim();
  if (!t) return t;
  if (t === t.toLowerCase() || t === t.toUpperCase()) {
    return t
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }
  return t;
}

function subjectVisual(name: string) {
  const n = name.toLowerCase();
  if (n.includes("math")) return { Icon: Calculator, tint: "#60A5FA" };
  if (n.includes("science") || n.includes("sci") || n.includes("chem") || n.includes("bio") || n.includes("phy")) {
    return { Icon: FlaskConical, tint: "#34D399" };
  }
  if (n.includes("english") || n.includes("hindi") || n.includes("language")) {
    return { Icon: Languages, tint: "#FBBF24" };
  }
  if (n.includes("social") || n.includes("history") || n.includes("geo") || n.includes("civics")) {
    return { Icon: Globe2, tint: "#818CF8" };
  }
  if (n.includes("computer") || n.includes("it")) return { Icon: Atom, tint: "#C084FC" };
  return { Icon: BookOpen, tint: "var(--sp-accent, #1a4696)" };
}

function subjectTotals(s: SeniorsSubjectSummary) {
  const topicsTotal = s.chapters.reduce((n, ch) => n + ch.topicCount, 0);
  const topicsCompleted = s.chapters.reduce((n, ch) => n + ch.completedCount, 0);
  const percent =
    topicsTotal === 0 ? 0 : Math.round((topicsCompleted / topicsTotal) * 100);
  return { topicsTotal, topicsCompleted, percent };
}

export function StudentProgressPage({
  ctx,
  subjects,
  progressSummary,
}: {
  ctx: SiteContext;
  subjects: SeniorsSubjectSummary[];
  progressSummary?: {
    percent: number;
    topicsCompleted: number;
    topicsTotal: number;
    testAverage: number;
  };
}) {
  const rows = useMemo(
    () =>
      subjects.map((s) => {
        const totals = subjectTotals(s);
        return {
          id: s.id,
          label: titleCaseName(s.name),
          color: subjectVisual(s.name).tint,
          ...totals,
          subject: s,
        };
      }),
    [subjects],
  );
  const weak = rows.find((x) => x.topicsTotal > 0 && x.percent < 70) ?? null;
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(subjects.slice(0, 1).map((s) => s.id)),
  );
  const topicPercent =
    !progressSummary || progressSummary.topicsTotal === 0
      ? 0
      : Math.round((progressSummary.topicsCompleted / progressSummary.topicsTotal) * 100);

  function toggleSubject(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-8">
      <StudentPageHero
        icon={BarChart3}
        title="Progress"
        subtitle="Coverage charts across your school syllabus."
        meta={
          <Link
            href={ctx.sitePath("student/learn")}
            className="inline-flex items-center gap-1 text-sm font-semibold"
            style={{ color: "var(--sp-accent, #1a4696)" }}
          >
            Continue learning
            <ChevronRight className="h-4 w-4" />
          </Link>
        }
      />

      {progressSummary ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <StudentLiftCard className="p-5 sm:p-6" lift={false}>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: "var(--sp-muted, #6B7280)" }}
            >
              Overview
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 sm:gap-8">
              <ProgressDonut
                percent={progressSummary.percent}
                label="Syllabus"
                caption="Overall coverage"
              />
              <ProgressDonut
                percent={topicPercent}
                size={112}
                stroke={10}
                label="Topics"
                caption={`${progressSummary.topicsCompleted} of ${progressSummary.topicsTotal}`}
                color="#34D399"
              />
              <ProgressDonut
                percent={progressSummary.testAverage}
                size={112}
                stroke={10}
                label="Tests"
                caption="Graded average"
                color="#60A5FA"
              />
            </div>
          </StudentLiftCard>

          <StudentLiftCard className="p-5 sm:p-6" lift={false}>
            <div className="flex items-baseline justify-between gap-3">
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: "var(--sp-muted, #6B7280)" }}
              >
                By subject
              </p>
              <p className="text-xs" style={{ color: "var(--sp-muted-2, #9CA3AF)" }}>
                Coverage %
              </p>
            </div>
            <div className="mt-3">
              {rows.length === 0 ? (
                <p className="py-10 text-sm" style={{ color: "var(--sp-muted, #6B7280)" }}>
                  No subjects to chart yet.
                </p>
              ) : (
                <SubjectBarChart
                  rows={rows.map((row) => ({
                    id: row.id,
                    label: row.label,
                    percent: row.percent,
                    color: row.color,
                  }))}
                />
              )}
            </div>
          </StudentLiftCard>
        </div>
      ) : null}

      {weak ? (
        <Link
          href={ctx.sitePath("student/learn")}
          className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm"
          style={{
            backgroundColor: "var(--sp-surface, #ffffff)",
            borderColor: "var(--sp-border, #E8EEF5)",
            color: "var(--sp-text, #1F2937)",
          }}
        >
          <span>
            <span className="font-semibold" style={{ color: "var(--sp-text-strong, #111827)" }}>
              Focus next · {titleCaseName(weak.label)}
            </span>
            <span className="mt-0.5 block text-xs" style={{ color: "var(--sp-muted, #6B7280)" }}>
              Lowest coverage at {weak.percent}%
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "var(--sp-muted, #6B7280)" }} />
        </Link>
      ) : null}

      {subjects.length === 0 ? (
        <StudentEmptyState
          title="No subjects yet"
          description="Your school is still setting up the syllabus. Check back soon."
        />
      ) : (
        <section className="space-y-3">
          <h2
            className="text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "var(--sp-muted, #6B7280)" }}
          >
            Chapter breakdown
          </h2>

          <StudentLiftCard className="overflow-hidden p-0" lift={false}>
            <ul>
              {rows.map((row, index) => {
                const { Icon } = subjectVisual(row.subject.name);
                const open = openIds.has(row.id);
                return (
                  <li
                    key={row.id}
                    className={cn(index > 0 && "border-t")}
                    style={{ borderColor: "var(--sp-border, #E8EEF5)" }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSubject(row.id)}
                      className="flex w-full items-center gap-3 px-5 py-4 text-left"
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: "var(--sp-surface-3, #F3F6FB)",
                          color: row.color,
                        }}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span
                          className="truncate text-sm font-semibold"
                          style={{ color: "var(--sp-text-strong, #111827)" }}
                        >
                          {row.label}
                        </span>
                        <span
                          className="truncate text-xs"
                          style={{ color: "var(--sp-muted, #6B7280)" }}
                        >
                          {row.topicsCompleted}/{row.topicsTotal} topics · {row.subject.chapters.length}{" "}
                          {row.subject.chapters.length === 1 ? "ch" : "chs"}
                        </span>
                      </span>
                      <span
                        className="shrink-0 text-sm font-semibold tabular-nums"
                        style={{ color: "var(--sp-text-strong, #111827)" }}
                      >
                        {row.percent}%
                      </span>
                      <ChevronDown
                        className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
                        style={{ color: "var(--sp-muted-2, #9CA3AF)" }}
                      />
                    </button>
                    {open ? (
                      <div className="space-y-4 px-5 pb-5">
                        {row.subject.chapters.length === 0 || row.topicsTotal === 0 ? (
                          <p className="text-xs" style={{ color: "var(--sp-muted, #6B7280)" }}>
                            Syllabus not published yet.
                          </p>
                        ) : (
                          <ChapterBarChart chapters={row.subject.chapters} />
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </StudentLiftCard>
        </section>
      )}
    </div>
  );
}
