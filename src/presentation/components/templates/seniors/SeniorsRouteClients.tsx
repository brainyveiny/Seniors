"use client";

import Link from "next/link";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import type { SeniorsStudentDashboardData } from "@/domain/seniors/types";
import type {
  SeniorsSubjectSummary,
  SeniorsHomeworkItem,
  SeniorsExamItem,
  StudentPracticeTopic,
} from "@/domain/seniors/types";
import {
  StudentLearnPage,
  type StudentLearnMeta,
} from "@/presentation/components/templates/seniors/student/StudentLearnPage";
import {
  StudentTopicPage,
  type TopicPageData,
} from "@/presentation/components/templates/seniors/student/StudentTopicPage";
import { StudentHomePage } from "@/presentation/components/templates/seniors/student/StudentHomePage";
import { StudentExamPrepPage } from "@/presentation/components/templates/seniors/student/StudentExamPrepPage";
import { StudentSchoolPage } from "@/presentation/components/templates/seniors/student/StudentSchoolPage";
import { StudentProgressPage } from "@/presentation/components/templates/seniors/student/StudentProgressPage";
import { SeniorsCard, SeniorsEmptyState } from "@/presentation/components/templates/seniors/shared/SeniorsUi";
import { formatDate } from "@/shared/lib/format-date";

export function StudentHomeClient({
  data,
}: {
  data: SeniorsStudentDashboardData | null;
}) {
  const ctx = useSeniorsSite();
  if (!data) {
    return (
      <SeniorsEmptyState
        title="School not configured yet"
        description="Your school administrator is setting up content. Please check back soon."
      />
    );
  }
  return <StudentHomePage ctx={ctx} data={data} />;
}

export function StudentLearnClient({
  subjects,
  student,
}: {
  subjects: SeniorsSubjectSummary[];
  student: StudentLearnMeta;
}) {
  const ctx = useSeniorsSite();
  return <StudentLearnPage ctx={ctx} subjects={subjects} student={student} />;
}

export function StudentTopicClient({ topic }: { topic: TopicPageData }) {
  const ctx = useSeniorsSite();
  return <StudentTopicPage ctx={ctx} topic={topic} />;
}

export function StudentHomeworkClient({
  items,
}: {
  items: SeniorsHomeworkItem[];
}) {
  const ctx = useSeniorsSite();
  return (
    <div className="space-y-3">
      {items.map((hw) => (
        <SeniorsCard key={hw.id}>
          <Link href={ctx.sitePath(`student/homework/${hw.id}`)} className="block">
            <p className="font-semibold">
              {hw.subjectName} -{hw.title}
            </p>
            <p className="text-sm text-[#6B7280]">{hw.chapterName}</p>
            <p className="mt-1 text-xs text-[#DC2626]">
              Due {formatDate(hw.dueAt)} • {hw.questionCount} questions
            </p>
          </Link>
        </SeniorsCard>
      ))}
    </div>
  );
}

export function StudentExamPrepClient({
  exams,
  weakTopics = [],
  practiceTopics = [],
  papersHref,
  mockHref,
}: {
  exams: SeniorsExamItem[];
  weakTopics?: StudentPracticeTopic[];
  practiceTopics?: StudentPracticeTopic[];
  papersHref?: string;
  mockHref?: string;
}) {
  const ctx = useSeniorsSite();
  return (
    <StudentExamPrepPage
      ctx={ctx}
      exams={exams}
      weakTopics={weakTopics}
      practiceTopics={practiceTopics}
      papersHref={papersHref}
      mockHref={mockHref}
    />
  );
}

export function StudentSchoolClient({
  announcements,
}: {
  announcements: {
    id: string;
    title: string;
    body: string;
    publishedAt: Date | string;
    source?: "school" | "teacher";
    authorName?: string;
  }[];
}) {
  return <StudentSchoolPage announcements={announcements} />;
}

export function StudentProgressClient({
  subjects,
  progressSummary,
}: {
  subjects: SeniorsSubjectSummary[];
  progressSummary?: {
    percent: number;
    topicsCompleted: number;
    topicsTotal: number;
    testAverage: number;
  };
}) {
  const ctx = useSeniorsSite();
  return (
    <StudentProgressPage
      ctx={ctx}
      subjects={subjects}
      progressSummary={progressSummary}
    />
  );
}

export function StudentSearchClient({
  initialQuery,
  results,
}: {
  initialQuery: string;
  results: {
    type: string;
    id: string;
    title: string;
    subtitle: string;
    href: string;
  }[];
}) {
  const ctx = useSeniorsSite();
  return (
    <>
      <form method="get" className="mb-4">
        <input
          name="q"
          defaultValue={initialQuery}
          placeholder="Search subjects, topics, notes..."
          className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm"
        />
      </form>
      <ul className="space-y-2">
        {results.map((r) => (
          <li key={r.id}>
            <Link
              href={ctx.sitePath(r.href)}
              className="block rounded-lg border border-[#E5E7EB] bg-white p-3 hover:bg-[#F9FAFB]"
            >
              <p className="font-medium">{r.title}</p>
              <p className="text-xs text-[#6B7280]">{r.subtitle}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
