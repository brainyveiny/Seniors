"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  ShieldCheck,
  Sparkles,
  Trash2,
  WifiOff,
} from "lucide-react";
import type { SiteContext } from "@/application/hooks/use-site-context";
import { StudentAiDoubtChat } from "@/presentation/components/templates/seniors/student/StudentAiDoubtChat";
import { StudentHeaderActions } from "@/presentation/components/templates/seniors/student/StudentHeaderActions";
import { StudentPageHero } from "@/presentation/components/templates/seniors/student/StudentPageChrome";
import { cn } from "@/shared/lib/utils";

type ThreadSummary = {
  id: string;
  title: string;
  topicId: string | null;
  topicTitle: string | null;
  updatedAt: string;
};

const TRUST_BADGES = [
  { icon: BookOpen, label: "Teacher notes only" },
  { icon: ShieldCheck, label: "Exam-ready format" },
  { icon: WifiOff, label: "No internet search" },
];

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "";
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} min ago`;
  if (diff < 86_400_000) return `${Math.max(1, Math.floor(diff / 3_600_000))}h ago`;
  if (diff < 172_800_000) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function StudentAiDoubtsPage({ ctx }: { ctx: SiteContext }) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftKey, setDraftKey] = useState(0);
  const [listError, setListError] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refreshThreads(selectId?: string) {
    setLoadingThreads(true);
    try {
      const res = await fetch(
        `/api/tenants/${encodeURIComponent(ctx.tenant)}/seniors/ai/doubts?list=1`,
      );
      const json = (await res.json()) as { threads?: ThreadSummary[]; error?: string };
      if (!res.ok) {
        setListError(json.error || "Could not load your doubts.");
        return;
      }
      setListError("");
      const next = json.threads ?? [];
      setThreads(next);
      if (selectId) setActiveId(selectId);
      else if (!activeId && next[0]) setActiveId(next[0].id);
    } finally {
      setLoadingThreads(false);
    }
  }

  useEffect(() => {
    void refreshThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.tenant]);

  function startNewDoubt() {
    setActiveId(null);
    setDraftKey((n) => n + 1);
  }

  async function deleteThread(threadId: string) {
    const thread = threads.find((t) => t.id === threadId);
    const label = thread?.title?.trim() || "this doubt";
    if (
      !window.confirm(
        `Delete "${label}"?\n\nThis conversation will be permanently deleted.`,
      )
    ) {
      return;
    }
    setDeletingId(threadId);
    setListError("");
    try {
      const res = await fetch(
        `/api/tenants/${encodeURIComponent(ctx.tenant)}/seniors/ai/doubts?threadId=${encodeURIComponent(threadId)}`,
        { method: "DELETE" },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Could not delete this conversation");
      if (activeId === threadId) {
        setActiveId(null);
        setDraftKey((n) => n + 1);
      }
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Could not delete this conversation");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-4.25rem)] min-h-[28rem] flex-col gap-4 overflow-hidden lg:h-[calc(100dvh-3.25rem)]">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <StudentPageHero
            icon={Sparkles}
            title="Ask a Doubt"
            subtitle="Get answers from your teacher's published notes -same language and method you'll use in exams."
          />
          <div className="flex flex-wrap gap-2">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  borderColor: "var(--sp-border, #E8EEF5)",
                  backgroundColor: "var(--sp-surface-2, #F8FAFC)",
                  color: "var(--sp-muted, #64748B)",
                }}
              >
                <Icon className="h-3 w-3" strokeWidth={2.2} />
                {label}
              </span>
            ))}
          </div>
        </div>
        <StudentHeaderActions ctx={ctx} />
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden lg:grid-cols-[288px_minmax(0,1fr)] lg:grid-rows-1">
        <aside
          className="flex max-h-52 min-h-0 flex-col overflow-hidden rounded-2xl border shadow-sm lg:sticky lg:top-0 lg:max-h-none lg:h-full"
          style={{
            backgroundColor: "var(--sp-surface, #ffffff)",
            borderColor: "var(--sp-border, #E8EEF5)",
          }}
        >
          <div
            className="shrink-0 border-b px-3 py-3"
            style={{ borderColor: "var(--sp-border, #E8EEF5)" }}
          >
            <button
              type="button"
              onClick={startNewDoubt}
              className="sp-ai-new-btn flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition"
            >
              <MessageSquarePlus className="h-4 w-4" />
              New doubt
            </button>
          </div>

          <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--sp-muted-2,#94A3B8)]">
              Your doubts
            </p>
            {threads.length > 0 ? (
              <span className="rounded-full bg-[var(--sp-surface-2,#F1F5F9)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--sp-muted,#64748B)]">
                {threads.length}
              </span>
            ) : null}
          </div>

          {listError ? (
            <p className="mb-2 shrink-0 px-4 text-xs leading-relaxed text-[#DC2626]">{listError}</p>
          ) : null}

          <div className="sp-chat-scroll min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 pb-2">
            {loadingThreads ? (
              <div className="space-y-2 px-1 py-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-xl"
                    style={{ backgroundColor: "var(--sp-surface-2, #F1F5F9)" }}
                  />
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <span
                  className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: "var(--sp-accent-soft, #F4F4F5)",
                    color: "var(--sp-accent, #18181B)",
                  }}
                >
                  <MessageSquare className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-[color:var(--sp-text-strong,#0F172A)]">
                  No doubts yet
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[color:var(--sp-muted,#64748B)]">
                  Ask your first question -it will be saved here for revision.
                </p>
              </div>
            ) : (
              threads.map((thread) => (
                <div
                  key={thread.id}
                  className={cn(
                    "group relative flex items-stretch rounded-xl transition",
                    activeId === thread.id ? "sp-thread-active" : "sp-thread-btn",
                  )}
                >
                  {activeId === thread.id ? (
                    <span className="absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-[var(--sp-accent,#18181B)]" />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setActiveId(thread.id)}
                    className="min-w-0 flex-1 px-3 py-2.5 text-left"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition",
                          activeId === thread.id
                            ? "bg-[var(--sp-accent,#18181B)] text-[var(--sp-on-accent,#fff)]"
                            : "bg-[var(--sp-surface-2,#F1F5F9)] text-[color:var(--sp-muted,#64748B)] group-hover:bg-[var(--sp-surface-3,#E2E8F0)]",
                        )}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-[color:var(--sp-text-strong,#0F172A)]">
                          {thread.title}
                        </p>
                        <p className="mt-1 flex items-center justify-between gap-2 text-[10px] text-[color:var(--sp-muted,#64748B)]">
                          <span className="truncate">{thread.topicTitle || "Class notes"}</span>
                          <span className="shrink-0 font-medium">{relativeTime(thread.updatedAt)}</span>
                        </p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteThread(thread.id)}
                    disabled={deletingId === thread.id}
                    aria-label={`Delete ${thread.title}`}
                    className="mr-1.5 flex w-8 shrink-0 items-center justify-center self-center rounded-lg text-[color:var(--sp-muted,#94A3B8)] opacity-0 transition hover:bg-[var(--sp-danger-soft,#FEF2F2)] hover:text-[var(--sp-danger,#DC2626)] group-hover:opacity-100 disabled:opacity-60"
                  >
                    {deletingId === thread.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        <StudentAiDoubtChat
          key={activeId ? activeId : `new-${draftKey}`}
          tenant={ctx.tenant}
          threadId={activeId}
          className="h-full min-h-0 max-h-none"
          onThreadChange={(id) => {
            setActiveId((current) => current ?? id);
            void refreshThreads(id);
          }}
          onDeleteThread={
            activeId
              ? () => {
                  void deleteThread(activeId);
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
