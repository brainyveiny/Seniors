/** Seniors portal design tokens (Techerly-style soft panels) */
export const SENIORS_BLUE = "#18181B";
export const SENIORS_BLUE_LIGHT = "#F4F4F5";
export const SENIORS_RED = "#DC2626";
export const SENIORS_RED_LIGHT = "#FEF2F2";
export const SENIORS_GREEN = "#16A34A";
export const SENIORS_ORANGE = "#EA580C";
export const SENIORS_TEXT = "#18181B";
export const SENIORS_TEXT_MUTED = "#71717A";
export const SENIORS_BORDER = "#E4E4E7";
export const SENIORS_BG = "#ECECEE";

/** Pastel panel backgrounds (soft but visible) */
export const SENIORS_PASTEL = {
  blue: "#DBEAFE",
  purple: "#EDE9FE",
  orange: "#FEF3C7",
  pink: "#FFE4E6",
  green: "#DCFCE7",
  peach: "#FFEDD5",
  cyan: "#CFFAFE",
} as const;

export type SeniorsNavSection = "main" | "settings" | "account";

export type SeniorsNavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
  section?: SeniorsNavSection;
};

export const SENIORS_STUDENT_NAV: SeniorsNavItem[] = [
  { id: "home", label: "Home", href: "student/home", icon: "home", section: "main" },
  { id: "learn", label: "Learn", href: "student/learn", icon: "book", section: "main" },
  { id: "homework", label: "Classwork", href: "student/homework", icon: "clipboard", section: "main" },
  { id: "ai-doubts", label: "Ask a Doubt", href: "student/ai-doubts", icon: "sparkles", section: "main" },
  { id: "exam-prep", label: "Exam Prep", href: "student/exam-prep", icon: "calendar", section: "main" },
  { id: "progress", label: "Progress", href: "student/progress", icon: "chart", section: "main" },
  { id: "leaderboard", label: "Leaderboard", href: "student/leaderboard", icon: "trophy", section: "main" },
  { id: "school", label: "Announcements", href: "student/school", icon: "megaphone", section: "settings" },
];

export const SENIORS_TEACHER_NAV: SeniorsNavItem[] = [
  { id: "dashboard", label: "Overview", href: "teacher/dashboard", icon: "chart", section: "main" },
  { id: "content", label: "Class Preparation", href: "teacher/content", icon: "file", section: "main" },
  { id: "assignments", label: "Assignments", href: "teacher/assignments", icon: "clipboard", section: "main" },
  { id: "quizzes", label: "Exams", href: "teacher/quizzes", icon: "quiz", section: "main" },
  { id: "classwork", label: "Submissions & Results", href: "teacher/classwork", icon: "inbox", section: "main" },
  { id: "attendance", label: "Attendance", href: "teacher/attendance", icon: "graduation", section: "main" },
  { id: "announcements", label: "Messenger", href: "teacher/announcements", icon: "megaphone", section: "main" },
  { id: "students", label: "Students", href: "teacher/students", icon: "users", section: "main" },
];

export const SENIORS_PARENT_NAV: SeniorsNavItem[] = [
  { id: "dashboard", label: "Overview", href: "parent/dashboard", icon: "chart", section: "main" },
  { id: "profile", label: "Child Profile", href: "parent/profile", icon: "user", section: "main" },
  { id: "homework", label: "Classwork", href: "parent/homework", icon: "clipboard", section: "main" },
  { id: "test-results", label: "Test Results", href: "parent/test-results", icon: "quiz", section: "main" },
  { id: "attendance", label: "Attendance", href: "parent/attendance", icon: "graduation", section: "main" },
  { id: "timetable", label: "Timetable", href: "parent/timetable", icon: "calendar", section: "main" },
  { id: "calendar", label: "Events", href: "parent/calendar", icon: "calendar", section: "main" },
  { id: "lesson-plan", label: "Lesson Plan", href: "parent/lesson-plan", icon: "book", section: "main" },
  { id: "leave", label: "Apply Leave", href: "parent/leave", icon: "calendar", section: "main" },
  { id: "fees", label: "Fees & Receipts", href: "parent/fees", icon: "clipboard", section: "main" },
  { id: "transport", label: "Transport", href: "parent/transport", icon: "inbox", section: "main" },
  { id: "hobby-club", label: "Hobby Club", href: "parent/hobby-club", icon: "sparkles", section: "main" },
  { id: "books", label: "Books & Stationery", href: "parent/books", icon: "book", section: "main" },
  { id: "elective", label: "Language Elective", href: "parent/elective", icon: "file", section: "main" },
  { id: "uniform", label: "Uniform Order", href: "parent/uniform", icon: "graduation", section: "main" },
  { id: "children", label: "My Children", href: "parent/children", icon: "users", section: "main" },
  { id: "announcements", label: "Announcements", href: "parent/announcements", icon: "megaphone", section: "settings" },
];

export const SENIORS_SCHOOL_ADMIN_NAV: SeniorsNavItem[] = [
  { id: "dashboard", label: "Overview", href: "school-admin/dashboard", icon: "chart", section: "main" },
  { id: "classes", label: "Classes", href: "school-admin/classes", icon: "building", section: "main" },
  { id: "teachers", label: "Teachers", href: "school-admin/teachers", icon: "users", section: "main" },
  { id: "students", label: "Students", href: "school-admin/students", icon: "graduation", section: "main" },
  { id: "attendance", label: "Attendance", href: "school-admin/attendance", icon: "users", section: "main" },
  { id: "parent-services", label: "Parent Services", href: "school-admin/parent-services", icon: "inbox", section: "main" },
  { id: "enquiries", label: "Enquiries", href: "school-admin/enquiries", icon: "inbox", section: "main" },
  { id: "parents", label: "Parents", href: "school-admin/parents", icon: "users", section: "main" },
  { id: "exams", label: "Exams", href: "school-admin/exams", icon: "calendar", section: "main" },
  { id: "timetable", label: "Schedule", href: "school-admin/timetable", icon: "calendar", section: "main" },
  { id: "announcements", label: "School News", href: "school-admin/announcements", icon: "megaphone", section: "settings" },
  { id: "content", label: "Content Oversight", href: "school-admin/content", icon: "file", section: "settings" },
];

export type SeniorsStudentNavId = (typeof SENIORS_STUDENT_NAV)[number]["id"];
export type SeniorsTeacherNavId = (typeof SENIORS_TEACHER_NAV)[number]["id"];
export type SeniorsParentNavId = (typeof SENIORS_PARENT_NAV)[number]["id"];
export type SeniorsSchoolAdminNavId = (typeof SENIORS_SCHOOL_ADMIN_NAV)[number]["id"];

export const NAV_SECTION_LABELS: Record<SeniorsNavSection, string> = {
  main: "Main menu",
  settings: "Settings and news",
  account: "Account",
};

export function groupNavBySection(items: SeniorsNavItem[]) {
  const sections: { section: SeniorsNavSection; label: string; items: SeniorsNavItem[] }[] = [];
  for (const section of ["main", "settings"] as SeniorsNavSection[]) {
    const group = items.filter((item) => (item.section ?? "main") === section);
    if (group.length > 0) {
      sections.push({ section, label: NAV_SECTION_LABELS[section], items: group });
    }
  }
  return sections;
}

export const TOPIC_TABS = [
  { id: "overview", label: "Overview", icon: "layout" },
  { id: "notes", label: "Notes", icon: "file" },
  { id: "practice", label: "Practice", icon: "pencil" },
  { id: "revision", label: "Revision", icon: "refresh" },
  { id: "quiz", label: "Quiz", icon: "help" },
  { id: "need-help", label: "Ask a Doubt", icon: "life-buoy" },
] as const;

export type TopicTabId = (typeof TOPIC_TABS)[number]["id"];
export type TopicTabIcon = (typeof TOPIC_TABS)[number]["icon"];
