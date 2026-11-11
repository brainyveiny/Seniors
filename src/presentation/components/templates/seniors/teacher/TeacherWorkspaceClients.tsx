"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  Eye,
  FileText,
  Mail,
  Paperclip,
  Phone,
  Search,
  Upload,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  SeniorsCard,
  SeniorsEmptyState,
} from "@/presentation/components/templates/seniors/shared/SeniorsUi";
import { SENIORS_PASTEL } from "@/presentation/components/templates/seniors/shared/seniors-nav";
import { TeacherTopicStudio } from "@/presentation/components/templates/seniors/teacher/TeacherTopicStudio";
import { uploadSeniorsAttachment } from "@/application/services/seniors-media-upload";
import { formatDate, formatDateTime } from "@/shared/lib/format-date";

const INPUT =
  "w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm text-[#1F2937] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:outline-none";
const LABEL = "mb-1 block text-xs font-medium text-[#6B7280]";
const BTN_PRIMARY =
  "rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60";
const BTN_GHOST =
  "rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm font-medium text-[#374151] hover:bg-white";

type TopicOption = {
  id: string;
  slug?: string;
  title: string;
  number: string;
  subjectId?: string;
  subjectName: string;
  classLabel?: string;
  chapterName: string;
  contentStatus: string;
};

type ContentRow = {
  id: string;
  title: string;
  contentType: string;
  topicTitle: string;
  subjectName: string;
  chapterName: string;
  uploadedByName: string;
  updatedAt: Date | string;
};

type AssignmentRow = {
  id: string;
  title: string;
  description: string;
  subjectName: string;
  chapterName: string;
  targetClassId?: string | null;
  targetClassName?: string | null;
  dueAt: Date | string;
  questionCount: number;
  attachmentUrls?: string[];
  createdByName: string;
  topicIds: string[];
  expectedStudentCount?: number;
  notSubmittedStudents?: { id: string; name: string }[];
  submissions: {
    id: string;
    studentId: string;
    studentName: string;
    status: string;
    answerText: string;
    attachmentUrls?: string[];
    score: number | null;
    feedback: string;
    submittedAt: Date | string | null;
  }[];
};

type QuizRow = {
  id: string;
  title: string;
  topicId: string;
  topicTitle: string;
  subjectName: string;
  chapterName: string;
  questionCount: number;
  attemptCount: number;
  className?: string;
  attemptedStudentCount?: number;
  eligibleStudentCount?: number;
  averagePercent?: number | null;
  highestPercent?: number | null;
  attempts?: {
    id: string;
    studentId: string;
    studentName: string;
    score: number | null;
    maxScore: number | null;
    submittedAt: Date | string | null;
  }[];
  notAttemptedStudents?: { id: string; name: string }[];
  updatedAt: Date | string;
};

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  publishedAt: Date | string;
  createdByName: string;
  audienceType?: string;
  targetClassIds?: string[];
  targetUserIds?: string[];
  audienceLabel?: string;
};

type AnnouncementStudentOption = {
  id: string;
  name: string;
  classId: string;
  className: string;
};

type StudentRecord = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  className: string;
  classId?: string;
  rollNumber: string;
  topicsCompleted: number;
  totalTopics?: number;
  quizAverage: number | null;
  quizAttemptCount?: number;
  assignmentsAssigned?: number;
  assignmentsSubmitted?: number;
  missingAssignments?: {
    id: string;
    title: string;
    dueAt: Date | string;
  }[];
  recentQuizAttempts?: {
    id: string;
    title: string;
    topicTitle: string;
    subjectName: string;
    score: number | null;
    maxScore: number | null;
    submittedAt: Date | string | null;
  }[];
  attentionReasons?: string[];
  needsAttention?: boolean;
  parents?: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  }[];
};

export type TeacherWorkspaceData = {
  topics: TopicOption[];
  contents: ContentRow[];
  assignments: AssignmentRow[];
  quizzes: QuizRow[];
  schoolNotices?: AnnouncementRow[];
  announcements: AnnouncementRow[];
  studentRecords: StudentRecord[];
  classes?: { id: string; name: string; section: string }[];
  announcementStudents?: AnnouncementStudentOption[];
  curriculumSubjects?: {
    id: string;
    name: string;
    classLabel: string;
    chapters: { id: string; name: string; number: number }[];
  }[];
  scope?: {
    hasAssignments: boolean;
    classIds: string[];
    subjectIds: string[];
    assignments: {
      id: string;
      classId: string;
      className: string;
      section: string;
      subjectId: string;
      subjectName: string;
    }[];
  };
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      {children}
    </label>
  );
}

export function TeacherContentClient({ data }: { data: TeacherWorkspaceData }) {
  return (
    <TeacherTopicStudio
      topics={data.topics}
      contents={data.contents}
      quizzes={data.quizzes}
      curriculumSubjects={data.curriculumSubjects ?? []}
      scope={data.scope}
    />
  );
}

export function TeacherAssignmentsClient({
  data,
  resultsOnly = false,
}: {
  data: TeacherWorkspaceData;
  resultsOnly?: boolean;
}) {
  const ctx = useSeniorsSite();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [assignments, setAssignments] = useState(data.assignments);
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(
    null,
  );
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    subjectName: "",
    chapterName: "",
    dueAt: "",
    questionCount: "5",
    topicId: data.topics[0]?.id ?? "",
    targetClassId: data.classes?.[0]?.id ?? "",
  });

  useEffect(() => {
    if (!showForm) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowForm(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showForm]);

  useEffect(() => {
    if (searchParams.get("review") !== "1") return;
    const target = data.assignments.find((a) =>
      a.submissions.some((s) => s.status !== "pending" && s.status !== "graded"),
    );
    if (target) setExpandedAssignmentId(target.id);
  }, [data.assignments, searchParams]);

  async function uploadAttachment(file: File | undefined) {
    if (!file) return;
    setUploadingFile(true);
    setError("");
    try {
      const url = await uploadSeniorsAttachment(ctx.tenant, file);
      setAttachmentUrls((prev) => [...prev, url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingFile(false);
    }
  }

  async function createAssignment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tenants/${ctx.tenant}/seniors/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          subjectName: form.subjectName,
          chapterName: form.chapterName,
          dueAt: form.dueAt,
          questionCount: Number(form.questionCount) || 0,
          topicIds: form.topicId ? [form.topicId] : [],
          targetClassId: form.targetClassId || null,
          attachmentUrls,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      const target = data.classes?.find((c) => c.id === form.targetClassId);
      setAssignments((prev) => [
        {
          id: json.assignment.id,
          title: form.title,
          description: form.description,
          subjectName: form.subjectName,
          chapterName: form.chapterName,
          targetClassId: form.targetClassId || null,
          targetClassName: target ? `${target.name} ${target.section}`.trim() : null,
          dueAt: form.dueAt,
          questionCount: Number(form.questionCount) || 0,
          attachmentUrls,
          createdByName: "You",
          topicIds: form.topicId ? [form.topicId] : [],
          expectedStudentCount: 0,
          notSubmittedStudents: [],
          submissions: [],
        },
        ...prev,
      ]);
      setShowForm(false);
      setAttachmentUrls([]);
      setForm((f) => ({ ...f, title: "", description: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function grade(submissionId: string, assignmentId: string) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tenants/${ctx.tenant}/seniors/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grade",
          submissionId,
          score: Number(gradeScore),
          feedback: gradeFeedback,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Grade failed");
      setAssignments((prev) =>
        prev.map((a) =>
          a.id !== assignmentId
            ? a
            : {
                ...a,
                submissions: a.submissions.map((s) =>
                  s.id === submissionId
                    ? {
                        ...s,
                        status: "graded",
                        score: Number(gradeScore),
                        feedback: gradeFeedback,
                      }
                    : s,
                ),
              },
        ),
      );
      setGradingId(null);
      setGradeScore("");
      setGradeFeedback("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Grade failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mb-4 rounded-lg bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E40AF]">
        Click any assignment below to view student submissions and grade their work.
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[#6B7280]">
            {assignments.length === 0
              ? "No assignments yet"
              : `${assignments.length} assignment${assignments.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {resultsOnly ? null : (
          <button
            type="button"
            className={`inline-flex items-center gap-2 ${BTN_PRIMARY}`}
            onClick={() => setShowForm(true)}
          >
            <span className="text-base leading-none">+</span>
            New assignment
          </button>
        )}
      </div>

      {showForm && !resultsOnly ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4"
          role="presentation"
          onClick={() => setShowForm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="New assignment"
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#F3F4F6] px-5 py-4">
              <p className="text-sm font-semibold text-[#111827]">New assignment</p>
              <button
                type="button"
                className="text-xs font-semibold text-[#6B7280] hover:text-[#111827]"
                onClick={() => setShowForm(false)}
              >
                Close
              </button>
            </div>
            <form
              onSubmit={createAssignment}
              className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Title">
                  <input
                    className={INPUT}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Life processes worksheet"
                    required
                    autoFocus
                  />
                </Field>
                <Field label="Due date">
                  <input
                    type="datetime-local"
                    className={INPUT}
                    value={form.dueAt}
                    onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Subject">
                  <input
                    className={INPUT}
                    value={form.subjectName}
                    onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
                    placeholder="Subject name"
                  />
                </Field>
                <Field label="Chapter">
                  <input
                    className={INPUT}
                    value={form.chapterName}
                    onChange={(e) => setForm({ ...form, chapterName: e.target.value })}
                    placeholder="Chapter name"
                  />
                </Field>
                <Field label="Linked topic">
                  <select
                    className={INPUT}
                    value={form.topicId}
                    onChange={(e) => setForm({ ...form, topicId: e.target.value })}
                  >
                    {data.topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.subjectName} / {t.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Target class">
                  <select
                    className={INPUT}
                    value={form.targetClassId}
                    onChange={(e) => setForm({ ...form, targetClassId: e.target.value })}
                  >
                    <option value="">Whole school</option>
                    {(data.classes ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Points / question count">
                  <input
                    type="number"
                    min={0}
                    className={INPUT}
                    value={form.questionCount}
                    onChange={(e) => setForm({ ...form, questionCount: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Instructions">
                <textarea
                  className={INPUT}
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Tell students what to do…"
                />
              </Field>
              <Field label="Attachments (PDF / images)">
                <div className="space-y-2">
                  <label className={`${BTN_GHOST} inline-flex cursor-pointer items-center gap-2`}>
                    <Upload className="h-4 w-4" />
                    {uploadingFile ? "Uploading…" : "Upload file"}
                    <input
                      type="file"
                      accept="application/pdf,.pdf,image/*"
                      className="hidden"
                      disabled={uploadingFile}
                      onChange={(e) => {
                        void uploadAttachment(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {attachmentUrls.length > 0 ? (
                    <ul className="space-y-1">
                      {attachmentUrls.map((url, i) => (
                        <li
                          key={`${url}-${i}`}
                          className="flex items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-xs"
                        >
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate font-medium text-[#2563EB] hover:underline"
                          >
                            Attachment {i + 1}
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
              </Field>
              {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
              <div className="flex flex-wrap gap-2 border-t border-[#F3F4F6] pt-4">
                <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                  {saving ? "Assigning…" : "Assign to class"}
                </button>
                <button
                  type="button"
                  className={BTN_GHOST}
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div
        className="overflow-hidden rounded-2xl border border-white/50 shadow-sm"
        style={{ backgroundColor: SENIORS_PASTEL.blue }}
      >
        {assignments.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-[#D1D5DB]" />
            <p className="mt-3 text-sm font-semibold text-[#111827]">No classwork yet</p>
            <p className="mt-1 text-sm text-[#6B7280]">
              Create an assignment to share work with your class.
            </p>
            {resultsOnly ? null : (
              <button
                type="button"
                className={`mt-5 inline-flex items-center gap-2 ${BTN_PRIMARY}`}
                onClick={() => setShowForm(true)}
              >
                <span className="text-base leading-none">+</span>
                Create first assignment
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-[#F3F4F6]">
            {assignments.map((a) => {
              const turnedIn = a.submissions.filter((s) => s.status !== "pending");
              const gradedCount = turnedIn.filter((s) => s.status === "graded").length;
              const expected =
                a.expectedStudentCount ??
                (a.notSubmittedStudents?.length ?? 0) + turnedIn.length;
              const notSubmittedCount =
                a.notSubmittedStudents?.length ??
                Math.max((a.expectedStudentCount ?? 0) - turnedIn.length, 0);
              const expanded = expandedAssignmentId === a.id;
              const meta = [a.subjectName, a.chapterName].filter(Boolean).join(" · ");

              return (
                <li key={a.id} className={expanded ? "bg-[#F8FAFC]" : undefined}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-[#F9FAFB]"
                    aria-expanded={expanded}
                    onClick={() =>
                      setExpandedAssignmentId((current) =>
                        current === a.id ? null : a.id,
                      )
                    }
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold text-[#111827]">
                            {a.title}
                          </h3>
                          {meta ? (
                            <p className="mt-0.5 text-sm text-[#6B7280]">{meta}</p>
                          ) : null}
                        </div>
                        <ChevronDown
                          className={`mt-1 h-4 w-4 shrink-0 text-[#9CA3AF] transition-transform ${
                            expanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6B7280]">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock className="h-3.5 w-3.5 text-[#9CA3AF]" />
                          Due {formatDateTime(a.dueAt)}
                        </span>
                        {a.targetClassName ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-[#9CA3AF]" />
                            {a.targetClassName}
                          </span>
                        ) : null}
                        <span>By {a.createdByName || "Teacher"}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-md bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-semibold text-[#374151]">
                          {turnedIn.length}
                          {expected > 0 ? `/${expected}` : ""} submitted
                        </span>
                        {gradedCount > 0 ? (
                          <span className="rounded-md bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#047857]">
                            {gradedCount} graded
                          </span>
                        ) : null}
                        {notSubmittedCount > 0 ? (
                          <span className="rounded-md bg-[#FFF7ED] px-2 py-0.5 text-[11px] font-semibold text-[#C2410C]">
                            {notSubmittedCount} pending
                          </span>
                        ) : (
                          <span className="rounded-md bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#047857]">
                            All in
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {expanded ? (
                    <div className="space-y-4 border-t border-[#E5E7EB] bg-white px-5 py-4">
                      {a.description ? (
                        <p className="max-w-3xl text-sm leading-relaxed text-[#4B5563]">
                          {a.description}
                        </p>
                      ) : null}

                      {(a.attachmentUrls?.length ?? 0) > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {a.attachmentUrls!.map((url, i) => (
                            <a
                              key={`${a.id}-att-${i}`}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1.5 text-xs font-medium text-[#2563EB] hover:bg-[#EFF6FF]"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              Attachment {i + 1}
                            </a>
                          ))}
                        </div>
                      ) : null}

                      {(a.notSubmittedStudents?.length ?? 0) > 0 ? (
                        <div className="rounded-xl border border-[#F3F4F6] bg-[#F9FAFB] px-4 py-3">
                          <p className="text-xs font-semibold text-[#6B7280]">
                            Not submitted ({a.notSubmittedStudents!.length})
                          </p>
                          <p className="mt-1 text-sm text-[#374151]">
                            {a.notSubmittedStudents!.map((student) => student.name).join(", ")}
                          </p>
                        </div>
                      ) : null}

                      {turnedIn.length > 0 ? (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                            Submissions ({turnedIn.length})
                          </p>
                          <div className="overflow-hidden rounded-xl border border-[#E5E7EB]">
                            {turnedIn.map((s, index) => {
                              const answer = s.answerText?.trim() ?? "";
                              return (
                                <div
                                  key={s.id}
                                  className={`px-3 py-2.5 ${
                                    index > 0 ? "border-t border-[#F3F4F6]" : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[11px] font-bold text-[#1D4ED8]">
                                      {(s.studentName || "?").slice(0, 1).toUpperCase()}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                        <p className="truncate text-sm font-semibold text-[#111827]">
                                          {s.studentName}
                                        </p>
                                        {s.submittedAt ? (
                                          <span className="text-[11px] text-[#9CA3AF]">
                                            {formatDateTime(s.submittedAt)}
                                          </span>
                                        ) : null}
                                      </div>
                                      <p className="mt-0.5 truncate text-xs text-[#6B7280]">
                                        {answer || "No written answer"}
                                      </p>
                                    </div>
                                    {(s.attachmentUrls?.length ?? 0) > 0 ? (
                                      <div className="flex shrink-0 items-center gap-1">
                                        {s.attachmentUrls!.map((url, i) => (
                                          <a
                                            key={`${s.id}-file-${i}`}
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#DBEAFE] bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE]"
                                            title={`Student file ${i + 1}`}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <Paperclip className="h-3.5 w-3.5" />
                                          </a>
                                        ))}
                                      </div>
                                    ) : null}
                                    {s.status === "graded" ? (
                                      <div className="shrink-0 text-right">
                                        <p className="text-sm font-semibold text-[#047857]">
                                          {s.score}
                                        </p>
                                        {s.feedback ? (
                                          <p className="max-w-[9rem] truncate text-[11px] text-[#6B7280]">
                                            {s.feedback}
                                          </p>
                                        ) : (
                                          <p className="text-[11px] font-medium text-[#047857]">
                                            Graded
                                          </p>
                                        )}
                                      </div>
                                    ) : gradingId === s.id ? null : (
                                      <button
                                        type="button"
                                        className="shrink-0 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB]"
                                        onClick={() => setGradingId(s.id)}
                                      >
                                        Grade
                                      </button>
                                    )}
                                  </div>
                                  {gradingId === s.id ? (
                                    <div className="mt-2 grid gap-2 pl-10 sm:grid-cols-[100px_1fr_auto]">
                                      <input
                                        className={INPUT}
                                        type="number"
                                        placeholder="Score"
                                        value={gradeScore}
                                        onChange={(e) => setGradeScore(e.target.value)}
                                      />
                                      <input
                                        className={INPUT}
                                        placeholder="Feedback"
                                        value={gradeFeedback}
                                        onChange={(e) => setGradeFeedback(e.target.value)}
                                      />
                                      <div className="flex gap-1.5">
                                        <button
                                          type="button"
                                          className={BTN_PRIMARY}
                                          disabled={saving}
                                          onClick={() => grade(s.id, a.id)}
                                        >
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          className={BTN_GHOST}
                                          onClick={() => {
                                            setGradingId(null);
                                            setGradeScore("");
                                            setGradeFeedback("");
                                          }}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-[#9CA3AF]">No submissions yet.</p>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

export function TeacherQuizzesClient({
  data,
  resultsOnly = false,
}: {
  data: TeacherWorkspaceData;
  resultsOnly?: boolean;
}) {
  const ctx = useSeniorsSite();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [quizzes, setQuizzes] = useState(data.quizzes);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);
  const [form, setForm] = useState({
    topicId: data.topics[0]?.id ?? "",
    title: "",
    prompt: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctIndex: 0,
  });
  const [questions, setQuestions] = useState<
    { id: string; prompt: string; options: string[]; correctIndex: number }[]
  >([]);

  useEffect(() => {
    if (!showForm) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowForm(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showForm]);

  function addQuestion() {
    const options = [form.optionA, form.optionB, form.optionC, form.optionD]
      .map((o) => o.trim())
      .filter(Boolean);
    if (!form.prompt.trim() || options.length < 2) {
      setError("Add a question and at least 2 options");
      return;
    }
    if (form.correctIndex < 0 || form.correctIndex >= options.length) {
      setError("Pick the correct option");
      return;
    }
    setQuestions((prev) => [
      ...prev,
      {
        id: `q${prev.length + 1}`,
        prompt: form.prompt.trim(),
        options,
        correctIndex: form.correctIndex,
      },
    ]);
    setForm((f) => ({
      ...f,
      prompt: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctIndex: 0,
    }));
    setError("");
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  async function saveQuiz(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || questions.length === 0) {
      setError("Title and at least one question required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tenants/${ctx.tenant}/seniors/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: form.topicId,
          title: form.title,
          questions,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      const topic = data.topics.find((t) => t.id === form.topicId);
      setQuizzes((prev) => [
        {
          id: json.quiz.id,
          title: form.title,
          topicId: form.topicId,
          topicTitle: topic?.title ?? "",
          subjectName: topic?.subjectName ?? "",
          chapterName: topic?.chapterName ?? "",
          questionCount: questions.length,
          attemptCount: 0,
          attemptedStudentCount: 0,
          eligibleStudentCount: 0,
          averagePercent: null,
          highestPercent: null,
          attempts: [],
          notAttemptedStudents: [],
          updatedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setShowForm(false);
      setQuestions([]);
      setForm((f) => ({
        ...f,
        title: "",
        prompt: "",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctIndex: 0,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const optionFields = [
    { key: "optionA" as const, label: "A" },
    { key: "optionB" as const, label: "B" },
    { key: "optionC" as const, label: "C" },
    { key: "optionD" as const, label: "D" },
  ];

  return (
    <>
      <div className="mb-4 rounded-lg bg-[#EEF2FF] px-4 py-3 text-sm text-[#4338CA]">
        Click any quiz below to see who attempted it and view their scores.
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#6B7280]">
          {quizzes.length === 0
            ? "No quizzes yet"
            : `${quizzes.length} quiz${quizzes.length === 1 ? "" : "zes"}`}
        </p>
        {resultsOnly ? null : (
          <button
            type="button"
            className={`inline-flex items-center gap-2 ${BTN_PRIMARY}`}
            onClick={() => setShowForm(true)}
          >
            <span className="text-base leading-none">+</span>
            New quiz
          </button>
        )}
      </div>

      {showForm && !resultsOnly ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4"
          role="presentation"
          onClick={() => setShowForm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="New quiz"
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#F3F4F6] px-5 py-4">
              <p className="text-sm font-semibold text-[#111827]">New quiz</p>
              <button
                type="button"
                className="text-xs font-semibold text-[#6B7280] hover:text-[#111827]"
                onClick={() => setShowForm(false)}
              >
                Close
              </button>
            </div>

            <form
              onSubmit={saveQuiz}
              className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Topic">
                  <select
                    className={INPUT}
                    value={form.topicId}
                    onChange={(e) => setForm({ ...form, topicId: e.target.value })}
                  >
                    {data.topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.subjectName} / {t.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Quiz title">
                  <input
                    className={INPUT}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Quick check"
                    required
                    autoFocus
                  />
                </Field>
              </div>

              {questions.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-[#E5E7EB]">
                  {questions.map((q, i) => (
                    <div
                      key={q.id}
                      className={`flex items-start justify-between gap-3 px-3 py-2.5 ${
                        i > 0 ? "border-t border-[#F3F4F6]" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#111827]">
                          {i + 1}. {q.prompt}
                        </p>
                        <p className="mt-0.5 text-xs text-[#6B7280]">
                          {q.options.length} options · Correct:{" "}
                          {String.fromCharCode(65 + q.correctIndex)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-xs font-semibold text-[#B91C1C]"
                        onClick={() => removeQuestion(q.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  Add question {questions.length + 1}
                </p>
                <Field label="Question">
                  <textarea
                    className={INPUT}
                    rows={2}
                    value={form.prompt}
                    onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                    placeholder="Write the question…"
                  />
                </Field>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {optionFields.map((opt, index) => (
                    <label
                      key={opt.key}
                      className={`block rounded-xl border p-2.5 ${
                        form.correctIndex === index
                          ? "border-[#86EFAC] bg-[#F0FDF4]"
                          : "border-[#E5E7EB] bg-white"
                      }`}
                    >
                      <span className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                        Option {opt.label}
                        <button
                          type="button"
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            form.correctIndex === index
                              ? "bg-[#059669] text-white"
                              : "bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]"
                          }`}
                          onClick={() => setForm({ ...form, correctIndex: index })}
                        >
                          {form.correctIndex === index ? "Correct" : "Mark correct"}
                        </button>
                      </span>
                      <input
                        className={INPUT}
                        value={form[opt.key]}
                        onChange={(e) =>
                          setForm({ ...form, [opt.key]: e.target.value })
                        }
                        placeholder={`Option ${opt.label}`}
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className={`${BTN_GHOST} mt-3`}
                  onClick={addQuestion}
                >
                  Add question
                </button>
              </div>

              {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}

              <div className="flex flex-wrap gap-2 border-t border-[#F3F4F6] pt-4">
                <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                  {saving ? "Saving…" : "Save quiz"}
                </button>
                <button
                  type="button"
                  className={BTN_GHOST}
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div
        className="overflow-hidden rounded-2xl border border-white/50 shadow-sm"
        style={{ backgroundColor: SENIORS_PASTEL.purple }}
      >
        {quizzes.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-[#D1D5DB]" />
            <p className="mt-3 text-sm font-semibold text-[#111827]">No quizzes yet</p>
            <p className="mt-1 text-sm text-[#6B7280]">
              Create a quiz for one of your topics.
            </p>
            {resultsOnly ? null : (
              <button
                type="button"
                className={`mt-5 inline-flex items-center gap-2 ${BTN_PRIMARY}`}
                onClick={() => setShowForm(true)}
              >
                <span className="text-base leading-none">+</span>
                Create first quiz
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-[#F3F4F6]">
            {quizzes.map((q) => {
              const expanded = expandedQuizId === q.id;
              const attempted = q.attemptedStudentCount ?? q.attemptCount;
              const eligible = q.eligibleStudentCount ?? 0;
              const notAttemptedCount =
                q.notAttemptedStudents?.length ??
                Math.max(eligible - attempted, 0);
              const meta = [q.subjectName, q.chapterName, q.topicTitle]
                .filter(Boolean)
                .join(" · ");

              return (
                <li key={q.id} className={expanded ? "bg-[#F8FAFC]" : undefined}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-[#F9FAFB]"
                    aria-expanded={expanded}
                    onClick={() =>
                      setExpandedQuizId((current) =>
                        current === q.id ? null : q.id,
                      )
                    }
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold text-[#111827]">
                            {q.title}
                          </h3>
                          {meta ? (
                            <p className="mt-0.5 text-sm text-[#6B7280]">{meta}</p>
                          ) : null}
                        </div>
                        <ChevronDown
                          className={`mt-1 h-4 w-4 shrink-0 text-[#9CA3AF] transition-transform ${
                            expanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6B7280]">
                        <span>
                          {q.questionCount} question{q.questionCount === 1 ? "" : "s"}
                        </span>
                        {q.className ? <span>{q.className}</span> : null}
                        <span>Updated {formatDate(q.updatedAt)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-md bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-semibold text-[#374151]">
                          {attempted}
                          {eligible > 0 ? `/${eligible}` : ""} attempted
                        </span>
                        {q.averagePercent != null ? (
                          <span className="rounded-md bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#047857]">
                            Avg {q.averagePercent}%
                          </span>
                        ) : null}
                        {notAttemptedCount > 0 ? (
                          <span className="rounded-md bg-[#FFF7ED] px-2 py-0.5 text-[11px] font-semibold text-[#C2410C]">
                            {notAttemptedCount} pending
                          </span>
                        ) : attempted > 0 ? (
                          <span className="rounded-md bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#047857]">
                            All attempted
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>

                  {expanded ? (
                    <div className="space-y-3 border-t border-[#E5E7EB] bg-white px-5 py-4">
                      <div className="flex flex-wrap gap-4 text-sm text-[#4B5563]">
                        <span>
                          Attempts:{" "}
                          <strong className="text-[#111827]">{q.attemptCount}</strong>
                        </span>
                        <span>
                          Average:{" "}
                          <strong className="text-[#111827]">
                            {q.averagePercent != null ? `${q.averagePercent}%` : "—"}
                          </strong>
                        </span>
                        <span>
                          Highest:{" "}
                          <strong className="text-[#111827]">
                            {q.highestPercent != null ? `${q.highestPercent}%` : "—"}
                          </strong>
                        </span>
                      </div>

                      {(q.attempts?.length ?? 0) > 0 ? (
                        <div className="overflow-hidden rounded-xl border border-[#E5E7EB]">
                          <div className="border-b border-[#F3F4F6] px-3 py-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                              Results ({q.attempts!.length})
                            </p>
                          </div>
                          {q.attempts!.map((attempt, index) => {
                            const percent =
                              attempt.score != null &&
                              attempt.maxScore != null &&
                              attempt.maxScore > 0
                                ? Math.round((attempt.score / attempt.maxScore) * 100)
                                : null;
                            return (
                              <div
                                key={attempt.id}
                                className={`flex items-center gap-3 px-3 py-2 ${
                                  index > 0 ? "border-t border-[#F3F4F6]" : ""
                                }`}
                              >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[11px] font-bold text-[#4F46E5]">
                                  {(attempt.studentName || "?").slice(0, 1).toUpperCase()}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-[#111827]">
                                    {attempt.studentName}
                                  </p>
                                  <p className="text-[11px] text-[#9CA3AF]">
                                    {attempt.submittedAt
                                      ? formatDateTime(attempt.submittedAt)
                                      : "Attempted"}
                                  </p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-sm font-semibold text-[#047857]">
                                    {attempt.score ?? "—"}/{attempt.maxScore ?? "—"}
                                  </p>
                                  {percent != null ? (
                                    <p className="text-[11px] text-[#6B7280]">{percent}%</p>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-[#9CA3AF]">
                          No student has attempted this quiz yet.
                        </p>
                      )}

                      {(q.notAttemptedStudents?.length ?? 0) > 0 ? (
                        <div className="rounded-xl border border-[#F3F4F6] bg-[#F9FAFB] px-3 py-2.5">
                          <p className="text-xs font-semibold text-[#6B7280]">
                            Not attempted ({q.notAttemptedStudents!.length})
                          </p>
                          <p className="mt-1 text-sm text-[#374151]">
                            {q.notAttemptedStudents!
                              .map((student) => student.name)
                              .join(", ")}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

export function TeacherAnnouncementsClient({ data }: { data: TeacherWorkspaceData }) {
  const ctx = useSeniorsSite();
  const schoolNotices = data.schoolNotices ?? [];
  const classes = data.classes ?? [];
  const students = data.announcementStudents ?? [];
  const [items, setItems] = useState(data.announcements);
  const [filter, setFilter] = useState<"all" | "school" | "mine">("all");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audienceMode, setAudienceMode] = useState<"all" | "classes" | "students">("all");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!showForm) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowForm(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showForm]);

  const filteredStudents = useMemo(() => {
    const needle = studentQuery.trim().toLowerCase();
    return students.filter((student) => {
      if (
        audienceMode === "classes" &&
        selectedClassIds.length > 0 &&
        !selectedClassIds.includes(student.classId)
      ) {
        return false;
      }
      if (!needle) return true;
      return (
        student.name.toLowerCase().includes(needle) ||
        student.className.toLowerCase().includes(needle)
      );
    });
  }, [audienceMode, selectedClassIds, studentQuery, students]);

  const feed = useMemo(() => {
    const school = schoolNotices.map((a) => ({
      ...a,
      source: "school" as const,
    }));
    const mine = items.map((a) => ({
      ...a,
      source: "mine" as const,
    }));
    const merged = [...school, ...mine].sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
    if (filter === "school") return merged.filter((a) => a.source === "school");
    if (filter === "mine") return merged.filter((a) => a.source === "mine");
    return merged;
  }, [filter, items, schoolNotices]);

  function resetForm() {
    setTitle("");
    setBody("");
    setAudienceMode("all");
    setSelectedClassIds([]);
    setSelectedStudentIds([]);
    setStudentQuery("");
    setError("");
  }

  function toggleId(list: string[], id: string) {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
  }

  function audienceSummary() {
    if (audienceMode === "students") {
      if (selectedStudentIds.length === 0) return "Pick at least one student";
      if (selectedStudentIds.length <= 3) {
        return selectedStudentIds
          .map((id) => students.find((s) => s.id === id)?.name ?? "Student")
          .join(", ");
      }
      return `${selectedStudentIds.length} students`;
    }
    if (audienceMode === "classes") {
      if (selectedClassIds.length === 0) return "Pick at least one class";
      return selectedClassIds
        .map((id) => {
          const klass = classes.find((c) => c.id === id);
          return klass ? `${klass.name} ${klass.section}`.trim() : "Class";
        })
        .join(", ");
    }
    return "All students";
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (audienceMode === "classes" && selectedClassIds.length === 0) {
      setError("Pick at least one class");
      return;
    }
    if (audienceMode === "students" && selectedStudentIds.length === 0) {
      setError("Pick at least one student");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload =
        audienceMode === "students"
          ? {
              audienceType: "people" as const,
              targetUserIds: selectedStudentIds,
              targetClassIds: [] as string[],
            }
          : {
              audienceType: "roles" as const,
              targetClassIds: audienceMode === "classes" ? selectedClassIds : [],
              targetUserIds: [] as string[],
            };
      const res = await fetch(`/api/tenants/${ctx.tenant}/seniors/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          ...payload,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setItems((prev) => [
        {
          id: json.announcement.id,
          title,
          body,
          publishedAt: new Date().toISOString(),
          createdByName: "You",
          audienceType: payload.audienceType,
          targetClassIds: payload.targetClassIds,
          targetUserIds: payload.targetUserIds,
          audienceLabel: audienceSummary(),
        },
        ...prev,
      ]);
      resetForm();
      setShowForm(false);
      setFilter("mine");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const totalCount = schoolNotices.length + items.length;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-[#E5E7EB] bg-white p-0.5">
          {(
            [
              { id: "all" as const, label: `All (${totalCount})` },
              { id: "school" as const, label: `School (${schoolNotices.length})` },
              { id: "mine" as const, label: `Yours (${items.length})` },
            ] as const
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  active
                    ? "bg-[#111827] text-white"
                    : "text-[#4B5563] hover:bg-[#F3F4F6]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 ${BTN_PRIMARY}`}
          onClick={() => setShowForm(true)}
        >
          <span className="text-base leading-none">+</span>
          Post to students
        </button>
      </div>
      <p className="mb-3 text-xs text-[#6B7280]">
        Students see these in their app. Target all students, a class, or specific people when you
        post.
      </p>

      {showForm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4"
          role="presentation"
          onClick={() => setShowForm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Post announcement"
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#F3F4F6] px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[#111827]">Post to students</p>
                <p className="mt-0.5 text-xs text-[#6B7280]">
                  Now sending to: {audienceSummary()}
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-[#6B7280] hover:text-[#111827]"
                onClick={() => setShowForm(false)}
              >
                Close
              </button>
            </div>
            <form
              onSubmit={publish}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4"
            >
              <Field label="Title">
                <input
                  className={INPUT}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Holiday on Monday"
                  required
                  autoFocus
                />
              </Field>
              <Field label="Message">
                <textarea
                  className={INPUT}
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="What should they know?"
                  required
                />
              </Field>

              <div>
                <p className={LABEL}>Who should see this?</p>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      { id: "all" as const, label: "All students" },
                      { id: "classes" as const, label: "Specific class" },
                      { id: "students" as const, label: "Specific students" },
                    ] as const
                  ).map((option) => {
                    const active = audienceMode === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setAudienceMode(option.id);
                          setError("");
                        }}
                        className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${
                          active
                            ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]"
                            : "border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {audienceMode === "classes" ? (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                  <p className="mb-2 text-xs font-semibold text-[#6B7280]">
                    Select class{classes.length === 1 ? "" : "es"}
                  </p>
                  {classes.length === 0 ? (
                    <p className="text-sm text-[#9CA3AF]">No classes assigned yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {classes.map((klass) => {
                        const checked = selectedClassIds.includes(klass.id);
                        return (
                          <label
                            key={klass.id}
                            className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-sm text-[#111827]"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setSelectedClassIds((prev) => toggleId(prev, klass.id))
                              }
                            />
                            {klass.name} {klass.section}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              {audienceMode === "students" ? (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                  <p className="mb-2 text-xs font-semibold text-[#6B7280]">
                    Select students ({selectedStudentIds.length} selected)
                  </p>
                  <input
                    className={`${INPUT} mb-2`}
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                    placeholder="Search by name or class…"
                  />
                  {filteredStudents.length === 0 ? (
                    <p className="text-sm text-[#9CA3AF]">No students found.</p>
                  ) : (
                    <div className="max-h-44 space-y-1 overflow-y-auto">
                      {filteredStudents.map((student) => {
                        const checked = selectedStudentIds.includes(student.id);
                        return (
                          <label
                            key={student.id}
                            className="flex cursor-pointer items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2 text-sm text-[#111827]"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setSelectedStudentIds((prev) =>
                                    toggleId(prev, student.id),
                                  )
                                }
                              />
                              <span className="truncate font-medium">{student.name}</span>
                            </span>
                            <span className="shrink-0 text-xs text-[#9CA3AF]">
                              {student.className}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
              <div className="flex flex-wrap gap-2 border-t border-[#F3F4F6] pt-4">
                <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                  {saving ? "Posting…" : "Post announcement"}
                </button>
                <button
                  type="button"
                  className={BTN_GHOST}
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {feed.length === 0 ? (
        <div className="h-fit rounded-xl border border-dashed border-[#E5E7EB] bg-white px-4 py-8 text-center">
          <Mail className="mx-auto h-7 w-7 text-[#D1D5DB]" />
          <p className="mt-2 text-sm font-semibold text-[#111827]">
            {filter === "school"
              ? "No school notices"
              : filter === "mine"
                ? "You haven’t posted yet"
                : "No announcements yet"}
          </p>
          <p className="mt-1 text-xs text-[#6B7280]">
            {filter === "school"
              ? "School admin notices will show up here."
              : "Post a reminder for all students, one class, or selected students."}
          </p>
          {filter !== "school" ? (
            <button
              type="button"
              className={`mt-4 inline-flex items-center gap-1.5 ${BTN_PRIMARY}`}
              onClick={() => setShowForm(true)}
            >
              <span className="text-base leading-none">+</span>
              Post to students
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="h-fit space-y-2 self-start">
          {feed.map((a) => (
            <li
              key={`${a.source}-${a.id}`}
              className="h-fit rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2.5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    a.source === "school"
                      ? "bg-[#F3F4F6] text-[#4B5563]"
                      : "bg-[#EFF6FF] text-[#1D4ED8]"
                  }`}
                >
                  {a.source === "school" ? "School" : "Yours"}
                </span>
                <span className="rounded bg-[#ECFDF5] px-1.5 py-0.5 text-[10px] font-semibold text-[#047857]">
                  {a.audienceLabel ||
                    (a.source === "school" ? "School audience" : "All students")}
                </span>
                <span className="text-[11px] text-[#9CA3AF]">
                  {formatDate(a.publishedAt)}
                </span>
                <span className="text-[11px] text-[#D1D5DB]">·</span>
                <span className="text-[11px] text-[#9CA3AF]">
                  {a.source === "school"
                    ? a.createdByName || "school admin"
                    : a.createdByName || "you"}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold leading-snug text-[#111827]">
                {a.title}
              </p>
              {a.body?.trim() ? (
                <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-sm leading-snug text-[#4B5563]">
                  {a.body.trim()}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function TeacherStudentsClient({ data }: { data: TeacherWorkspaceData }) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "attention" | "on-track"
  >("all");
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(
    null,
  );

  const classes = useMemo(
    () => [...new Set(data.studentRecords.map((student) => student.className))],
    [data.studentRecords],
  );
  const attentionStudents = useMemo(
    () => data.studentRecords.filter((student) => student.needsAttention),
    [data.studentRecords],
  );
  const filteredStudents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.studentRecords.filter((student) => {
      const matchesQuery =
        !needle ||
        student.name.toLowerCase().includes(needle) ||
        student.email.toLowerCase().includes(needle) ||
        student.rollNumber.toLowerCase().includes(needle);
      const matchesClass =
        classFilter === "all" || student.className === classFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "attention"
          ? student.needsAttention
          : !student.needsAttention);
      return matchesQuery && matchesClass && matchesStatus;
    });
  }, [classFilter, data.studentRecords, query, statusFilter]);

  useEffect(() => {
    const requestedStudentId = searchParams.get("student");
    if (!requestedStudentId) return;
    const student = data.studentRecords.find(
      (record) => record.id === requestedStudentId,
    );
    if (student) setSelectedStudent(student);
  }, [data.studentRecords, searchParams]);

  useEffect(() => {
    if (!selectedStudent) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedStudent(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedStudent]);

  return (
    <>
      {attentionStudents.length > 0 ? (
        <SeniorsCard className="mb-4 border-[#FECACA] bg-[#FEF2F2]">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left"
            onClick={() => setStatusFilter("attention")}
          >
            <span>
              <span className="block text-sm font-semibold text-[#B91C1C]">
                Needs attention
              </span>
              <span className="mt-1 block text-sm text-[#7F1D1D]">
                {attentionStudents.length} student
                {attentionStudents.length === 1 ? "" : "s"} need follow-up.
              </span>
            </span>
            <AlertTriangle className="h-5 w-5 text-[#DC2626]" />
          </button>
        </SeniorsCard>
      ) : null}

      <div className="mb-4 grid gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 sm:grid-cols-[1fr_180px_180px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email or roll number"
            className={`${INPUT} pl-9`}
          />
        </label>
        <select
          value={classFilter}
          onChange={(event) => setClassFilter(event.target.value)}
          className={INPUT}
          aria-label="Filter by class"
        >
          <option value="all">All classes</option>
          {classes.map((className) => (
            <option key={className} value={className}>
              {className}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value as "all" | "attention" | "on-track",
            )
          }
          className={INPUT}
          aria-label="Filter by attention status"
        >
          <option value="all">All students</option>
          <option value="attention">Needs attention</option>
          <option value="on-track">On track</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wide text-[#6B7280]">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Topics done</th>
              <th className="px-4 py-3">Quiz avg</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => (
              <tr key={s.id} className="border-t border-[#E5E7EB]">
                <td className="px-4 py-3">
                  <p className="font-medium text-[#1F2937]">{s.name}</p>
                  <p className="text-xs text-[#6B7280]">{s.email}</p>
                </td>
                <td className="px-4 py-3 text-[#4B5563]">{s.className}</td>
                <td className="px-4 py-3 text-[#4B5563]">
                  {s.topicsCompleted}
                  {s.totalTopics != null ? ` / ${s.totalTopics}` : ""}
                </td>
                <td className="px-4 py-3 text-[#4B5563]">
                  {s.quizAverage != null ? `${s.quizAverage}%` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      s.needsAttention
                        ? "rounded-full bg-[#FEF2F2] px-2.5 py-1 text-xs font-semibold text-[#B91C1C]"
                        : "rounded-full bg-[#F0FDF4] px-2.5 py-1 text-xs font-semibold text-[#15803D]"
                    }
                  >
                    {s.needsAttention ? "Needs attention" : "On track"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#2563EB] transition hover:bg-[#EFF6FF]"
                    aria-label={`View ${s.name} performance`}
                    onClick={() => setSelectedStudent(s)}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-[#6B7280]"
                >
                  No students match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selectedStudent ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0F172A]/45 p-4"
          role="presentation"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedStudent.name} profile`}
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#F3F4F6] px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold text-[#111827]">
                    {selectedStudent.name}
                  </h2>
                  <span
                    className={
                      selectedStudent.needsAttention
                        ? "rounded-md bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C]"
                        : "rounded-md bg-[#F0FDF4] px-2 py-0.5 text-[11px] font-semibold text-[#15803D]"
                    }
                  >
                    {selectedStudent.needsAttention ? "Needs attention" : "On track"}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-[#6B7280]">
                  {[
                    selectedStudent.className,
                    selectedStudent.rollNumber
                      ? `Roll ${selectedStudent.rollNumber}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg p-2 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
                onClick={() => setSelectedStudent(null)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
              {(selectedStudent.attentionReasons?.length ?? 0) > 0 ? (
                <div className="mb-4 flex gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#B91C1C]">
                      Attention required
                    </p>
                    <ul className="mt-1 space-y-0.5 text-sm text-[#7F1D1D]">
                      {selectedStudent.attentionReasons!.map((reason) => (
                        <li key={reason}>· {reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-4">
                {(
                  [
                    {
                      label: "Topics done",
                      value: `${selectedStudent.topicsCompleted}/${selectedStudent.totalTopics ?? "—"}`,
                    },
                    {
                      label: "Quiz average",
                      value:
                        selectedStudent.quizAverage != null
                          ? `${selectedStudent.quizAverage}%`
                          : "—",
                    },
                    {
                      label: "Assignments",
                      value: `${selectedStudent.assignmentsSubmitted ?? 0}/${selectedStudent.assignmentsAssigned ?? 0}`,
                    },
                    {
                      label: "Quiz attempts",
                      value: String(selectedStudent.quizAttemptCount ?? 0),
                    },
                  ] as const
                ).map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2.5"
                  >
                    <p className="text-[11px] font-medium text-[#6B7280]">
                      {stat.label}
                    </p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#111827]">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <section>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Missing assignments
                  </p>
                  {(selectedStudent.missingAssignments?.length ?? 0) > 0 ? (
                    <ul className="divide-y divide-[#F3F4F6] overflow-hidden rounded-xl border border-[#E5E7EB]">
                      {selectedStudent.missingAssignments!.map((assignment) => (
                        <li
                          key={assignment.id}
                          className="flex items-start justify-between gap-3 px-3 py-2.5"
                        >
                          <p className="min-w-0 text-sm font-medium text-[#111827]">
                            {assignment.title}
                          </p>
                          <p className="shrink-0 text-[11px] text-[#C2410C]">
                            Due {formatDateTime(assignment.dueAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-sm text-[#6B7280]">
                      No missing assignments.
                    </p>
                  )}
                </section>

                <section>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Recent quizzes
                  </p>
                  {(selectedStudent.recentQuizAttempts?.length ?? 0) > 0 ? (
                    <ul className="divide-y divide-[#F3F4F6] overflow-hidden rounded-xl border border-[#E5E7EB]">
                      {selectedStudent.recentQuizAttempts!.map((attempt) => (
                        <li
                          key={attempt.id}
                          className="flex items-center justify-between gap-3 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#111827]">
                              {attempt.title}
                            </p>
                            <p className="truncate text-[11px] text-[#9CA3AF]">
                              {attempt.subjectName} · {attempt.topicTitle}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-[#2563EB]">
                            {attempt.score ?? "—"}/{attempt.maxScore ?? "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-sm text-[#6B7280]">
                      No quiz attempts yet.
                    </p>
                  )}
                </section>
              </div>

              <div className="mt-5 grid gap-5 border-t border-[#F3F4F6] pt-4 lg:grid-cols-2">
                <section>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Student contact
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`mailto:${selectedStudent.email}`}
                      className="inline-flex max-w-full items-center gap-1.5 truncate rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#374151] hover:bg-[#F9FAFB]"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
                      <span className="truncate">{selectedStudent.email}</span>
                    </a>
                    {selectedStudent.phone ? (
                      <a
                        href={`tel:${selectedStudent.phone}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#374151] hover:bg-[#F9FAFB]"
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
                        {selectedStudent.phone}
                      </a>
                    ) : null}
                  </div>
                </section>

                <section>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Parent / guardian
                  </p>
                  {(selectedStudent.parents?.length ?? 0) > 0 ? (
                    <ul className="space-y-2">
                      {selectedStudent.parents!.map((parent) => (
                        <li
                          key={parent.id}
                          className="rounded-xl border border-[#E5E7EB] px-3 py-2.5"
                        >
                          <p className="text-sm font-medium text-[#111827]">
                            {parent.fullName}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {parent.email ? (
                              <a
                                href={`mailto:${parent.email}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-2.5 py-1 text-xs font-medium text-[#374151] hover:bg-[#F9FAFB]"
                              >
                                <Mail className="h-3.5 w-3.5 text-[#9CA3AF]" />
                                Email
                              </a>
                            ) : null}
                            {parent.phone ? (
                              <a
                                href={`tel:${parent.phone}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-2.5 py-1 text-xs font-medium text-[#374151] hover:bg-[#F9FAFB]"
                              >
                                <Phone className="h-3.5 w-3.5 text-[#9CA3AF]" />
                                {parent.phone}
                              </a>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-sm text-[#6B7280]">
                      No parent linked yet.
                    </p>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function TeacherClassworkClient({ data }: { data: TeacherWorkspaceData }) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"assignments" | "quizzes">(
    searchParams.get("tab") === "quizzes" ? "quizzes" : "assignments",
  );

  const submissionCount = (data.assignments ?? []).reduce(
    (sum, assignment) =>
      sum + assignment.submissions.filter((s) => s.status !== "pending").length,
    0,
  );
  const attemptCount = (data.quizzes ?? []).reduce(
    (sum, quiz) => sum + (quiz.attempts?.length ?? quiz.attemptCount ?? 0),
    0,
  );

  const tabClass = (active: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition ${
      active
        ? "bg-[#2563EB] text-white shadow-sm"
        : "bg-white text-[#374151] hover:bg-[#F9FAFB]"
    }`;

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E40AF]">
        Student assignment submissions and quiz results for your classes. Click any
        item to expand and view details or grade work.
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={tabClass(tab === "assignments")}
          onClick={() => setTab("assignments")}
        >
          Assignment submissions ({submissionCount})
        </button>
        <button
          type="button"
          className={tabClass(tab === "quizzes")}
          onClick={() => setTab("quizzes")}
        >
          Quiz results ({attemptCount})
        </button>
      </div>

      {tab === "assignments" ? (
        <TeacherAssignmentsClient data={data} resultsOnly />
      ) : (
        <TeacherQuizzesClient data={data} resultsOnly />
      )}
    </div>
  );
}
