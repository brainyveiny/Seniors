"use client";

import { useState } from "react";
import { ChevronDown, ClipboardList, FileText } from "lucide-react";
import { SeniorsCard } from "@/presentation/components/templates/seniors/shared/SeniorsUi";
import { formatDateTime } from "@/shared/lib/format-date";

export type ClassworkAdminData = {
  section: "classwork";
  assignments: {
    id: string;
    title: string;
    className: string;
    dueAt: Date | string;
    submissionCount: number;
    submissions: {
      id: string;
      studentName: string;
      status: string;
      score: number | null;
      submittedAt: Date | string | null;
    }[];
  }[];
  quizzes: {
    id: string;
    title: string;
    topicTitle: string;
    subjectName: string;
    className: string;
    attemptCount: number;
    attempts: {
      id: string;
      studentName: string;
      score: number | null;
      maxScore: number | null;
      submittedAt: Date | string | null;
    }[];
    updatedAt: Date | string;
  }[];
};

export function SchoolAdminClassworkPanel({ data }: { data: ClassworkAdminData }) {
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E40AF]">
        View assignment submissions and quiz results across all classes. Teachers grade work from
        their Assignments and Exams pages.
      </div>

      <SeniorsCard pastel="blue" className="overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-white/40 px-5 py-4">
          <ClipboardList className="h-4 w-4 text-[#2563EB]" />
          <h3 className="text-base font-bold text-[#111827]">Assignment submissions</h3>
        </div>
        {data.assignments.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[#6B7280]">No assignments yet.</p>
        ) : (
          <ul className="divide-y divide-[#F3F4F6]">
            {data.assignments.map((a) => {
              const expanded = expandedAssignmentId === a.id;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-[#F9FAFB]"
                    onClick={() =>
                      setExpandedAssignmentId((current) =>
                        current === a.id ? null : a.id,
                      )
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#111827]">{a.title}</p>
                      <p className="mt-0.5 text-sm text-[#6B7280]">
                        {a.className} · Due {formatDateTime(a.dueAt)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#374151]">
                        {a.submissionCount} submission{a.submissionCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <ChevronDown
                      className={`mt-1 h-4 w-4 shrink-0 text-[#9CA3AF] transition-transform ${
                        expanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expanded && a.submissions.length > 0 ? (
                    <div className="border-t border-[#F3F4F6] bg-[#F8FAFC] px-5 py-3">
                      <ul className="space-y-2">
                        {a.submissions.map((s) => (
                          <li
                            key={s.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm"
                          >
                            <span className="font-medium text-[#111827]">{s.studentName}</span>
                            <span className="text-xs text-[#6B7280]">
                              {s.submittedAt ? formatDateTime(s.submittedAt) : "Submitted"} ·{" "}
                              {s.status === "graded"
                                ? `Score ${s.score ?? "—"}`
                                : "Awaiting grade"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : expanded ? (
                    <p className="border-t border-[#F3F4F6] px-5 py-3 text-sm text-[#9CA3AF]">
                      No submissions yet.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </SeniorsCard>

      <SeniorsCard pastel="purple" className="overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-white/40 px-5 py-4">
          <FileText className="h-4 w-4 text-[#4F46E5]" />
          <h3 className="text-base font-bold text-[#111827]">Quiz results</h3>
        </div>
        {data.quizzes.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[#6B7280]">No quizzes yet.</p>
        ) : (
          <ul className="divide-y divide-[#F3F4F6]">
            {data.quizzes.map((q) => {
              const expanded = expandedQuizId === q.id;
              const meta = [q.subjectName, q.topicTitle, q.className]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-[#F9FAFB]"
                    onClick={() =>
                      setExpandedQuizId((current) => (current === q.id ? null : q.id))
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#111827]">{q.title}</p>
                      {meta ? <p className="mt-0.5 text-sm text-[#6B7280]">{meta}</p> : null}
                      <p className="mt-1 text-xs font-semibold text-[#374151]">
                        {q.attemptCount} attempt{q.attemptCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <ChevronDown
                      className={`mt-1 h-4 w-4 shrink-0 text-[#9CA3AF] transition-transform ${
                        expanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expanded && q.attempts.length > 0 ? (
                    <div className="border-t border-[#F3F4F6] bg-[#F8FAFC] px-5 py-3">
                      <ul className="space-y-2">
                        {q.attempts.map((attempt) => {
                          const percent =
                            attempt.score != null &&
                            attempt.maxScore != null &&
                            attempt.maxScore > 0
                              ? Math.round((attempt.score / attempt.maxScore) * 100)
                              : null;
                          return (
                            <li
                              key={attempt.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm"
                            >
                              <span className="font-medium text-[#111827]">
                                {attempt.studentName}
                              </span>
                              <span className="text-xs text-[#6B7280]">
                                {attempt.submittedAt
                                  ? formatDateTime(attempt.submittedAt)
                                  : "Attempted"}{" "}
                                · {attempt.score ?? "—"}/{attempt.maxScore ?? "—"}
                                {percent != null ? ` (${percent}%)` : ""}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : expanded ? (
                    <p className="border-t border-[#F3F4F6] px-5 py-3 text-sm text-[#9CA3AF]">
                      No attempts yet.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </SeniorsCard>
    </div>
  );
}
