"use client";

import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Megaphone,
  UserRound,
  XCircle,
} from "lucide-react";
import type { SiteContext } from "@/application/hooks/use-site-context";
import type { SeniorsHomeworkItem } from "@/domain/seniors/types";
import type { SeniorsStudentTimetableData } from "@/domain/seniors/types";
import { weekdayLabel } from "@/domain/seniors/timetable-utils";
import { SeniorsCard, SeniorsEmptyState } from "@/presentation/components/templates/seniors/shared/SeniorsUi";
import { formatDate } from "@/shared/lib/format-date";
import { ParentChildShell, type ParentChildOption } from "./ParentChildShell";

type BaseData = {
  session: { fullName: string };
  children: ParentChildOption[];
  activeChildId?: string | null;
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "#FEF3C7", text: "#B45309", label: "Pending" },
  submitted: { bg: "#DBEAFE", text: "#1D4ED8", label: "Submitted" },
  graded: { bg: "#DCFCE7", text: "#15803D", label: "Graded" },
  overdue: { bg: "#FEE2E2", text: "#B91C1C", label: "Overdue" },
};

const ATTENDANCE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  present: { bg: "#DCFCE7", text: "#15803D", label: "Present" },
  absent: { bg: "#FEE2E2", text: "#B91C1C", label: "Absent" },
  late: { bg: "#FEF3C7", text: "#B45309", label: "Late" },
  holiday: { bg: "#E0E7FF", text: "#4338CA", label: "Holiday" },
};

function HomeworkStatusBadge({ item }: { item: SeniorsHomeworkItem }) {
  const key = item.status === "overdue" ? "overdue" : item.submissionStatus ?? "pending";
  const style = STATUS_STYLES[key] ?? STATUS_STYLES.pending;
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}

export function ParentHomeworkPage({
  ctx,
  data,
}: {
  ctx: SiteContext;
  data: BaseData & { homework: SeniorsHomeworkItem[] };
}) {
  return (
    <ParentChildShell
      ctx={ctx}
      title="Classwork"
      sessionName={data.session.fullName}
      activeChildId={data.activeChildId}
      childOptions={data.children}
      basePath="parent/homework"
    >
      {data.homework.length === 0 ? (
        <SeniorsEmptyState
          title="No assignments yet"
          description="When teachers assign classwork, it will appear here."
        />
      ) : (
        <div className="space-y-3">
          {data.homework.map((item) => (
            <SeniorsCard key={item.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#111827]">{item.title}</p>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    {item.subjectName} · {item.chapterName}
                  </p>
                  <p className="mt-1 text-xs text-[#9CA3AF]">
                    Due {formatDate(item.dueAt)} · {item.questionCount} questions
                  </p>
                </div>
                <HomeworkStatusBadge item={item} />
              </div>
              {item.submissionStatus === "graded" && item.score != null ? (
                <p className="mt-3 text-sm font-medium text-[#15803D]">
                  Score: {item.score}
                  {item.feedback?.trim() ? ` · ${item.feedback.trim()}` : ""}
                </p>
              ) : null}
            </SeniorsCard>
          ))}
        </div>
      )}
    </ParentChildShell>
  );
}

export function ParentTestResultsPage({
  ctx,
  data,
}: {
  ctx: SiteContext;
  data: BaseData & {
    testAverage: number;
    quizResults: {
      id: string;
      title: string;
      subjectName: string;
      score: number | null;
      maxScore: number | null;
      submittedAt: Date | string;
      percent: number | null;
    }[];
    exams: {
      id: string;
      title: string;
      subjectName: string;
      examAt: Date | string;
      isPast: boolean;
      daysLeft: number;
    }[];
  };
}) {
  return (
    <ParentChildShell
      ctx={ctx}
      title="Test Results"
      sessionName={data.session.fullName}
      activeChildId={data.activeChildId}
      childOptions={data.children}
      basePath="parent/test-results"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <SeniorsCard className="p-4">
          <p className="text-xs font-medium text-[#6B7280]">Average Score</p>
          <p className="mt-1 text-3xl font-bold text-[#111827]">{data.testAverage}%</p>
        </SeniorsCard>
        <SeniorsCard className="p-4">
          <p className="text-xs font-medium text-[#6B7280]">Quizzes Taken</p>
          <p className="mt-1 text-3xl font-bold text-[#111827]">{data.quizResults.length}</p>
        </SeniorsCard>
        <SeniorsCard className="p-4">
          <p className="text-xs font-medium text-[#6B7280]">School Exams</p>
          <p className="mt-1 text-3xl font-bold text-[#111827]">{data.exams.length}</p>
        </SeniorsCard>
      </div>

      <SeniorsCard className="mt-5 p-5">
        <h3 className="text-base font-bold text-[#111827]">Quiz Results</h3>
        <ul className="mt-4 space-y-3">
          {data.quizResults.length === 0 ? (
            <li className="text-sm text-[#6B7280]">No quiz results yet.</li>
          ) : (
            data.quizResults.map((q) => (
              <li
                key={q.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] px-3.5 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[#111827]">{q.title}</p>
                  <p className="text-xs text-[#6B7280]">
                    {q.subjectName} · {formatDate(q.submittedAt)}
                  </p>
                </div>
                <span className="text-sm font-bold text-[var(--sp-brand-text)]">
                  {q.percent != null ? `${q.percent}%` : "—"}
                </span>
              </li>
            ))
          )}
        </ul>
      </SeniorsCard>

      <SeniorsCard className="mt-5 p-5">
        <h3 className="text-base font-bold text-[#111827]">School Exams</h3>
        <ul className="mt-4 space-y-3">
          {data.exams.length === 0 ? (
            <li className="text-sm text-[#6B7280]">No exams scheduled.</li>
          ) : (
            data.exams.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] px-3.5 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[#111827]">{e.title}</p>
                  <p className="text-xs text-[#6B7280]">
                    {e.subjectName} · {formatDate(e.examAt)}
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: e.isPast ? "#F3F4F6" : "#FEE2E2",
                    color: e.isPast ? "#6B7280" : "#B91C1C",
                  }}
                >
                  {e.isPast ? "Completed" : `${e.daysLeft} days left`}
                </span>
              </li>
            ))
          )}
        </ul>
      </SeniorsCard>
    </ParentChildShell>
  );
}

export function ParentAttendancePage({
  ctx,
  data,
}: {
  ctx: SiteContext;
  data: BaseData & {
    attendance: {
      percent: number;
      daysPresent: number;
      daysAbsent: number;
      daysLate: number;
      daysRecorded: number;
      records: { id: string; date: Date | string; status: string; note: string }[];
    };
  };
}) {
  const att = data.attendance;

  return (
    <ParentChildShell
      ctx={ctx}
      title="Attendance"
      sessionName={data.session.fullName}
      activeChildId={data.activeChildId}
      childOptions={data.children}
      basePath="parent/attendance"
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <SeniorsCard className="p-4">
          <p className="text-xs font-medium text-[#6B7280]">This Month</p>
          <p className="mt-1 text-3xl font-bold text-[#111827]">{att.percent}%</p>
        </SeniorsCard>
        <SeniorsCard className="p-4">
          <p className="text-xs font-medium text-[#6B7280]">Present</p>
          <p className="mt-1 text-3xl font-bold text-[#15803D]">{att.daysPresent}</p>
        </SeniorsCard>
        <SeniorsCard className="p-4">
          <p className="text-xs font-medium text-[#6B7280]">Absent</p>
          <p className="mt-1 text-3xl font-bold text-[#B91C1C]">{att.daysAbsent}</p>
        </SeniorsCard>
        <SeniorsCard className="p-4">
          <p className="text-xs font-medium text-[#6B7280]">Late</p>
          <p className="mt-1 text-3xl font-bold text-[#B45309]">{att.daysLate}</p>
        </SeniorsCard>
      </div>

      <SeniorsCard className="mt-5 p-5">
        <h3 className="text-base font-bold text-[#111827]">Daily Records</h3>
        {att.records.length === 0 ? (
          <p className="mt-4 text-sm text-[#6B7280]">
            No attendance marked yet. Records appear once the school marks daily attendance.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {att.records.map((r) => {
              const style = ATTENDANCE_STYLES[r.status] ?? ATTENDANCE_STYLES.present;
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    {r.status === "absent" ? (
                      <XCircle className="h-4 w-4 text-[#B91C1C]" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-[#15803D]" />
                    )}
                    <span className="text-sm font-medium text-[#111827]">
                      {formatDate(r.date)}
                    </span>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: style.bg, color: style.text }}
                  >
                    {style.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </SeniorsCard>
    </ParentChildShell>
  );
}

export function ParentProfilePage({
  ctx,
  data,
}: {
  ctx: SiteContext;
  data: BaseData & {
    profile: {
      id: string;
      name: string;
      email: string;
      phone: string;
      rollNumber: string;
      className: string;
      joinedAt: Date | string;
      progress: {
        percent: number;
        topicsCompleted: number;
        topicsTotal: number;
        testAverage: number;
      };
      subjects: string[];
    } | null;
  };
}) {
  const profile = data.profile;

  return (
    <ParentChildShell
      ctx={ctx}
      title="Child Profile"
      sessionName={data.session.fullName}
      activeChildId={data.activeChildId}
      childOptions={data.children}
      basePath="parent/profile"
    >
      {!profile ? (
        <SeniorsEmptyState title="Profile not found" description="Student profile is unavailable." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <SeniorsCard className="p-5 lg:col-span-1">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--sp-brand-soft)] text-[var(--sp-brand-text)]">
              <UserRound className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-[#111827]">{profile.name}</h3>
            <p className="text-sm text-[#6B7280]">{profile.className}</p>
            {profile.rollNumber ? (
              <p className="mt-1 text-sm text-[#6B7280]">Roll No. {profile.rollNumber}</p>
            ) : null}
          </SeniorsCard>

          <SeniorsCard className="p-5 lg:col-span-2">
            <h3 className="text-base font-bold text-[#111827]">Details</h3>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[#6B7280]">Email</dt>
                <dd className="text-sm font-medium text-[#111827]">{profile.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#6B7280]">Phone</dt>
                <dd className="text-sm font-medium text-[#111827]">{profile.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#6B7280]">Joined</dt>
                <dd className="text-sm font-medium text-[#111827]">
                  {formatDate(profile.joinedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#6B7280]">Overall Progress</dt>
                <dd className="text-sm font-medium text-[#111827]">{profile.progress.percent}%</dd>
              </div>
            </dl>
            {profile.subjects.length > 0 ? (
              <div className="mt-5">
                <p className="text-xs font-medium text-[#6B7280]">Subjects</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.subjects.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-[#F3F4F6] px-3 py-1 text-xs font-medium text-[#374151]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </SeniorsCard>
        </div>
      )}
    </ParentChildShell>
  );
}

export function ParentTimetablePage({
  ctx,
  data,
}: {
  ctx: SiteContext;
  data: BaseData & { timetable: SeniorsStudentTimetableData | null };
}) {
  const periods = data.timetable?.schoolPeriods ?? data.timetable?.periods ?? [];

  return (
    <ParentChildShell
      ctx={ctx}
      title="Timetable"
      sessionName={data.session.fullName}
      activeChildId={data.activeChildId}
      childOptions={data.children}
      basePath="parent/timetable"
    >
      {periods.length === 0 ? (
        <SeniorsEmptyState
          title="No timetable yet"
          description="The school has not published a class schedule yet."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const dayPeriods = periods.filter((p) => p.dayOfWeek === day && !p.isBreak);
            if (dayPeriods.length === 0) return null;
            return (
              <SeniorsCard key={day} className="p-4">
                <h3 className="font-bold text-[#111827]">{weekdayLabel(day)}</h3>
                <ul className="mt-3 space-y-2">
                  {dayPeriods.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-start gap-3 rounded-lg border border-[#E5E7EB] px-3 py-2"
                    >
                      <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#6B7280]" />
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">{p.subjectName}</p>
                        <p className="text-xs text-[#6B7280]">
                          {p.startTime} – {p.endTime}
                          {p.teacherName ? ` · ${p.teacherName}` : ""}
                          {p.room ? ` · ${p.room}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </SeniorsCard>
            );
          })}
        </div>
      )}
    </ParentChildShell>
  );
}

export function ParentCalendarPage({
  ctx,
  data,
}: {
  ctx: SiteContext;
  data: BaseData & {
    events: {
      id: string;
      type: "exam" | "announcement" | "school";
      title: string;
      subtitle: string;
      date: Date | string;
      daysLeft: number | null;
    }[];
  };
}) {
  const iconFor = (type: string) => {
    if (type === "exam") return Calendar;
    if (type === "announcement") return Megaphone;
    return FileText;
  };

  return (
    <ParentChildShell
      ctx={ctx}
      title="Events & Calendar"
      sessionName={data.session.fullName}
      activeChildId={data.activeChildId}
      childOptions={data.children}
      basePath="parent/calendar"
    >
      {data.events.length === 0 ? (
        <SeniorsEmptyState
          title="No upcoming events"
          description="Exams, announcements, and school calendar events will appear here."
        />
      ) : (
        <div className="space-y-3">
          {data.events.map((event) => {
            const Icon = iconFor(event.type);
            return (
              <SeniorsCard key={event.id} className="flex items-start gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sp-brand-soft)] text-[var(--sp-brand-text)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#111827]">{event.title}</p>
                  {event.subtitle ? (
                    <p className="mt-0.5 text-sm text-[#6B7280] line-clamp-2">{event.subtitle}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-[#9CA3AF]">
                    {formatDate(event.date)}
                    {event.daysLeft != null && event.daysLeft >= 0
                      ? ` · ${event.daysLeft} days left`
                      : ""}
                  </p>
                </div>
              </SeniorsCard>
            );
          })}
        </div>
      )}
    </ParentChildShell>
  );
}

export function ParentLessonPlanPage({
  ctx,
  data,
}: {
  ctx: SiteContext;
  data: BaseData & {
    subjects: {
      id: string;
      name: string;
      chapters: {
        id: string;
        number: number;
        name: string;
        topicCount: number;
        completedCount: number;
        topics: {
          id: string;
          number: string;
          title: string;
          progressPercent: number;
          contentStatus: string;
        }[];
      }[];
    }[];
  };
}) {
  return (
    <ParentChildShell
      ctx={ctx}
      title="Lesson Plan"
      sessionName={data.session.fullName}
      activeChildId={data.activeChildId}
      childOptions={data.children}
      basePath="parent/lesson-plan"
    >
      {data.subjects.length === 0 ? (
        <SeniorsEmptyState
          title="No syllabus published"
          description="Lesson plans appear once the school publishes subject content."
        />
      ) : (
        <div className="space-y-5">
          {data.subjects.map((subject) => (
            <SeniorsCard key={subject.id} className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--sp-brand-soft)] text-[var(--sp-brand-text)]">
                  <BookOpen className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-[#111827]">{subject.name}</h3>
              </div>
              <div className="mt-4 space-y-4">
                {subject.chapters.map((chapter) => (
                  <div key={chapter.id}>
                    <p className="text-sm font-semibold text-[#374151]">
                      Ch {chapter.number}: {chapter.name}
                      <span className="ml-2 text-xs font-normal text-[#9CA3AF]">
                        {chapter.completedCount}/{chapter.topicCount} topics
                      </span>
                    </p>
                    <ul className="mt-2 space-y-1.5 pl-3">
                      {chapter.topics.map((topic) => (
                        <li
                          key={topic.id}
                          className="flex items-center justify-between gap-2 text-sm text-[#6B7280]"
                        >
                          <span>
                            {topic.number}. {topic.title}
                          </span>
                          <span className="shrink-0 text-xs font-medium text-[var(--sp-brand-text)]">
                            {topic.progressPercent}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </SeniorsCard>
          ))}
        </div>
      )}
    </ParentChildShell>
  );
}
