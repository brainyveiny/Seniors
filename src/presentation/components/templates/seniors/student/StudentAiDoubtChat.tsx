"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  GraduationCap,
  Loader2,
  Maximize2,
  Minimize2,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { STUDENT_ACCENT, STUDENT_ON_ACCENT } from "@/presentation/components/templates/seniors/student/StudentPageChrome";
import { TutorAnswerBody } from "@/presentation/components/templates/seniors/student/TutorAnswerBody";
import { pingSeniorsGamification } from "@/presentation/components/templates/seniors/gamification/ping-seniors-gamification";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SUGGESTED_PROMPTS = [
  "Explain this topic step by step",
  "How should I write the answer in exams?",
  "What are the important keywords?",
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="sp-typing-dot h-1.5 w-1.5 rounded-full bg-[color:var(--sp-muted,#94A3B8)]"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export function StudentAiDoubtChat({
  tenant,
  topicId,
  topicSlug,
  topicTitle,
  threadId: initialThreadId,
  onThreadChange,
  onDeleteThread,
  className,
}: {
  tenant: string;
  topicId?: string;
  topicSlug?: string;
  topicTitle?: string;
  threadId?: string | null;
  onThreadChange?: (threadId: string) => void;
  onDeleteThread?: () => void;
  className?: string;
}) {
  const [threadId, setThreadId] = useState(initialThreadId ?? "");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const threadIdRef = useRef(threadId);
  threadIdRef.current = threadId;

  useEffect(() => {
    if (initialThreadId && initialThreadId === threadIdRef.current) return;
    setThreadId(initialThreadId ?? "");
  }, [initialThreadId]);

  useEffect(() => {
    if (initialThreadId && initialThreadId === threadIdRef.current && messages.length > 0) return;
    let cancelled = false;
    async function load() {
      setBooting(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (initialThreadId) params.set("threadId", initialThreadId);
        else if (topicId) params.set("topicId", topicId);
        const res = await fetch(
          `/api/tenants/${encodeURIComponent(tenant)}/seniors/ai/doubts?${params.toString()}`,
        );
        const json = (await res.json()) as {
          thread?: { threadId: string; messages: ChatMessage[] } | null;
          configured?: boolean;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error || "Could not load this conversation");
        if (cancelled) return;
        setConfigured(json.configured !== false);
        if (json.thread) {
          setThreadId(json.thread.threadId);
          setMessages(json.thread.messages);
          onThreadChange?.(json.thread.threadId);
        } else if (!threadId) {
          setMessages([]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load this conversation");
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant, topicId, initialThreadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  async function send(overrideQuestion?: string) {
    const question = (overrideQuestion ?? input).trim();
    if (!question || loading) return;
    setInput("");
    setError("");
    setLoading(true);
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: question,
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const res = await fetch(`/api/tenants/${encodeURIComponent(tenant)}/seniors/ai/doubts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          topicId,
          topicSlug,
          threadId: threadId || undefined,
        }),
      });
      const json = (await res.json()) as {
        threadId?: string;
        answer?: string;
        configured?: boolean;
        retryable?: boolean;
        error?: string;
      };
      if (!res.ok) {
        if (json.retryable || res.status === 429 || res.status === 503) {
          throw new Error(
            json.error ||
              "The AI service is busy right now. Please wait 10–15 seconds and try again.",
          );
        }
        throw new Error(json.error || "Could not answer this doubt");
      }
      void pingSeniorsGamification(tenant, "doubt");
      if (json.configured === false) setConfigured(false);
      if (json.threadId) {
        setThreadId(json.threadId);
        onThreadChange?.(json.threadId);
      }
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        { id: `${json.threadId ?? "t"}-u-${stamp}`, role: "user", content: question },
        {
          id: `${json.threadId ?? "t"}-a-${stamp}`,
          role: "assistant",
          content: json.answer || "",
        },
      ]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setError(err instanceof Error ? err.message : "Could not answer this doubt");
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  const empty = !booting && messages.length === 0;
  const displayTitle = topicTitle || "Ask a Doubt";

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden",
        fullscreen
          ? "fixed inset-0 z-50 rounded-none border-0 shadow-none"
          : cn(
              "rounded-2xl border shadow-[0_4px_24px_rgba(15,23,42,0.06)]",
              className ?? "h-[min(72vh,760px)] min-h-[420px] max-h-[calc(100dvh-8.5rem)]",
            ),
      )}
      style={{
        backgroundColor: "var(--sp-surface, #ffffff)",
        borderColor: "var(--sp-border, #E8EEF5)",
        color: "var(--sp-text, #1F2937)",
      }}
    >
      {/* Header */}
      <div
        className="sp-ai-chat-header shrink-0 border-b px-4 py-3.5 sm:px-5"
        style={{ borderColor: "var(--sp-border, #E8EEF5)" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
            style={{ backgroundColor: STUDENT_ACCENT, color: STUDENT_ON_ACCENT }}
          >
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-bold tracking-tight text-[color:var(--sp-text-strong,#0F172A)] sm:text-base">
                {displayTitle}
              </h2>
              <span className="sp-ai-badge-school rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                School notes
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[color:var(--sp-muted,#64748B)] sm:text-xs">
              Answers from your teacher&apos;s published notes -exam language &amp; format
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {onDeleteThread && (threadId || initialThreadId) ? (
              <button
                type="button"
                onClick={onDeleteThread}
                aria-label="Delete conversation"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border text-[color:var(--sp-muted,#64748B)] transition hover:border-[var(--sp-danger-border,#FECACA)] hover:bg-[var(--sp-danger-soft,#FEF2F2)] hover:text-[var(--sp-danger,#DC2626)]"
                style={{ borderColor: "var(--sp-border, #E8EEF5)" }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setFullscreen((open) => !open)}
              aria-label={fullscreen ? "Exit full screen" : "Full screen chat"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border text-[color:var(--sp-text,#334155)] transition hover:bg-[var(--sp-surface-2,#F8FAFC)]"
              style={{ borderColor: "var(--sp-border, #E8EEF5)" }}
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="sp-ai-chat-body sp-chat-scroll relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-5 px-4 py-5 sm:px-5">
          {booting ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-[color:var(--sp-muted,#94A3B8)]" />
                <p className="text-sm text-[color:var(--sp-muted,#64748B)]">Loading conversation…</p>
              </div>
            </div>
          ) : null}

          {empty ? (
            <div className="mx-auto max-w-md py-6 text-center sm:py-10">
              <span
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm"
                style={{
                  backgroundColor: "var(--sp-accent-soft, #F4F4F5)",
                  color: "var(--sp-accent, #18181B)",
                }}
              >
                <BookOpen className="h-6 w-6" />
              </span>
              <p className="mt-4 text-base font-bold text-[color:var(--sp-text-strong,#0F172A)]">
                Ask your academic doubt
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--sp-muted,#64748B)]">
                Get clear, exam-ready answers from your school&apos;s teacher notes. No internet search —
                if the topic isn&apos;t in your notes, we&apos;ll tell you.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void send(prompt)}
                    disabled={loading}
                    className="rounded-full border px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--sp-surface-2,#F8FAFC)] disabled:opacity-50"
                    style={{
                      borderColor: "var(--sp-border, #E0E7F0)",
                      color: "var(--sp-text, #334155)",
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "flex-row-reverse" : "flex-row",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm",
                  message.role === "user"
                    ? "bg-[var(--sp-surface-2,#F1F5F9)] text-[color:var(--sp-muted,#64748B)]"
                    : "",
                )}
                style={
                  message.role === "assistant"
                    ? { backgroundColor: STUDENT_ACCENT, color: STUDENT_ON_ACCENT }
                    : undefined
                }
              >
                {message.role === "user" ? (
                  <User className="h-3.5 w-3.5" />
                ) : (
                  <GraduationCap className="h-3.5 w-3.5" />
                )}
              </span>
              <div
                className={cn(
                  "min-w-0 max-w-[min(100%,42rem)]",
                  message.role === "user" ? "text-right" : "text-left",
                )}
              >
                <p
                  className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--sp-muted-2,#94A3B8)]"
                >
                  {message.role === "user" ? "You" : "School tutor"}
                </p>
                <div
                  className={cn(
                    "rounded-2xl text-left",
                    message.role === "user"
                      ? "rounded-tr-md px-4 py-3"
                      : "rounded-tl-md border px-4 py-3.5 shadow-sm sm:py-4",
                  )}
                  style={
                    message.role === "user"
                      ? { backgroundColor: STUDENT_ACCENT, color: STUDENT_ON_ACCENT }
                      : {
                          backgroundColor: "var(--sp-surface, #ffffff)",
                          borderColor: "var(--sp-border, #E8EEF5)",
                          color: "var(--sp-text, #111827)",
                        }
                  }
                >
                  {message.role === "user" ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  ) : (
                    <TutorAnswerBody text={message.content} />
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading ? (
            <div className="flex gap-3">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm"
                style={{ backgroundColor: STUDENT_ACCENT, color: STUDENT_ON_ACCENT }}
              >
                <GraduationCap className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--sp-muted-2,#94A3B8)]">
                  School tutor
                </p>
                <div
                  className="inline-flex items-center gap-2.5 rounded-2xl rounded-tl-md border px-4 py-3 shadow-sm"
                  style={{
                    backgroundColor: "var(--sp-surface, #ffffff)",
                    borderColor: "var(--sp-border, #E8EEF5)",
                  }}
                >
                  <TypingIndicator />
                  <span className="text-[13px] text-[color:var(--sp-muted,#64748B)]">
                    Reading teacher notes…
                  </span>
                </div>
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Footer / input */}
      <div className="shrink-0">
        {error ? (
          <div
            className="mx-3 mb-2 flex items-start gap-2 rounded-xl border px-3 py-2.5 sm:mx-4"
            style={{
              borderColor: "var(--sp-danger-border, #FECACA)",
              backgroundColor: "var(--sp-danger-soft, #FEF2F2)",
              color: "var(--sp-danger, #DC2626)",
            }}
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs leading-relaxed">{error}</p>
          </div>
        ) : null}
        {!configured ? (
          <p className="px-4 pb-1 text-xs text-[#B45309] sm:px-5">
            Ask a Doubt is being enabled for your school. Try again shortly, or ask your teacher in class.
          </p>
        ) : null}

        <form
          className="border-t px-3 py-3 sm:px-4 sm:py-3.5"
          style={{
            borderColor: "var(--sp-border, #E8EEF5)",
            backgroundColor: "var(--sp-surface-2, #F8FAFC)",
          }}
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div
            className="flex items-end gap-2 rounded-2xl border p-1.5 shadow-sm transition-[box-shadow,border-color] focus-within:border-[var(--sp-accent,#18181B)] focus-within:shadow-[0_0_0_3px_rgba(24,24,27,0.08)]"
            style={{
              borderColor: "var(--sp-border, #E0E7F0)",
              backgroundColor: "var(--sp-surface, #ffffff)",
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              maxLength={2000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={
                topicTitle
                  ? `Ask about ${topicTitle}…`
                  : "Type your doubt here…"
              }
              className="min-h-[44px] min-w-0 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-[color:var(--sp-muted,#a3a3a3)] text-[color:var(--sp-text-strong,#0F172A)]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="mb-0.5 mr-0.5 inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition disabled:opacity-40"
              style={{ backgroundColor: STUDENT_ACCENT, color: STUDENT_ON_ACCENT }}
              aria-label="Send doubt"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Ask</span>
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-[color:var(--sp-muted-2,#94A3B8)]">
            Enter to send · Shift+Enter for new line · Powered by your school&apos;s teacher notes
          </p>
        </form>
      </div>
    </div>
  );
}
