import type {
  ContinueLearningCard,
  SeniorsExamItem,
  SeniorsHomeworkItem,
  SeniorsTopicSummary,
} from "@/domain/seniors/types";

export interface ContinueLearningContext {
  homework: SeniorsHomeworkItem[];
  exams: SeniorsExamItem[];
  topics: SeniorsTopicSummary[];
  topicHref: (slug: string) => string;
  homeworkHref: (id: string) => string;
  examPrepHref: string;
}

function findOverdueHomework(items: SeniorsHomeworkItem[]) {
  return items.find((h) => h.status === "overdue") ?? null;
}

function findExamWithin7Days(exams: SeniorsExamItem[]) {
  return exams.find((e) => e.daysLeft >= 0 && e.daysLeft <= 7) ?? null;
}

function findInProgressTopic(topics: SeniorsTopicSummary[]) {
  return (
    topics.find((t) => t.progressPercent > 0 && t.progressPercent < 100) ?? null
  );
}

function findNextRecommendedTopic(topics: SeniorsTopicSummary[]) {
  return topics.find((t) => t.progressPercent < 100) ?? null;
}

export function resolveContinueLearning(
  ctx: ContinueLearningContext,
): ContinueLearningCard {
  const overdue = findOverdueHomework(ctx.homework);
  if (overdue) {
    return {
      type: "overdue-homework",
      title: "Overdue Homework",
      subtitle: `${overdue.subjectName} - ${overdue.chapterName}: ${overdue.title}`,
      meta: `Due on ${new Date(overdue.dueAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} • ${overdue.questionCount} Questions`,
      ctaLabel: "Resume Now",
      href: ctx.homeworkHref(overdue.id),
    };
  }

  const exam = findExamWithin7Days(ctx.exams);
  if (exam) {
    return {
      type: "exam-revision",
      title: "Exam Revision",
      subtitle: `${exam.subjectName}: ${exam.title}`,
      meta: `${new Date(exam.examAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} (${exam.daysLeft} days left)`,
      ctaLabel: "Start Revision",
      href: ctx.examPrepHref,
    };
  }

  const inProgress = findInProgressTopic(ctx.topics);
  if (inProgress) {
    return {
      type: "resume-topic",
      title: "Resume Learning",
      subtitle: inProgress.title,
      meta: `${inProgress.progressPercent}% complete`,
      ctaLabel: "Continue",
      href: ctx.topicHref(inProgress.slug),
    };
  }

  const next = findNextRecommendedTopic(ctx.topics);
  if (next) {
    return {
      type: "next-topic",
      title: "Next Recommended Topic",
      subtitle: next.title,
      meta: next.hasNotes ? "Notes available" : "Get started",
      ctaLabel: "Start Topic",
      href: ctx.topicHref(next.slug),
    };
  }

  return {
    type: "next-topic",
    title: "You're all caught up",
    subtitle: "All topics in your syllabus are complete",
    meta: "Browse Learn anytime to revise",
    ctaLabel: "Go to Learn",
    href: ctx.examPrepHref.replace("exam-prep", "learn"),
  };
}

export function homeworkStatus(
  dueAt: Date,
  now = new Date(),
): SeniorsHomeworkItem["status"] {
  const due = new Date(dueAt);
  due.setHours(23, 59, 59, 999);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  if (due < today) return "overdue";
  if (due < tomorrow) return "due_today";
  if (due < dayAfter) return "due_soon";
  return "pending";
}

export function daysUntil(date: Date, now = new Date()): number {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
}
