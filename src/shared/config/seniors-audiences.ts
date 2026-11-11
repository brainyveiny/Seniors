/** Audience pages for Seniors platform marketing (/seniors/for/*) */

export type SeniorsAudienceId = "school" | "teacher" | "student" | "parent";

export type SeniorsAudienceFeature = {
  title: string;
  description: string;
};

export type SeniorsAudiencePage = {
  id: SeniorsAudienceId;
  navLabel: string;
  headline: string;
  subheadline: string;
  badge: string;
  features: SeniorsAudienceFeature[];
  demoTitle: string;
  ctaLabel: string;
};

export const SENIORS_AUDIENCES: Record<SeniorsAudienceId, SeniorsAudiencePage> = {
  school: {
    id: "school",
    navLabel: "Schools",
    headline: "Run your entire digital campus from one place",
    subheadline:
      "Onboard teachers and students, track content coverage, and keep academics aligned to your school’s methodology -not a generic EdTech syllabus.",
    badge: "For school leadership",
    features: [
      {
        title: "Teacher & student roster",
        description: "Add teachers, students, and parents. Link parent accounts to children in a few clicks.",
      },
      {
        title: "Content oversight",
        description: "See which topics are Complete, In Progress, or Missing across every subject.",
      },
      {
        title: "School settings",
        description: "Set branding, default marking scheme, and answer-writing format for your institution.",
      },
      {
        title: "Usage visibility",
        description: "Know how students and teachers are engaging with your digital campus every week.",
      },
    ],
    demoTitle: "Live demo -School admin dashboard",
    ctaLabel: "Login as School",
  },
  teacher: {
    id: "teacher",
    navLabel: "Teachers",
    headline: "Teach the way you already teach -digitally",
    subheadline:
      "Upload notes mapped to topics, assign homework, create quizzes, and grade submissions without leaving your school’s academic structure.",
    badge: "For teachers",
    features: [
      {
        title: "Topic-mapped content",
        description: "Publish notes, worksheets, and model answers against Class → Subject → Chapter → Topic.",
      },
      {
        title: "Assignments & grading",
        description: "Create homework, review student answers, and give scores with feedback.",
      },
      {
        title: "Topic quizzes",
        description: "Build MCQ quizzes per topic. Students attempt; scores auto-calculate.",
      },
      {
        title: "Student records",
        description: "See topic completion and quiz averages -spot students who need attention.",
      },
    ],
    demoTitle: "Live demo -Teacher workspace",
    ctaLabel: "Login as Teacher",
  },
  student: {
    id: "student",
    navLabel: "Students",
    headline: "Learn exactly how your school teaches",
    subheadline:
      "Continue from where you left off, open school notes by topic, submit homework, attempt quizzes, and prep for exams using your school’s own content.",
    badge: "For students",
    features: [
      {
        title: "Continue learning",
        description: "Home shows overdue homework, upcoming exams, or the next topic to resume.",
      },
      {
        title: "Syllabus explorer",
        description: "Browse subjects and chapters the way your school structures the year.",
      },
      {
        title: "Topic pages",
        description: "Overview, notes, practice, revision, and quiz -all in one place per topic.",
      },
      {
        title: "Homework & quizzes",
        description: "Submit answers, retake when needed, and see auto-graded quiz scores instantly.",
      },
    ],
    demoTitle: "Live demo -Student home",
    ctaLabel: "Login as Student",
  },
  parent: {
    id: "parent",
    navLabel: "Parents",
    headline: "Stay close to your child’s school progress",
    subheadline:
      "See overall progress, subject-wise completion, homework alerts, upcoming exams, and school announcements -without chasing WhatsApp groups.",
    badge: "For parents",
    features: [
      {
        title: "Child progress snapshot",
        description: "Overall % complete, topics done, and quiz average at a glance.",
      },
      {
        title: "Alerts that matter",
        description: "Overdue homework, due-soon work, and upcoming exams in one feed.",
      },
      {
        title: "Subject-wise bars",
        description: "Know which subjects are strong and which need attention.",
      },
      {
        title: "School announcements",
        description: "PTM dates, holidays, and office notes -same source as the school portal.",
      },
    ],
    demoTitle: "Live demo -Parent view",
    ctaLabel: "Login as Parent",
  },
};

export const SENIORS_AUDIENCE_NAV: { id: SeniorsAudienceId; label: string; href: string }[] = [
  { id: "school", label: "Schools", href: "/seniors/for/school" },
  { id: "teacher", label: "Teachers", href: "/seniors/for/teacher" },
  { id: "student", label: "Students", href: "/seniors/for/student" },
  { id: "parent", label: "Parents", href: "/seniors/for/parent" },
];
