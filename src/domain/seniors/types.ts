export type SeniorsContentStatus = "complete" | "in_progress" | "missing";

export type SeniorsContentType =
  | "notes"
  | "worksheet"
  | "practice_question"
  | "model_answer"
  | "revision_note"
  | "previous_paper";

export type SeniorsUserRole =
  | "student"
  | "parent"
  | "teacher"
  | "school-admin";

export type ContinueLearningType =
  | "overdue-homework"
  | "exam-revision"
  | "resume-topic"
  | "next-topic";

export interface ContinueLearningCard {
  type: ContinueLearningType;
  title: string;
  subtitle: string;
  meta: string;
  ctaLabel: string;
  href: string;
}

export interface SeniorsQuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  diagramUrl?: string;
}

export interface SeniorsHomeworkItem {
  id: string;
  title: string;
  subjectName: string;
  chapterName: string;
  dueAt: Date;
  questionCount: number;
  status: "overdue" | "due_today" | "due_soon" | "pending";
  submissionStatus?: "pending" | "submitted" | "graded";
  answerText?: string;
  score?: number | null;
  feedback?: string;
  gradedAt?: Date | string | null;
}

export interface SeniorsExamItem {
  id: string;
  title: string;
  subjectName: string;
  examAt: Date;
  daysLeft: number;
}

export interface StudentPracticeTopic {
  id: string;
  slug: string;
  title: string;
  number: string;
  subjectName: string;
  chapterName: string;
  progressPercent: number;
  hasQuiz: boolean;
  lastQuizPercent: number | null;
  reason: string;
  suggested: boolean;
}

export interface SeniorsTopicSummary {
  id: string;
  slug: string;
  number: string;
  title: string;
  contentStatus: SeniorsContentStatus;
  progressPercent: number;
  hasNotes: boolean;
}

export interface SeniorsChapterSummary {
  id: string;
  number: number;
  name: string;
  topicCount: number;
  completedCount: number;
  topics: SeniorsTopicSummary[];
}

export interface SeniorsSubjectSummary {
  id: string;
  name: string;
  chapters: SeniorsChapterSummary[];
}

export interface SeniorsTimetablePeriod {
  id: string;
  dayOfWeek: number;
  periodIndex: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName: string;
  room: string;
  isBreak: boolean;
  note?: string;
}

export interface SeniorsStudentTimetableData {
  className: string;
  /** Official class timetable set by the school */
  schoolPeriods: SeniorsTimetablePeriod[];
  /** Student's own custom timetable */
  personalPeriods: SeniorsTimetablePeriod[];
  /** @deprecated use schoolPeriods -kept for older cached payloads */
  periods?: SeniorsTimetablePeriod[];
  subjectOptions: string[];
  todayDayOfWeek: number;
}

export interface SeniorsStudentDashboardData {
  studentName: string;
  className: string;
  schoolName: string;
  continueLearning: ContinueLearningCard;
  homeworkDue: SeniorsHomeworkItem[];
  homeworkReturned: SeniorsHomeworkItem[];
  upcomingExams: SeniorsExamItem[];
  announcements: { id: string; title: string; body: string; publishedAt: Date }[];
  teacherUpdates: {
    id: string;
    title: string;
    body: string;
    teacherName: string;
    publishedAt: Date;
  }[];
  progressSummary: {
    percent: number;
    topicsCompleted: number;
    topicsTotal: number;
    testAverage: number;
  };
  timetable: SeniorsStudentTimetableData;
}

export interface SeniorsSearchResult {
  type: "subject" | "chapter" | "topic" | "content" | "announcement";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}
