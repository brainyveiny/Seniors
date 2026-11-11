"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Calendar,
  ClipboardList,
  Megaphone,
} from "lucide-react";
import {
  SeniorsCard,
  SeniorsEmptyState,
  SeniorsProgressRing,
} from "@/presentation/components/templates/seniors/shared/SeniorsUi";

export type ParentChildDetail = {
  id: string;
  name: string;
  className: string;
  progress: {
    percent: number;
    topicsCompleted: number;
    topicsTotal: number;
    testAverage: number;
  };
  subjectProgress: {
    name: string;
    completed: number;
    total: number;
    percent: number;
  }[];
  homeworkDue: number;
  alerts: {
    id: string;
    type: "overdue" | "homework" | "exam";
    title: string;
    detail: string;
  }[];
  recentQuizzes: {
    id: string;
    title: string;
    score: number | null;
    maxScore: number | null;
    submittedAt: Date | string | null;
  }[];
  subjects: {
    name: string;
    chapters: { name: string; completedCount: number; topicCount: number }[];
  }[];
};

export function ParentChildrenDetailClient({
  childProfiles,
  announcements,
}: {
  childProfiles: ParentChildDetail[];
  announcements: { id: string; title: string; body: string; publishedAt?: Date | string }[];
}) {
  const [activeId, setActiveId] = useState(childProfiles[0]?.id ?? "");
  const child = childProfiles.find((c) => c.id === activeId) ?? childProfiles[0];

  return (
    <>
      {childProfiles.length === 0 || !child ? (
        <SeniorsEmptyState
          title="No linked children"
          description="Ask the school admin to link your account to a student."
        />
      ) : (
        <div className="space-y-4">
          {childProfiles.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {childProfiles.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={`rounded-full border px-3.5 py-2 text-sm font-medium ${
                    c.id === child.id
                      ? "border-[var(--sp-brand)] bg-[var(--sp-brand-soft)] text-[var(--sp-brand-text)]"
                      : "border-[#E5E7EB] bg-white text-[#374151]"
                  }`}
                >
                  {c.name} ({c.className})
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <SeniorsCard className="flex flex-col items-center justify-center p-6 text-center">
              <SeniorsProgressRing percent={child.progress.percent} size={96} />
              <p className="mt-3 font-semibold text-[#1F2937]">{child.name}</p>
              <p className="text-sm text-[#6B7280]">{child.className}</p>
              <p className="mt-2 text-xs text-[#6B7280]">
                {child.progress.topicsCompleted}/{child.progress.topicsTotal} topics • Avg{" "}
                {child.progress.testAverage}%
              </p>
            </SeniorsCard>

            <div className="space-y-4">
              <SeniorsCard>
                <div className="mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#EA580C]" />
                  <p className="font-semibold text-[#1F2937]">Alerts</p>
                </div>
                {child.alerts.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">No urgent alerts right now.</p>
                ) : (
                  <ul className="space-y-2">
                    {child.alerts.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-start gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3"
                      >
                        <span
                          className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${
                            a.type === "overdue"
                              ? "bg-[#FEF2F2] text-[#DC2626]"
                              : a.type === "exam"
                                ? "bg-[var(--sp-brand-soft)] text-[var(--sp-brand-text)]"
                                : "bg-[#FFEDD5] text-[#EA580C]"
                          }`}
                        >
                          {a.type === "exam" ? (
                            <Calendar className="h-4 w-4" />
                          ) : (
                            <ClipboardList className="h-4 w-4" />
                          )}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-[#1F2937]">{a.title}</p>
                          <p className="text-xs text-[#6B7280]">{a.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SeniorsCard>

              <SeniorsCard>
                <p className="font-semibold text-[#1F2937]">Subject progress</p>
                <div className="mt-3 space-y-3">
                  {child.subjectProgress.map((s) => (
                    <div key={s.name}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-[#374151]">{s.name}</span>
                        <span className="text-[#6B7280]">
                          {s.completed}/{s.total} ({s.percent}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
                        <div
                          className="h-full rounded-full bg-[var(--sp-brand)]"
                          style={{ width: `${s.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </SeniorsCard>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SeniorsCard>
              <p className="font-semibold">Recent quizzes</p>
              {child.recentQuizzes.length === 0 ? (
                <p className="mt-2 text-sm text-[#6B7280]">No quiz attempts yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {child.recentQuizzes.map((q) => (
                    <li
                      key={q.id}
                      className="flex items-center justify-between rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
                    >
                      <span>{q.title}</span>
                      <span className="font-medium text-[#1F2937]">
                        {q.score}/{q.maxScore}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SeniorsCard>

            <SeniorsCard>
              <div className="mb-2 flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-[#EA580C]" />
                <p className="font-semibold">School announcements</p>
              </div>
              <ul className="space-y-2">
                {announcements.slice(0, 4).map((a) => (
                  <li key={a.id} className="rounded-lg border border-[#E5E7EB] p-3">
                    <p className="text-sm font-medium">{a.title}</p>
                    {a.body ? <p className="mt-1 text-xs text-[#6B7280]">{a.body}</p> : null}
                  </li>
                ))}
              </ul>
            </SeniorsCard>
          </div>
        </div>
      )}
    </>
  );
}
