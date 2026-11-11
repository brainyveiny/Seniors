"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  FileStack,
  Target,
  X,
} from "lucide-react";
import type { SiteContext } from "@/application/hooks/use-site-context";
import type { SeniorsExamItem, SeniorsQuizQuestion, StudentPracticeTopic } from "@/domain/seniors/types";
import { formatDate } from "@/shared/lib/format-date";
import {
  StudentEmptyState,
  StudentLiftCard,
  StudentPageHero,
  STUDENT_ACCENT,
  STUDENT_ACCENT_SOFT,
  daysLeftPill,
} from "@/presentation/components/templates/seniors/student/StudentPageChrome";
import { StudentQuizPanel } from "@/presentation/components/templates/seniors/student/StudentHomeworkClients";
import { pingSeniorsGamification } from "@/presentation/components/templates/seniors/gamification/ping-seniors-gamification";

type PracticeQuizItem = {
  topicId: string;
  slug: string;
  title: string;
  subjectName: string;
  quiz: { id: string; title: string; questions: SeniorsQuizQuestion[] } | null;
};

type SessionResult = {
  topicId: string;
  title: string;
  score: number;
  maxScore: number;
  skipped?: boolean;
};

const OTHER_TOOLS = [
  {
    id: "papers" as const,
    title: "Previous papers",
    description: "Revision notes and previous-paper style material.",
    Icon: FileStack,
    cta: "Open",
  },
  {
    id: "mock" as const,
    title: "Mock practice",
    description: "Jump into a topic quiz for timed-style practice.",
    Icon: ClipboardList,
    cta: "Open quiz",
  },
] as const;

export function StudentExamPrepPage({
  ctx,
  exams,
  weakTopics = [],
  practiceTopics = [],
  papersHref = "student/learn",
  mockHref = "student/learn",
}: {
  ctx: SiteContext;
  exams: SeniorsExamItem[];
  weakTopics?: StudentPracticeTopic[];
  practiceTopics?: StudentPracticeTopic[];
  papersHref?: string;
  mockHref?: string;
}) {
  useEffect(() => {
    void pingSeniorsGamification(ctx.tenant, "exam");
  }, [ctx.tenant]);

  const upcoming = exams.filter((e) => e.daysLeft >= 0);
  const countLabel =
    upcoming.length === 0
      ? "No exams scheduled"
      : upcoming.length === 1
        ? "1 exam coming up"
        : `${upcoming.length} exams coming up`;

  const suggestedIds = useMemo(
    () => new Set(weakTopics.map((t) => t.id)),
    [weakTopics],
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [sessionItems, setSessionItems] = useState<PracticeQuizItem[] | null>(
    null,
  );
  const [sessionIndex, setSessionIndex] = useState(0);
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sessionItems) setPickerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerOpen, sessionItems]);

  function openPicker() {
    const defaults =
      weakTopics.length > 0
        ? weakTopics.map((t) => t.id)
        : practiceTopics.filter((t) => t.hasQuiz).slice(0, 5).map((t) => t.id);
    setSelectedIds(defaults);
    setShowAll(weakTopics.length === 0);
    setSessionError("");
    setPickerOpen(true);
  }

  function toggleId(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const listForPicker = showAll ? practiceTopics : weakTopics;

  async function startPractice() {
    if (selectedIds.length === 0) return;
    setLoadingSession(true);
    setSessionError("");
    try {
      const res = await fetch(
        `/api/tenants/${encodeURIComponent(ctx.tenant)}/seniors/practice-quizzes?topicIds=${encodeURIComponent(selectedIds.join(","))}`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        items?: PracticeQuizItem[];
        error?: string;
      };
      if (!res.ok || !json.items) {
        throw new Error(json.error || "Failed to load practice");
      }
      if (json.items.length === 0) {
        throw new Error("No selected topics available for practice");
      }
      setSessionItems(json.items);
      setSessionIndex(0);
      setSessionResults([]);
      setSummaryOpen(false);
      setPickerOpen(false);
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setLoadingSession(false);
    }
  }

  const current = sessionItems?.[sessionIndex] ?? null;

  function closeSession() {
    setSessionItems(null);
    setSessionIndex(0);
    setSessionResults([]);
    setSummaryOpen(false);
  }

  function finishAndShowSummary(result: SessionResult) {
    setSessionResults((prev) => [...prev, result]);
    setSessionItems(null);
    setSessionIndex(0);
    setSummaryOpen(true);
  }

  function handleQuizContinue(score: number, maxScore: number) {
    if (!current || !sessionItems) return;
    const entry: SessionResult = {
      topicId: current.topicId,
      title: current.title,
      score,
      maxScore,
    };
    if (sessionIndex + 1 >= sessionItems.length) {
      finishAndShowSummary(entry);
      return;
    }
    setSessionResults((prev) => [...prev, entry]);
    setSessionIndex((i) => i + 1);
  }

  function skipNotesOnly() {
    if (!current || !sessionItems) return;
    const entry: SessionResult = {
      topicId: current.topicId,
      title: current.title,
      score: 0,
      maxScore: 0,
      skipped: true,
    };
    if (sessionIndex + 1 >= sessionItems.length) {
      finishAndShowSummary(entry);
      return;
    }
    setSessionResults((prev) => [...prev, entry]);
    setSessionIndex((i) => i + 1);
  }

  return (
    <div className="space-y-6">
      <StudentPageHero
        icon={CalendarDays}
        title="Exam Prep"
        subtitle="Revision mode using your school's content."
        meta={
          <span
            className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: STUDENT_ACCENT_SOFT, color: STUDENT_ACCENT }}
          >
            {countLabel}
          </span>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-[#374151]">
              Upcoming exams
            </h2>
            <span className="rounded-md bg-[#F3F4F6] px-1.5 py-0.5 text-[11px] font-medium text-[#6B7280]">
              {exams.length}
            </span>
          </div>

          {exams.length === 0 ? (
            <StudentEmptyState
              title="No upcoming exams"
              description="When your school schedules unit tests, they will show up here with countdown pills."
            />
          ) : (
            <ol className="relative space-y-3 border-l-2 border-[var(--sp-brand-border)] pl-5">
              {exams.map((exam, i) => {
                const pill = daysLeftPill(exam.daysLeft);
                return (
                  <li key={exam.id} className="relative">
                    <span
                      className="absolute -left-[1.55rem] top-5 flex h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm"
                      style={{
                        backgroundColor: i === 0 ? STUDENT_ACCENT : "var(--sp-brand-border)",
                      }}
                    />
                    <StudentLiftCard className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                            style={{
                              backgroundColor: STUDENT_ACCENT_SOFT,
                              color: STUDENT_ACCENT,
                            }}
                          >
                            <CalendarDays className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#111827]">{exam.title}</p>
                            {exam.subjectName ? (
                              <p className="mt-0.5 text-sm text-[#6B7280]">
                                {exam.subjectName}
                              </p>
                            ) : null}
                            <p className="mt-1 text-xs text-[#9CA3AF]">
                              {formatDate(exam.examAt)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${pill.className}`}
                        >
                          {pill.label}
                        </span>
                      </div>
                    </StudentLiftCard>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-[#374151]">
              Practice
            </h2>
            {weakTopics.length > 0 ? (
              <span className="text-xs text-[#9CA3AF]">
                {weakTopics.length} to review
              </span>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
            <button
              type="button"
              onClick={openPicker}
              className="group flex w-full items-center gap-3 border-b border-[#F3F4F6] px-4 py-3.5 text-left transition hover:bg-[#F8FAFC]"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: STUDENT_ACCENT_SOFT, color: STUDENT_ACCENT }}
              >
                <Target className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[#111827]">
                    Weak topics
                  </span>
                  {weakTopics.length > 0 ? (
                    <span className="rounded border border-[#E5E7EB] bg-[#F9FAFB] px-1.5 py-0.5 text-[10px] font-medium text-[#6B7280]">
                      {weakTopics.length} suggested
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-[#6B7280]">
                  Choose topics and run a focused quiz session
                </span>
              </span>
              <span
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold"
                style={{ color: STUDENT_ACCENT }}
              >
                Start
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </button>

            {OTHER_TOOLS.map((tool, i) => {
              const href =
                tool.id === "papers"
                  ? papersHref
                  : tool.id === "mock"
                    ? mockHref
                    : "student/learn";
              return (
                <Link
                  key={tool.id}
                  href={ctx.sitePath(href)}
                  className={`group flex items-center gap-3 px-4 py-3.5 transition hover:bg-[#F8FAFC] ${
                    i < OTHER_TOOLS.length - 1 ? "border-b border-[#F3F4F6]" : ""
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#4B5563]">
                    <tool.Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#111827]">
                      {tool.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-[#6B7280]">
                      {tool.description}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#9CA3AF] group-hover:text-[#4B5563]">
                    {tool.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      {pickerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4"
          role="presentation"
          onClick={() => setPickerOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select weak topics"
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#F3F4F6] px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[#111827]">
                  Select topics to practice
                </p>
                <p className="mt-0.5 text-xs text-[#6B7280]">
                  Suggested weak topics are pre-selected. Add more anytime.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-[#6B7280] hover:bg-[#F3F4F6]"
                onClick={() => setPickerOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 border-b border-[#F3F4F6] px-5 py-2.5">
              <p className="text-xs font-medium text-[#6B7280]">
                {selectedIds.length} selected
              </p>
              <button
                type="button"
                className="text-xs font-semibold text-[var(--sp-brand-text)] hover:underline"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? "Show suggested only" : "Browse all topics"}
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
              {listForPicker.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-[#6B7280]">
                  {showAll
                    ? "No topics in your syllabus yet."
                    : "No weak topics right now -browse all topics to practice."}
                </p>
              ) : (
                listForPicker.map((topic) => {
                  const checked = selectedIds.includes(topic.id);
                  return (
                    <label
                      key={topic.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 ${
                        checked ? "bg-[var(--sp-brand-soft)]" : "hover:bg-[#F9FAFB]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={() => toggleId(topic.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-medium text-[#111827]">
                            {topic.number ? `${topic.number} ` : ""}
                            {topic.title}
                          </span>
                          {suggestedIds.has(topic.id) ? (
                            <span className="rounded border border-[#E5E7EB] bg-[#F9FAFB] px-1.5 py-0.5 text-[10px] font-medium text-[#6B7280]">
                              Suggested
                            </span>
                          ) : null}
                          {!topic.hasQuiz ? (
                            <span className="rounded bg-[#F3F4F6] px-1.5 py-0.5 text-[10px] font-semibold text-[#6B7280]">
                              Notes only
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs text-[#9CA3AF]">
                          {topic.subjectName}
                          {topic.chapterName ? ` · ${topic.chapterName}` : ""}
                          {topic.reason ? ` · ${topic.reason}` : ""}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            {sessionError ? (
              <p className="px-5 pb-2 text-sm text-[#DC2626]">{sessionError}</p>
            ) : null}

            <div className="flex flex-wrap gap-2 border-t border-[#F3F4F6] px-5 py-4">
              <button
                type="button"
                className="rounded-lg bg-[var(--sp-brand)] px-4 py-2 text-sm font-semibold text-[var(--sp-on-brand)] hover:bg-[var(--sp-brand-hover)] disabled:opacity-60"
                disabled={selectedIds.length === 0 || loadingSession}
                onClick={() => void startPractice()}
              >
                {loadingSession ? "Loading…" : "Start practice"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
                onClick={() => setPickerOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {sessionItems && current ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0F172A]/50 p-3 sm:p-6">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#9CA3AF]">
                  {sessionIndex + 1} of {sessionItems.length}
                  {current.subjectName ? ` · ${current.subjectName}` : ""}
                </p>
                <p className="truncate text-base font-semibold tracking-tight text-[#111827]">
                  {current.title}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md p-2 text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151]"
                onClick={closeSession}
                aria-label="Exit practice"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {current.quiz ? (
                <StudentQuizPanel
                  key={current.quiz.id}
                  quiz={current.quiz}
                  autoStart
                  skipLastAttempt
                  embedded
                  continueLabel={
                    sessionIndex + 1 >= sessionItems.length
                      ? "Finish"
                      : "Next topic"
                  }
                  onContinue={({ score, maxScore }) =>
                    handleQuizContinue(score, maxScore)
                  }
                />
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm font-semibold text-[#111827]">
                    No quiz on this topic yet
                  </p>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    Open notes in Learn, then continue.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <Link
                      href={ctx.sitePath(`student/learn/${current.slug}`)}
                      className="rounded-lg bg-[var(--sp-brand)] px-4 py-2 text-sm font-semibold text-[var(--sp-on-brand)] hover:bg-[#163a7a]"
                    >
                      Open notes
                    </Link>
                    <button
                      type="button"
                      className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
                      onClick={skipNotesOnly}
                    >
                      {sessionIndex + 1 >= sessionItems.length
                        ? "Finish"
                        : "Next"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {summaryOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0F172A]/45 p-4"
          role="presentation"
          onClick={closeSession}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Practice summary"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[#F3F4F6] px-5 py-4">
              <p className="text-sm font-semibold text-[#111827]">
                Practice complete
              </p>
              <p className="mt-0.5 text-xs text-[#6B7280]">
                {sessionResults.filter((r) => !r.skipped).length} quiz
                {sessionResults.filter((r) => !r.skipped).length === 1
                  ? ""
                  : "zes"}{" "}
                attempted
              </p>
            </div>
            <ul className="max-h-[50vh] divide-y divide-[#F3F4F6] overflow-y-auto">
              {sessionResults.map((r) => (
                <li
                  key={r.topicId}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-[#111827]">
                    {r.title}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--sp-brand-text)]">
                    {r.skipped
                      ? "Notes"
                      : `${r.score}/${r.maxScore} (${Math.round(
                          (r.score / Math.max(r.maxScore, 1)) * 100,
                        )}%)`}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 border-t border-[#F3F4F6] px-5 py-4">
              <button
                type="button"
                className="rounded-lg bg-[var(--sp-brand)] px-4 py-2 text-sm font-semibold text-[var(--sp-on-brand)] hover:bg-[var(--sp-brand-hover)]"
                onClick={closeSession}
              >
                Done
              </button>
              <button
                type="button"
                className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
                onClick={() => {
                  setSummaryOpen(false);
                  openPicker();
                }}
              >
                Practice again
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
