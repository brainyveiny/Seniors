"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  SeniorsCard,
  SeniorsEmptyState,
  SeniorsProgressRing,
} from "@/presentation/components/templates/seniors/shared/SeniorsUi";
import { RichHtmlContent } from "@/presentation/components/practice/RichHtmlContent";
import type { SeniorsHomeworkItem } from "@/domain/seniors/types";
import type { SeniorsQuizQuestion } from "@/domain/seniors/types";
import { isRenderableImageUrl } from "@/domain/seniors/topic-diagrams";
import { uploadSeniorsAttachment } from "@/application/services/seniors-media-upload";
import { formatDate, formatDateTime } from "@/shared/lib/format-date";
import { pingSeniorsGamification } from "@/presentation/components/templates/seniors/gamification/ping-seniors-gamification";
import { cn } from "@/shared/lib/utils";
import { StudentHeaderActions } from "@/presentation/components/templates/seniors/student/StudentHeaderActions";

const INPUT =
  "w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm text-[#1F2937] placeholder:text-[#9CA3AF] focus:border-[var(--sp-brand)] focus:outline-none";
const BTN_PRIMARY =
  "rounded-lg bg-[var(--sp-brand)] px-4 py-2 text-sm font-semibold text-[var(--sp-on-brand)] hover:bg-[var(--sp-brand-hover)] disabled:opacity-60";
const BTN_GHOST =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-60";

type ListFilter = "all" | "assigned" | "done";

function isAssigned(hw: SeniorsHomeworkItem) {
  return !hw.submissionStatus || hw.submissionStatus === "pending";
}

function isDone(hw: SeniorsHomeworkItem) {
  return hw.submissionStatus === "submitted" || hw.submissionStatus === "graded";
}

function statusMeta(hw: SeniorsHomeworkItem) {
  if (hw.submissionStatus === "graded") {
    return {
      text: hw.score != null ? `Returned · ${hw.score}` : "Returned",
      className: "bg-[#ECFDF5] text-[#15803D]",
    };
  }
  if (hw.submissionStatus === "submitted") {
    return {
      text: "Turned in",
      className: "bg-[var(--sp-accent-soft,#EFF6FF)] text-[var(--sp-accent,#1D4ED8)]",
    };
  }
  if (hw.status === "overdue") {
    return { text: "Overdue", className: "bg-[#FEF2F2] text-[#B91C1C]" };
  }
  if (hw.status === "due_today") {
    return { text: "Due today", className: "bg-[#FFF7ED] text-[#C2410C]" };
  }
  return {
    text: "Assigned",
    className: "bg-[var(--sp-surface-3,#F3F4F6)] text-[var(--sp-muted,#4B5563)]",
  };
}

export function StudentHomeworkListClient({ items }: { items: SeniorsHomeworkItem[] }) {
  const ctx = useSeniorsSite();
  const [filter, setFilter] = useState<ListFilter>("all");
  const [query, setQuery] = useState("");

  const assigned = useMemo(() => items.filter(isAssigned), [items]);
  const done = useMemo(() => items.filter(isDone), [items]);
  const overdue = useMemo(
    () => assigned.filter((h) => h.status === "overdue"),
    [assigned],
  );

  const filtered = useMemo(() => {
    const base =
      filter === "assigned" ? assigned : filter === "done" ? done : items;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.subjectName.toLowerCase().includes(q) ||
        h.chapterName.toLowerCase().includes(q),
    );
  }, [assigned, done, filter, items, query]);

  const tabs: { id: ListFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: items.length },
    { id: "assigned", label: "To do", count: assigned.length },
    { id: "done", label: "Done", count: done.length },
  ];

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
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--sp-muted,#6B7280)]">
            Assignments
          </p>
          <h1 className="mt-1 text-[1.75rem] font-semibold tracking-tight text-[var(--sp-text-strong,#111827)] sm:text-[1.875rem]">
            Classwork
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-[var(--sp-muted,#6B7280)]">
            Track due work, turn in assignments, and review returned feedback.
          </p>
        </div>
        <StudentHeaderActions ctx={ctx} />
      </header>

      {items.length === 0 ? (
        <SeniorsEmptyState
          title="No classwork yet"
          description="When your teacher posts an assignment, it will show up here."
        />
      ) : (
        <>
          <section className="relative grid gap-3 sm:grid-cols-3">
            <SeniorsCard pastel="orange" className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--sp-muted,#6B7280)]">
                    To do
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-2xl font-semibold tabular-nums",
                      assigned.length > 0
                        ? "text-[#B91C1C]"
                        : "text-[var(--sp-text-strong,#111827)]",
                    )}
                  >
                    {assigned.length}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFF7ED] text-[#EA580C]">
                  <ClipboardList className="h-4 w-4" />
                </div>
              </div>
            </SeniorsCard>
            <SeniorsCard pastel="pink" className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--sp-muted,#6B7280)]">
                    Overdue
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-2xl font-semibold tabular-nums",
                      overdue.length > 0
                        ? "text-[#B91C1C]"
                        : "text-[var(--sp-text-strong,#111827)]",
                    )}
                  >
                    {overdue.length}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FEF2F2] text-[#DC2626]">
                  <CalendarClock className="h-4 w-4" />
                </div>
              </div>
            </SeniorsCard>
            <SeniorsCard pastel="green" className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--sp-muted,#6B7280)]">
                    Done
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--sp-text-strong,#111827)]">
                    {done.length}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#059669]">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
            </SeniorsCard>
          </section>

          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-xl border border-[var(--sp-border,#E5E7EB)] bg-[var(--sp-surface,#fff)] p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                    filter === tab.id
                      ? "bg-[var(--sp-accent-soft,#EFF6FF)] text-[var(--sp-accent,#1D4ED8)]"
                      : "text-[var(--sp-muted,#6B7280)] hover:text-[var(--sp-text-strong,#111827)]",
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                      filter === tab.id
                        ? "bg-white/80 text-[var(--sp-accent,#1D4ED8)]"
                        : "bg-[var(--sp-page,#F3F4F6)] text-[var(--sp-muted,#6B7280)]",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <label className="relative block w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sp-muted,#9CA3AF)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title or subject"
                className="w-full rounded-xl border border-[var(--sp-border,#E5E7EB)] bg-[var(--sp-surface,#fff)] py-2.5 pl-9 pr-3 text-sm text-[var(--sp-text-strong,#111827)] placeholder:text-[var(--sp-muted,#9CA3AF)] outline-none transition focus:border-[var(--sp-accent,#2563EB)]"
              />
            </label>
          </div>

          {filtered.length === 0 ? (
            <SeniorsEmptyState
              title="No matching assignments"
              description="Try another filter or clear your search."
            />
          ) : (
            <ul className="relative space-y-3">
              {filtered.map((hw) => {
                const st = statusMeta(hw);
                return (
                  <li key={hw.id}>
                    <Link
                      href={ctx.sitePath(`student/homework/${hw.id}`)}
                      className="group flex overflow-hidden rounded-xl border border-[var(--sp-border,#E5E7EB)] bg-[var(--sp-surface,#fff)] shadow-sm transition hover:border-[color-mix(in_srgb,var(--sp-accent,#2563EB)_28%,var(--sp-border,#E5E7EB))] hover:shadow-md"
                    >
                      <div
                        className={cn(
                          "w-1 shrink-0",
                          hw.status === "overdue"
                            ? "bg-[#DC2626]"
                            : isDone(hw)
                              ? "bg-[#16A34A]"
                              : "bg-[var(--sp-accent,#2563EB)]",
                        )}
                      />
                      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--sp-muted,#6B7280)]">
                            {hw.subjectName}
                            {hw.chapterName ? (
                              <>
                                <span className="mx-1.5 text-[var(--sp-border-2,#D1D5DB)]">·</span>
                                {hw.chapterName}
                              </>
                            ) : null}
                          </p>
                          <p className="mt-1 text-base font-semibold tracking-tight text-[var(--sp-text-strong,#111827)]">
                            {hw.title}
                          </p>
                          <p className="mt-1 text-sm text-[var(--sp-muted,#6B7280)]">
                            Due {formatDate(hw.dueAt)}
                            {hw.questionCount > 0
                              ? ` · ${hw.questionCount} question${hw.questionCount === 1 ? "" : "s"}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span
                            className={cn(
                              "rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wide",
                              st.className,
                            )}
                          >
                            {st.text}
                          </span>
                          <span className="hidden h-8 w-8 items-center justify-center rounded-lg bg-[var(--sp-page,#F9FAFB)] text-[var(--sp-muted,#6B7280)] transition group-hover:bg-[var(--sp-accent-soft,#EFF6FF)] group-hover:text-[var(--sp-accent,#2563EB)] sm:inline-flex">
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export type HomeworkDetailData = {
  id: string;
  title: string;
  description: string;
  subjectName: string;
  chapterName: string;
  dueAt: Date | string;
  questionCount: number;
  attachmentUrls?: string[];
  status: string;
  submissionStatus: "pending" | "submitted" | "graded";
  answerText: string;
  submissionAttachmentUrls?: string[];
  score: number | null;
  feedback: string;
};

function fileLabel(url: string, index: number) {
  if (url.toLowerCase().includes(".pdf") || url.includes("application/pdf")) {
    return `PDF ${index + 1}`;
  }
  return `File ${index + 1}`;
}

export function StudentHomeworkDetailClient({
  homework,
}: {
  homework: HomeworkDetailData;
}) {
  const ctx = useSeniorsSite();
  const [answerText, setAnswerText] = useState(homework.answerText || "");
  const [status, setStatus] = useState(homework.submissionStatus);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [score, setScore] = useState(homework.score);
  const [feedback, setFeedback] = useState(homework.feedback);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>(
    homework.submissionAttachmentUrls ?? [],
  );
  const teacherFiles = homework.attachmentUrls ?? [];

  async function uploadFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadSeniorsAttachment(ctx.tenant, file);
      setAttachmentUrls((prev) => [...prev, url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function turnIn(text = answerText) {
    if (!text.trim() && attachmentUrls.length === 0) {
      setError("Add your work text or upload at least one file");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tenants/${ctx.tenant}/seniors/homework`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: homework.id,
          answerText: text.trim() || "Done",
          attachmentUrls,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Turn in failed");
      void pingSeniorsGamification(ctx.tenant, "homework");
      setStatus("submitted");
      setScore(null);
      setFeedback("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Turn in failed");
    } finally {
      setSaving(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await turnIn(answerText);
  }

  const dueLabel = formatDateTime(homework.dueAt);
  const workStatus =
    status === "graded"
      ? "Returned"
      : status === "submitted"
        ? "Turned in"
        : "Assigned";

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-4">
        <Link
          href={ctx.sitePath("student/homework")}
          className="inline-flex text-sm font-medium text-[#1a73e8] hover:underline"
        >
          ← Classwork
        </Link>

        <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="border-b border-[#E8EAED] bg-[#F8F9FA] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#5F6368]">
              {homework.subjectName}
              {homework.chapterName ? ` · ${homework.chapterName}` : ""}
            </p>
            <h2 className="mt-1 text-2xl font-normal text-[#202124]">{homework.title}</h2>
            <p className="mt-2 text-sm text-[#5F6368]">Due {dueLabel}</p>
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.85fr)]">
            <div className="space-y-4 border-b border-[#E8EAED] p-5 lg:border-b-0 lg:border-r">
              <div>
                <p className="text-sm font-medium text-[#3C4043]">Instructions</p>
                {homework.description ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#3C4043]">
                    {homework.description}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-[#9AA0A6]">No instructions added.</p>
                )}
              </div>
              {teacherFiles.length > 0 ? (
                <div>
                  <p className="text-sm font-medium text-[#3C4043]">Teacher files</p>
                  <ul className="mt-2 space-y-2">
                    {teacherFiles.map((url, i) => (
                      <li key={`teacher-${i}`}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-xl bg-[var(--sp-brand-soft)] px-3 py-2 text-sm font-semibold text-[var(--sp-brand-text)]"
                        >
                          {fileLabel(url, i)}
                        </a>
                        {url.toLowerCase().includes(".pdf") ||
                        url.includes("application/pdf") ? (
                          <div className="mt-2 overflow-hidden rounded-xl border border-[#E8EAED] bg-[#F8F9FA]">
                            <iframe
                              title={`Teacher file ${i + 1}`}
                              src={url}
                              className="h-[min(50vh,420px)] w-full"
                            />
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {homework.questionCount > 0 ? (
                <p className="rounded-xl bg-[#F1F3F4] px-3 py-2 text-sm text-[#3C4043]">
                  {homework.questionCount} question{homework.questionCount === 1 ? "" : "s"}
                </p>
              ) : null}
              {status === "graded" && feedback ? (
                <div className="rounded-xl border border-[#CEEAD6] bg-[#E6F4EA] p-4">
                  <p className="text-sm font-semibold text-[#137333]">Private comment from teacher</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#137333]">{feedback}</p>
                </div>
              ) : null}
            </div>

            <div className="bg-[#F8F9FA] p-5">
              <div className="rounded-2xl border border-[#E8EAED] bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base font-medium text-[#202124]">Your work</p>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      status === "graded"
                        ? "bg-[#E8F5E9] text-[#2E7D32]"
                        : status === "submitted"
                          ? "bg-[#E3F2FD] text-[#1565C0]"
                          : "bg-[#F5F5F5] text-[#616161]",
                    )}
                  >
                    {workStatus}
                    {status === "graded" && score != null ? ` · ${score}` : ""}
                  </span>
                </div>

                {status === "graded" || status === "submitted" ? (
                  <div className="mt-4 space-y-3">
                    <p className="whitespace-pre-wrap rounded-xl bg-[#F8F9FA] p-3 text-sm text-[#3C4043]">
                      {answerText || "—"}
                    </p>
                    {attachmentUrls.length > 0 ? (
                      <ul className="space-y-1">
                        {attachmentUrls.map((url, i) => (
                          <li key={`mine-${i}`}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-semibold text-[#1a73e8] underline"
                            >
                              {fileLabel(url, i)}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {status === "submitted" ? (
                      <p className="text-xs text-[#5F6368]">
                        Waiting for your teacher to return this assignment.
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className={BTN_GHOST}
                      onClick={() => setStatus("pending")}
                    >
                      Unsubmit
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submit} className="mt-4 space-y-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[#5F6368]">
                        Add your work
                      </span>
                      <textarea
                        className={INPUT}
                        rows={6}
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Type your answer here…"
                      />
                    </label>
                    <div className="space-y-2">
                      <label className={`${BTN_GHOST} inline-flex cursor-pointer items-center gap-2`}>
                        <Upload className="h-4 w-4" />
                        {uploading ? "Uploading…" : "Upload file"}
                        <input
                          type="file"
                          accept="application/pdf,.pdf,image/*"
                          className="hidden"
                          disabled={uploading || saving}
                          onChange={(e) => {
                            void uploadFile(e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {attachmentUrls.length > 0 ? (
                        <ul className="space-y-1">
                          {attachmentUrls.map((url, i) => (
                            <li
                              key={`up-${i}`}
                              className="flex items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] px-3 py-2 text-xs"
                            >
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="truncate font-medium text-[#1a73e8] underline"
                              >
                                {fileLabel(url, i)}
                              </a>
                              <button
                                type="button"
                                className="text-[#B91C1C]"
                                onClick={() =>
                                  setAttachmentUrls((prev) => prev.filter((_, idx) => idx !== i))
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={saving || uploading || (!answerText.trim() && attachmentUrls.length === 0)}
                        className={BTN_PRIMARY}
                      >
                        {saving ? "Turning in…" : "Turn in"}
                      </button>
                      <button
                        type="button"
                        disabled={saving || uploading}
                        className={BTN_GHOST}
                        onClick={() => void turnIn(answerText.trim() || "Done")}
                      >
                        Mark as done
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function StudentQuizPanel({
  quiz,
  autoStart = false,
  skipLastAttempt = false,
  embedded = false,
  continueLabel,
  onContinue,
}: {
  quiz: { id: string; title: string; questions: SeniorsQuizQuestion[] };
  autoStart?: boolean;
  skipLastAttempt?: boolean;
  /** Practice session / modal -no nested card, hide duplicate title */
  embedded?: boolean;
  continueLabel?: string;
  onContinue?: (result: { score: number; maxScore: number }) => void;
}) {
  const ctx = useSeniorsSite();
  const [started, setStarted] = useState(autoStart);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{
    score: number;
    maxScore: number;
    answers: Record<string, number>;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [brokenDiagrams, setBrokenDiagrams] = useState<Record<string, boolean>>({});
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [openSolutionIds, setOpenSolutionIds] = useState<Record<string, boolean>>({});

  const questions = useMemo(
    () =>
      quiz.questions.map((q, i) => ({
        ...q,
        id: q.id || `q${i + 1}`,
      })),
    [quiz.questions],
  );

  useEffect(() => {
    setStarted(autoStart);
    setAnswers({});
    setResult(null);
    setError("");
    setSolutionsOpen(false);
    setOpenSolutionIds({});
    setBrokenDiagrams({});
  }, [quiz.id, autoStart]);

  useEffect(() => {
    if (skipLastAttempt) return;
    let cancelled = false;
    async function loadLastAttempt() {
      try {
        const res = await fetch(
          `/api/tenants/${ctx.tenant}/seniors/quiz-attempts?quizId=${encodeURIComponent(quiz.id)}`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as {
          lastAttempt?: {
            score: number | null;
            maxScore: number | null;
            answers?: Record<string, number>;
          } | null;
        };
        if (cancelled || !json.lastAttempt) return;
        const attemptAnswers =
          json.lastAttempt.answers && typeof json.lastAttempt.answers === "object"
            ? json.lastAttempt.answers
            : {};
        setResult({
          score: json.lastAttempt.score ?? 0,
          maxScore: json.lastAttempt.maxScore ?? (questions.length || 1),
          answers: attemptAnswers,
        });
        setAnswers(attemptAnswers);
        setSolutionsOpen(false);
        setOpenSolutionIds({});
      } catch {
        // Ignore -student can still start fresh
      }
    }
    void loadLastAttempt();
    return () => {
      cancelled = true;
    };
  }, [ctx.tenant, quiz.id, questions.length, skipLastAttempt]);

  async function submit() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tenants/${ctx.tenant}/seniors/quiz-attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: quiz.id, answers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Submit failed");
      void pingSeniorsGamification(ctx.tenant, "quiz");
      setResult({
        score: json.attempt.score,
        maxScore: json.attempt.maxScore,
        answers: { ...answers },
      });
      setStarted(false);
      setSolutionsOpen(false);
      setOpenSolutionIds({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSaving(false);
    }
  }

  function startRetake() {
    setResult(null);
    setAnswers({});
    setStarted(true);
    setError("");
    setSolutionsOpen(false);
    setOpenSolutionIds({});
  }

  function toggleSolution(id: string) {
    setOpenSolutionIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function Shell({ children }: { children: React.ReactNode }) {
    if (embedded) return <div className="space-y-5">{children}</div>;
    return <SeniorsCard>{children}</SeniorsCard>;
  }

  const optionLetter = (i: number) => String.fromCharCode(65 + i);

  if (questions.length === 0) {
    return (
      <SeniorsEmptyState
        title="Quiz not ready"
        description="Your teacher has not added questions yet."
      />
    );
  }

  if (result && !started) {
    const pct = Math.round((result.score / Math.max(result.maxScore, 1)) * 100);
    return (
      <Shell>
        {!embedded ? <p className="font-semibold text-[#111827]">{quiz.title}</p> : null}
        <div className={cn("flex items-center gap-4", !embedded && "mt-4")}>
          <SeniorsProgressRing percent={pct} />
          <div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-[#111827]">
              {result.score}/{result.maxScore}
            </p>
            <p className="text-sm text-[#6B7280]">
              {onContinue ? `${pct}% this attempt` : "Your last attempt"}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <button
            type="button"
            className="flex w-full items-center justify-between border-y border-[#F3F4F6] px-1 py-3 text-left hover:bg-[#F9FAFB]"
            onClick={() => setSolutionsOpen((v) => !v)}
            aria-expanded={solutionsOpen}
          >
            <span className="text-sm font-medium text-[#111827]">
              {solutionsOpen ? "Hide solutions" : "Review answers"}
            </span>
            <span className="text-xs text-[#9CA3AF]">{solutionsOpen ? "▴" : "▾"}</span>
          </button>

          {solutionsOpen ? (
            <div className="mt-3 divide-y divide-[#F3F4F6]">
              {questions.map((q, qi) => {
                const selected = result.answers[q.id];
                const correct = q.correctIndex;
                const isCorrect = selected === correct;
                const open = Boolean(openSolutionIds[q.id]);
                return (
                  <div key={q.id} className="py-2">
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 py-2 text-left"
                      onClick={() => toggleSolution(q.id)}
                      aria-expanded={open}
                    >
                      <div className="min-w-0 text-sm text-[#1F2937]">
                        <span className="font-medium text-[#6B7280]">{qi + 1}. </span>
                        <RichHtmlContent html={q.prompt} as="span" className="inline" />
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-[11px] font-medium",
                          isCorrect ? "text-[#15803D]" : "text-[#B91C1C]",
                        )}
                      >
                        {isCorrect ? "Correct" : "Incorrect"}
                      </span>
                    </button>

                    {open ? (
                      <div className="pb-2 pl-4">
                        {isRenderableImageUrl(q.diagramUrl ?? "") && !brokenDiagrams[q.id] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={q.diagramUrl}
                            alt={`Question ${qi + 1} diagram`}
                            className="mb-3 max-h-32 rounded-lg border border-[#E5E7EB] object-contain"
                            onError={() =>
                              setBrokenDiagrams((prev) => ({ ...prev, [q.id]: true }))
                            }
                          />
                        ) : null}
                        <ul className="space-y-1">
                          {q.options.map((opt, oi) => {
                            const isSel = selected === oi;
                            const isAns = correct === oi;
                            return (
                              <li
                                key={`${q.id}-sol-${oi}`}
                                className={cn(
                                  "flex gap-2 px-1 py-1.5 text-sm",
                                  isAns
                                    ? "font-medium text-[#15803D]"
                                    : isSel
                                      ? "text-[#B91C1C]"
                                      : "text-[#4B5563]",
                                )}
                              >
                                <span className="w-5 shrink-0 text-xs font-medium text-[#9CA3AF]">
                                  {optionLetter(oi)}.
                                </span>
                                <span className="min-w-0">
                                  <RichHtmlContent html={opt} as="span" className="inline" />
                                  {isAns ? (
                                    <span className="ml-1.5 text-[11px]">(answer)</span>
                                  ) : null}
                                  {isSel && !isAns ? (
                                    <span className="ml-1.5 text-[11px]">(yours)</span>
                                  ) : null}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                        {q.explanation?.trim() ? (
                          <div className="mt-2 text-sm text-[#4B5563]">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                              Explanation
                            </p>
                            <RichHtmlContent
                              html={q.explanation}
                              className="mt-1 text-sm leading-relaxed"
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {onContinue ? (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-[#F3F4F6] pt-4">
            <button
              type="button"
              className={BTN_PRIMARY}
              onClick={() =>
                onContinue({ score: result.score, maxScore: result.maxScore })
              }
            >
              {continueLabel || "Continue"}
            </button>
            <button type="button" className={BTN_GHOST} onClick={startRetake}>
              Retake
            </button>
          </div>
        ) : (
          <button type="button" className={`${BTN_PRIMARY} mt-5`} onClick={startRetake}>
            Retake quiz
          </button>
        )}
      </Shell>
    );
  }

  if (!started) {
    return (
      <Shell>
        {!embedded ? <p className="font-semibold text-[#111827]">{quiz.title}</p> : null}
        <p className={cn("text-sm text-[#6B7280]", !embedded && "mt-1")}>
          {questions.length} question{questions.length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          className={`${BTN_PRIMARY} mt-4`}
          onClick={() => setStarted(true)}
        >
          Start quiz
        </button>
      </Shell>
    );
  }

  const answered = Object.keys(answers).length;

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!embedded ? (
          <p className="font-semibold text-[#111827]">{quiz.title}</p>
        ) : (
          <p className="text-xs font-medium text-[#6B7280]">
            {answered}/{questions.length} answered
          </p>
        )}
        {result ? (
          <button type="button" className={BTN_GHOST} onClick={() => setStarted(false)}>
            Back to score
          </button>
        ) : !embedded ? (
          <p className="text-xs text-[#9CA3AF]">
            {answered}/{questions.length} answered
          </p>
        ) : null}
      </div>

      <div className={cn("divide-y divide-[#F3F4F6]", !embedded && "mt-4")}>
        {questions.map((q, qi) => (
          <div key={q.id} className="py-5 first:pt-2 last:pb-2">
            <div className="text-sm leading-relaxed text-[#111827]">
              <span className="mr-1.5 font-medium text-[#9CA3AF]">{qi + 1}.</span>
              <RichHtmlContent html={q.prompt} as="span" className="inline font-medium" />
            </div>
            {isRenderableImageUrl(q.diagramUrl ?? "") && !brokenDiagrams[q.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={q.diagramUrl}
                alt={`Question ${qi + 1} diagram`}
                className="mt-3 max-h-36 w-auto max-w-full rounded-lg border border-[#E5E7EB] object-contain"
                onError={() => setBrokenDiagrams((prev) => ({ ...prev, [q.id]: true }))}
              />
            ) : q.diagramUrl?.trim() && brokenDiagrams[q.id] ? (
              <p className="mt-3 text-xs text-[#6B7280]">Diagram could not be loaded.</p>
            ) : null}
            <div className="mt-3 space-y-1.5">
              {q.options.map((opt, oi) => {
                const selected = answers[q.id] === oi;
                return (
                  <label
                    key={`${q.id}-${oi}`}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2.5 text-sm transition",
                      selected
                        ? "bg-[#F0F5FF] ring-1 ring-[var(--sp-brand)]/35"
                        : "hover:bg-[#F9FAFB]",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
                        selected
                          ? "bg-[var(--sp-brand)] text-[var(--sp-on-brand)]"
                          : "bg-[#F3F4F6] text-[#6B7280]",
                      )}
                    >
                      {optionLetter(oi)}
                    </span>
                    <input
                      type="radio"
                      className="sr-only"
                      name={q.id}
                      checked={selected}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                    />
                    <RichHtmlContent
                      html={opt}
                      as="span"
                      className="inline min-w-0 flex-1 leading-snug text-[#374151]"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
      <div className="sticky bottom-0 border-t border-[#F3F4F6] bg-white pt-4">
        <button
          type="button"
          className={BTN_PRIMARY}
          disabled={saving || answered < questions.length}
          onClick={submit}
        >
          {saving ? "Submitting…" : "Submit answers"}
        </button>
      </div>
    </Shell>
  );
}
