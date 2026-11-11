/** Demo content for the Seniors school learning platform template (tenant-customizable). */

import { COACHING_STOCK_IMAGES, coachingImage } from "@/infrastructure/data/coaching-stock-images";

export const SENIORS_TEMPLATE = {
  brand: {
    tagline: "School-Specific Personalized Learning",
    trustLine: "Trusted by schools, students, parents, and teachers across India",
  },
  hero: {
    headline: "Learn The Way Your School Teaches",
    subheadline: "",
    primaryCta: { label: "Get Started", link: "/seniors/login" },
    studentLogin: { label: "Student Login", link: "/login/student" },
    parentLogin: { label: "Parent Login", link: "/login/parent" },
    teacherLogin: { label: "Teacher Login", link: "/login/teacher" },
    schoolLogin: { label: "School Login", link: "/login/school" },
    imageUrl: "/seniors/images/hero-laptop.png",
    slides: [
      {
        imageUrl: coachingImage("students", 800),
        eyebrow: "Trusted by schools, students, parents, and teachers across India",
        headline: "Learn The Way Your School Teaches",
        subheadline: "",
      },
      {
        imageUrl: coachingImage("classroom", 800),
        eyebrow: "School-specific content & assessments",
        headline: "Every lesson mirrors your classroom",
        subheadline:
          "Teachers upload notes and tests that match your school's marking scheme -students prepare for the exams they actually take.",
      },
      {
        imageUrl: coachingImage("team", 800),
        eyebrow: "Parents stay informed in real time",
        headline: "Track progress the way your school evaluates",
        subheadline:
          "Attendance, assignments, test scores, and academic growth -visible to parents and teachers on one dashboard.",
      },
    ],
  },
  statsIntro: {
    title: "Let's build the future of school learning.",
    description:
      "Seniors partners with schools across India to create personalized digital campuses -aligned with each institution's teaching methodology, assessments, and academic standards.",
  },
  stats: [
    { value: "120+", label: "Partner schools", icon: "school" },
    { value: "85K+", label: "Active students", icon: "users" },
    { value: "12K+", label: "Teachers onboarded", icon: "teachers" },
    { value: "4.8★", label: "Parent satisfaction", icon: "star" },
  ],
  why: {
    titleBefore: "Why",
    titleHighlight: "Seniors",
    titleAfter: "is The Right Choice for Your School",
    cards: [
      {
        title: "School-aligned learning paths",
        description:
          "Content, revision schedules, and practice follow your school's methodology -the way teachers actually teach in class.",
        icon: "layers",
        variant: "light",
      },
      {
        title: "Assessments that match your exams",
        description:
          "Tests mirror your school's question patterns, answer-writing expectations, and evaluation standards.",
        icon: "lightbulb",
        variant: "light",
      },
      {
        title: "Parents, teachers & students -connected",
        description:
          "One digital campus where students learn, teachers upload materials, AI assists with doubts, and parents track real academic progress -not just screen time.",
        icon: "map",
        variant: "light",
      },
      {
        title: "Achieve your school's academic goals",
        description:
          "Join 120+ partner schools using Seniors to deliver personalized learning without losing what makes your institution unique.",
        icon: "compass",
        variant: "highlight",
        ctaLabel: "Book a demo",
        ctaLink: "#demo-booking",
      },
    ],
  },
  goals: {
    titleBefore: "Select your role",
    titleHighlight: "to get started",
    items: [
      {
        id: "school",
        label: "School",
        imageUrl: "/assets/seniors/school.png",
        href: "/login/school",
      },
      {
        id: "teacher",
        label: "Teacher",
        imageUrl: "/assets/seniors/teacher.png",
        href: "/login/teacher",
      },
      {
        id: "student",
        label: "Student",
        imageUrl: "/assets/seniors/student.png",
        href: "/login/student",
      },
      {
        id: "parent",
        label: "Parent",
        imageUrl: "/assets/seniors/parent.png",
        href: "/login/parent",
      },
    ],
  },
  features: {
    title: "Key Features",
    subtitle: "Everything your school needs for a complete digital academic environment",
    items: [
      {
        title: "School-Specific Learning",
        description:
          "Curriculum, notes, and revision aligned with how your school teaches -not generic national content.",
        icon: "school",
        imageUrl: coachingImage("classroom", 800),
      },
      {
        title: "AI Doubt Assistant",
        description:
          "24/7 doubt clearing trained on your school's content and teaching style -answers students in context.",
        icon: "bot",
        imageUrl: coachingImage("study", 800),
      },
      {
        title: "Personalized Revision",
        description:
          "Smart revision plans based on each student's weak areas and your school's exam calendar.",
        icon: "book",
        imageUrl: COACHING_STOCK_IMAGES.section.library,
      },
      {
        title: "School Pattern Assessments",
        description:
          "Tests designed to match your school's question types, marking scheme, and answer-writing patterns.",
        icon: "clipboard",
        imageUrl: coachingImage("professional", 800),
      },
      {
        title: "Parent Monitoring",
        description:
          "Real-time visibility into attendance, assignments, test scores, and academic progress.",
        icon: "users",
        imageUrl: coachingImage("team", 800),
      },
      {
        title: "Progress Analytics",
        description:
          "Deep insights for teachers and admins -class performance, topic mastery, and intervention alerts.",
        icon: "chart",
        imageUrl: coachingImage("students", 800),
      },
      {
        title: "Gamification",
        description:
          "Badges, streaks, and leaderboards that motivate students while keeping learning school-focused.",
        icon: "trophy",
        imageUrl: COACHING_STOCK_IMAGES.section.campus,
      },
    ],
  },
  howItWorks: {
    title: "How Seniors Works for Your School",
    subtitle:
      "A school-specific stack -digital twin, topic studio, and learning path -built around how your campus actually teaches.",
    steps: [
      {
        step: 1,
        title: "School twin",
        description:
          "Marking scheme · Answer format · Exam calendar · School digital twin",
      },
      {
        step: 2,
        title: "Topic Studio",
        description:
          "How we teach · Explanation · Model answers · Teachers encode class",
      },
      {
        step: 3,
        title: "Topic path",
        description:
          "Notes · Practice · Quiz · Classroom learning path",
      },
      {
        step: 4,
        title: "Parents",
        description: "Syllabus progress · 72% · Parents stay close",
      },
    ],
  },
  schoolShowcase: {
    title: "School Showcase",
    subtitle: "Partner schools achieving better outcomes with school-aligned learning",
    partners: [
      { name: "Delhi Public School", logoUrl: "" },
      { name: "Ryan International", logoUrl: "" },
      { name: "DAV Public School", logoUrl: "" },
      { name: "Kendriya Vidyalaya", logoUrl: "" },
      { name: "St. Mary's Academy", logoUrl: "" },
      { name: "Modern School", logoUrl: "" },
    ],
    stories: [
      {
        title: "Board exam scores up 18%",
        description:
          "After aligning assessments with school patterns, Class 12 students showed measurable improvement in board results.",
        metric: "+18%",
      },
      {
        title: "Parent engagement doubled",
        description:
          "Real-time progress tracking increased parent-teacher communication and student accountability.",
        metric: "2×",
      },
      {
        title: "Teacher workload reduced",
        description:
          "AI doubt assistant handled 60% of repetitive queries, freeing teachers for high-value mentoring.",
        metric: "60%",
      },
    ],
  },
  testimonials: {
    title: "What People Say",
    subtitle: "Hear from students, parents, and school leaders using Seniors",
    tabs: [
      {
        id: "student",
        label: "Students",
        items: [
          {
            name: "Aarav Sharma",
            role: "Class 12, Science",
            rating: 5,
            text: "Finally a platform that follows our school's notes and test patterns. Revision feels like preparing for our actual exams.",
            initials: "AS",
          },
          {
            name: "Priya Nair",
            role: "Class 10",
            rating: 5,
            text: "The AI doubt assistant answers in the same way our teachers explain in class. It's like having a tutor available 24/7.",
            initials: "PN",
          },
        ],
      },
      {
        id: "parent",
        label: "Parents",
        items: [
          {
            name: "Rajesh Mehta",
            role: "Parent of Class 9 student",
            rating: 5,
            text: "I can see exactly how my son is performing against school standards -not generic national benchmarks.",
            initials: "RM",
          },
          {
            name: "Sunita Kapoor",
            role: "Parent of Class 11 student",
            rating: 5,
            text: "The parent dashboard gives me peace of mind. I know when to intervene before exams, not after results.",
            initials: "SK",
          },
        ],
      },
      {
        id: "school",
        label: "Schools",
        items: [
          {
            name: "Dr. Anil Verma",
            role: "Principal, Partner School",
            rating: 5,
            text: "Seniors digitized our teaching methodology without forcing us into a generic EdTech mould. Our teachers love it.",
            initials: "AV",
          },
          {
            name: "Mrs. Kavita Singh",
            role: "Academic Head",
            rating: 5,
            text: "Assessments now mirror our evaluation standards. Students walk into exams already familiar with the pattern.",
            initials: "KS",
          },
        ],
      },
    ],
  },
  pricing: {
    title: "Pricing",
    subtitle: "Flexible plans for institutions and individual learners",
    plans: [
      {
        id: "school",
        name: "School Plan",
        description: "Institution-wide licensing for your entire school ecosystem",
        price: "Custom",
        period: "per year",
        popular: true,
        features: [
          "Unlimited students & teachers",
          "School-branded digital campus",
          "Custom content upload & assessments",
          "Parent monitoring dashboard",
          "Progress analytics & reports",
          "Dedicated onboarding support",
        ],
        ctaLabel: "Book a consultation",
        ctaLink: "#demo-booking",
      },
      {
        id: "student",
        name: "Student Plan",
        description: "Individual subscription for students whose school uses Seniors",
        price: "₹499",
        period: "per month",
        popular: false,
        features: [
          "Access to school-aligned content",
          "AI doubt assistant",
          "Personalized revision plans",
          "Practice assessments",
          "Progress tracking",
          "Mobile app access",
        ],
        ctaLabel: "Get started",
        ctaLink: "/signup",
      },
    ],
  },
  demoBooking: {
    title: "Book a Demo for Your School",
    description:
      "Schedule a consultation with our team. We'll show you how Seniors can mirror your school's teaching methodology digitally.",
    schoolNameLabel: "School name",
    contactNameLabel: "Contact person",
    emailLabel: "Email address",
    phoneLabel: "Phone number",
    messageLabel: "Tell us about your school",
    ctaLabel: "Request consultation",
    successMessage:
      "Thank you! Our team will reach out within 24 hours to schedule your demo.",
    backgroundImageUrl: "",
  },
  appPromo: {
    enabled: true,
    headline: "Get the learning app",
    subtext: "Download lessons and learn anytime, anywhere with the Seniors app",
    appStoreUrl: "#",
    playStoreUrl: "#",
    imageUrl: coachingImage("students", 600),
  },
  faq: {
    titleBefore: "Frequently asked",
    titleHighlight: "questions",
    imageUrl: "/assets/seniors/faq.png",
    items: [
      {
        question: "What is Seniors?",
        answer:
          "Seniors is a school-aligned digital campus -notes, doubts, classwork, and timetable follow how your school actually teaches.",
      },
      {
        question: "How does AI doubt solving work?",
        answer:
          "It answers according to your teachers' notes and school content, so students get help in the same language used in class.",
      },
      {
        question: "Who can use Seniors?",
        answer:
          "Schools, teachers, students, and parents -each gets a role-based login with the right tools for their work.",
      },
      {
        question: "Can we book a demo for our school?",
        answer:
          "Yes. Use Book a Demo and our team will walk you through a setup tailored to your campus.",
      },
    ],
  },
  finalCta: {
    headline: "Start learning with Seniors",
    subtext:
      "Join schools that are transforming education with personalized, school-aligned digital learning.",
    ctaLabel: "Book Demo",
    ctaLink: "#demo-booking",
  },
} as const;
