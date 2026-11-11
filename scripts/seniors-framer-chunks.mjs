/**
 * Seniors landing copy → Framer placeholder slots (Design_Only_Starter.html).
 * Mirrors src/shared/config/seniors-template.ts -text only, no styling.
 */

const T = {
  brand: {
    tagline: "School-Specific Personalized Learning",
    trustLine: "Trusted by schools, students, parents, and teachers across India",
  },
  hero: {
    headline: "Learn The Way Your School Teaches",
    subheadline: "",
    primaryCta: { label: "Get Started", link: "/seniors/login" },
    image: "/assets/seniors/laptop.png",
    imageAlt: "Digital school learning on laptop -Seniors personalized academic platform",
  },
  statsIntro: {
    title: "Let's build the future of school learning.",
    description:
      "Seniors partners with schools across India to create personalized digital campuses -aligned with each institution's teaching methodology, assessments, and academic standards.",
  },
  why: {
    titleBefore: "Why",
    titleHighlight: "Seniors",
    titleAfter: "is The Right Choice for Your School",
    cards: [
      {
        title: "School-aligned learning paths",
        description:
          "Content, revision schedules, and practice follow your school's methodology -the way teachers actually teach in class.",
      },
      {
        title: "Assessments that match your exams",
        description:
          "Tests mirror your school's question patterns, answer-writing expectations, and evaluation standards.",
      },
      {
        title: "Parents, teachers & students -connected",
        description:
          "One digital campus where students learn, teachers upload materials, AI assists with doubts, and parents track real academic progress.",
      },
      {
        title: "Achieve your school's academic goals",
        description:
          "Join 120+ partner schools using Seniors to deliver personalized learning without losing what makes your institution unique.",
        ctaLabel: "Book a demo",
      },
    ],
  },
  features: {
    title: "Key Features",
    subtitle: "Everything your school needs for a complete digital academic environment",
    items: [
      {
        title: "School-Specific Learning",
        icon: "school",
        description:
          "Curriculum, notes, and revision aligned with how your school teaches -not generic national content.",
      },
      {
        title: "AI Doubt Assistant",
        icon: "ai",
        description:
          "24/7 doubt clearing trained on your school's content and teaching style -answers students in context.",
      },
      {
        title: "Personalized Revision",
        icon: "revision",
        description:
          "Smart revision plans based on each student's weak areas and your school's exam calendar.",
      },
      {
        title: "School Pattern Assessments",
        icon: "assessments",
        description:
          "Tests designed to match your school's question types, marking scheme, and answer-writing patterns.",
      },
      {
        title: "Parent Monitoring",
        icon: "parents",
        description:
          "Real-time visibility into attendance, assignments, test scores, and academic progress.",
      },
      {
        title: "Progress Analytics",
        icon: "analytics",
        description:
          "Deep insights for teachers and admins -class performance, topic mastery, and intervention alerts.",
      },
      {
        title: "Gamification",
        icon: "gamification",
        description:
          "Badges, streaks, and leaderboards that motivate students while keeping learning school-focused.",
      },
    ],
  },
  schoolShowcase: {
    title: "School Showcase",
    subtitle: "Partner schools achieving better outcomes with school-aligned learning",
  },
  schoolWorks: {
    title: "How Seniors Works for Your School",
    image: "/assets/seniors/school-works-hero.png?v=5",
    imageAlt: "Teachers and students collaborating with the Seniors school learning platform",
    intro:
      "A school-specific stack -digital twin, topic studio, and learning path -built around how your campus actually teaches.",
    pillars: [
      {
        title: "School twin",
        description:
          "Marking scheme · Answer format · Exam calendar · School digital twin",
      },
      {
        title: "Topic Studio",
        description:
          "How we teach · Explanation · Model answers · Teachers encode class",
      },
      {
        title: "Topic path",
        description:
          "Notes · Practice · Quiz · Classroom learning path",
      },
    ],
  },
  parentsSpotlight: {
    title: "Parents",
    subtitle: "Syllabus progress",
    stat: "72%",
    description: "Parents stay close",
    image: "/assets/seniors/parents-hero.png?v=5",
    imageAlt: "Parent staying connected to their child's school learning journey",
  },
  howItWorks: {
    title: "Parents",
    subtitle: "Syllabus progress",
    steps: [
      { title: "72%", description: "Syllabus progress at a glance -see what's covered and what's next." },
      { title: "Syllabus progress", description: "Chapter-wise completion aligned to your school's academic calendar." },
      { title: "Parents stay close", description: "Real-time visibility into homework, tests, and academic momentum." },
      { title: "Parents stay close", description: "Real-time progress, homework alerts, and exam readiness in one place." },
    ],
  },
  testimonials: {
    title: "What People Say",
    subtitle: "Hear from students, parents, and school leaders using Seniors",
    quote:
      "Finally a platform that follows our school's notes and test patterns. Revision feels like preparing for our actual exams.",
    author: "Aarav Sharma",
    role: "Class 12, Science",
  },
  finalCta: {
    headline: "Start learning with Seniors",
    subtext:
      "Join schools that are transforming education with personalized, school-aligned digital learning.",
    ctaLabel: "Book Demo",
  },
  queryForm: {
    title: "Send Your Query",
    subtitle:
      "Questions about Seniors for your school? Share your details and our team will reach out within 24 hours.",
    schoolNameLabel: "School name",
    contactNameLabel: "Contact person",
    emailLabel: "Email address",
    phoneLabel: "Phone number",
    messageLabel: "Your query",
    ctaLabel: "Send query",
    successMessage:
      "Thank you! We've received your query and will get back to you soon.",
  },
  appPromo: {
    headline: "Get the learning app",
  },
  faq: {
    titleBefore: "Frequently asked",
    titleHighlight: "questions",
  },
  footer: {
    blurb: "School-specific personalized learning.",
    copyright: "© Seniors. All rights reserved.",
    columns: [
      { title: "Product", links: ["Features", "How it works", "Pricing", "Book Demo", "FAQ"] },
      { title: "Audiences", links: ["Schools", "Teachers", "Students", "Parents", "Contact"] },
      { title: "Company", links: ["About Seniors", "Privacy", "Terms", "Support", "Careers"] },
    ],
    social: ["Twitter", "LinkedIn", "Instagram", "YouTube", "Facebook"],
  },
};

function splitHeadline(text) {
  const match = text.match(/^(.+?)(\s+Your School Teaches)$/i);
  if (match) return [match[1], match[2].trim()];
  const words = text.split(/\s+/);
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

function splitTitleFeatures() {
  const t = T.features.title;
  if (t.toLowerCase().includes("features")) {
    return [t.replace(/\s*features\s*/i, " ").trim() || "Key", "Features"];
  }
  return [t, ""];
}

/** Legacy Framer template strings (replaced after hydration). */
export const FRAMER_TEMPLATE_DEFAULTS = {
  promo: "Get the learning app",
  brand: "Enblox",
  trust: "Your Day, in Perfect Rhythm.",
  headlineL1: "Work Smarter",
  headlineL2: "Not Harder",
  subheadline:
    "Take control of your time with our all-in-one productivity app. Organize tasks, track progress, and focus on what matters—without the overwhelm.",
  cta: "TRY IT FOR FREE",
};

/** 101 placeholders in document order -must stay in sync with Design_Only_Starter.html */
export function buildReplacementQueue() {
  const [heroL1, heroL2] = splitHeadline(T.hero.headline);
  const [finalL1, finalL2] = splitHeadline(T.finalCta.headline);
  const [footerL1, footerL2] = splitHeadline("Transform learning with Seniors");
  const [featBefore, featHighlight] = splitTitleFeatures();
  const [faqBefore, faqHighlight] = [T.faq.titleBefore + " ", T.faq.titleHighlight];
  const why = T.why.cards;
  const feat = T.features.items;
  const how = T.howItWorks.steps;

  return [
    // 1–8 head / pre-body orphans
    "", "", "", "", "", "", "", "",
    // 9–15 hydrated by Framer -keep bundle defaults in SSR (patched after hydration)
    FRAMER_TEMPLATE_DEFAULTS.promo,
    FRAMER_TEMPLATE_DEFAULTS.brand,
    FRAMER_TEMPLATE_DEFAULTS.trust,
    FRAMER_TEMPLATE_DEFAULTS.headlineL1,
    FRAMER_TEMPLATE_DEFAULTS.headlineL2,
    FRAMER_TEMPLATE_DEFAULTS.subheadline,
    FRAMER_TEMPLATE_DEFAULTS.cta,
    // 16–29 why + stats
    `${T.why.titleBefore} `,
    T.why.titleHighlight,
    T.why.titleAfter,
    T.brand.tagline,
    why[0].title,
    why[0].description,
    why[1].title,
    why[1].description,
    why[2].title,
    why[2].description,
    why[3].title,
    T.statsIntro.title,
    T.statsIntro.description,
    T.hero.primaryCta.label,
    // 30–31 partners
    T.schoolShowcase.title,
    T.schoolShowcase.subtitle,
    // 32–42 feature showcase (4 boxes)
    T.features.subtitle.split("—")[0].trim(),
    T.features.title,
    T.features.subtitle,
    feat[0].title,
    feat[0].description,
    feat[1].title,
    feat[1].description,
    feat[2].title,
    feat[2].description,
    feat[3].title,
    feat[3].description,
    // 43–53 parents spotlight / tabs
    T.parentsSpotlight.subtitle,
    T.parentsSpotlight.title,
    T.parentsSpotlight.description,
    T.parentsSpotlight.stat,
    T.parentsSpotlight.subtitle,
    T.parentsSpotlight.description,
    how[3].description,
    how[3].title,
    T.testimonials.title,
    T.testimonials.quote,
    T.hero.primaryCta.label,
    // 54–69 features grid (6 cards)
    `${featBefore} `,
    featHighlight,
    T.features.subtitle,
    T.brand.trustLine,
    feat[0].title,
    feat[0].description,
    feat[1].title,
    feat[1].description,
    feat[2].title,
    feat[2].description,
    feat[3].title,
    feat[3].description,
    feat[4].title,
    feat[4].description,
    feat[5].title,
    feat[5].description,
    // 70 ratings badge
    "4.8★ Parent satisfaction",
    // 71–75 testimonials + final CTA
    T.testimonials.title,
    finalL1,
    finalL2,
    T.finalCta.subtext,
    T.finalCta.ctaLabel,
    // 76–81 footer hero
    T.footer.blurb,
    `${faqBefore}`,
    footerL1,
    footerL2,
    T.footer.copyright,
    T.brand.tagline,
    // 82–87 footer column 1
    T.footer.columns[0].title,
    ...T.footer.columns[0].links,
    // 88–93 footer column 2
    T.footer.columns[1].title,
    ...T.footer.columns[1].links,
    // 94–99 footer column 3 + social
    T.footer.columns[2].title,
    ...T.footer.columns[2].links,
    // 100–101 post-footer orphans
    "",
    "",
  ];
}

export function getHeroContent() {
  const [headlineL1, headlineL2] = splitHeadline(T.hero.headline);
  return {
    trustLine: T.brand.trustLine,
    headlineL1,
    headlineL2,
    subheadline: T.hero.subheadline,
    cta: T.hero.primaryCta.label,
    image: T.hero.image,
    imageAlt: T.hero.imageAlt,
  };
}

export const HERO = getHeroContent();

export const SECTION_IMAGES = {
  schoolWorks: {
    src: T.schoolWorks.image,
    alt: T.schoolWorks.imageAlt,
  },
  parents: {
    src: T.parentsSpotlight.image,
    alt: T.parentsSpotlight.imageAlt,
  },
  assessments: {
    src: "https://images.unsplash.com/photo-1606326607210-354e0c3ff4bb?auto=format&fit=crop&w=1400&q=80",
    alt: "School Pattern Assessments matched to your school's question types and marking scheme",
  },
  everyday: {
    src: "/assets/seniors/everyday-hero.png?v=1",
    alt: "Student learning with personalized school-aligned study materials",
  },
};

export const QUERY_SECTION = {
  title: T.queryForm.title,
  subtitle: T.queryForm.subtitle,
  schoolNameLabel: T.queryForm.schoolNameLabel,
  contactNameLabel: T.queryForm.contactNameLabel,
  emailLabel: T.queryForm.emailLabel,
  phoneLabel: T.queryForm.phoneLabel,
  messageLabel: T.queryForm.messageLabel,
  ctaLabel: T.queryForm.ctaLabel,
  successMessage: T.queryForm.successMessage,
};

export const FEATURES_SECTION = {
  title: T.features.title,
  subtitle: T.features.subtitle,
  items: T.features.items.map((item) => ({
    title: item.title,
    icon: item.icon,
    description: item.description,
  })),
};

export const FOOTER = {
  navigationTitle: "Explore",
  navigationLinks: [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: T.queryForm.ctaLabel, href: "#contact" },
    { label: "Get Started", href: "/seniors/login" },
  ],
  socialTitle: "Connect",
  social: [],
  hiddenSocial: ["Tiktok", "TikTok", "Twitter", "Facebook"],
};

export const NAV = {
  logo: "/assets/seniors/seniors-logo.png",
  brand: "Seniors",
  links: [
    { label: "Get Started", href: "/seniors/login" },
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "About Us", href: "/seniors/about" },
    { label: "Contact", href: "#contact" },
  ],
  cta: "Get Started",
  linkClasses: [
    "framer-13voots",
    "framer-1i579w9",
    "framer-1bsu1bm",
    "framer-bjjbtn",
    "framer-1k743vt",
  ],
};

export const PLACEHOLDER_RE =
  /\[EDIT TEXT\]|\[Add your content here\. Edit this text in Cursor\.\]|\[Add your section content here\. Replace this text in Cursor\.\]/g;

export const EXPECTED_PLACEHOLDER_COUNT = 101;

/** Framer template → Seniors text patches applied after hydration (longest first). */
export function buildTextPatches() {
  const [heroL1, heroL2] = splitHeadline(T.hero.headline);
  const why = T.why.cards;
  const feat = T.features.items;
  const how = T.howItWorks.steps;
  const sw = T.schoolWorks;
  const ps = T.parentsSpotlight;

  const pairs = [
    [FRAMER_TEMPLATE_DEFAULTS.subheadline, T.hero.subheadline],
    [
      "Our productivity app is built for modern professionals who want to stay organized, focused, and in control.",
      sw.intro,
    ],
    [
      "Whether you're juggling multiple projects or just trying to get through your day more efficiently, our smart tools are here to support you—every step of the way.",
      "Three pillars -school twin, topic studio, and topic path -aligned to your campus.",
    ],
    [
      "Our time management app helps you organize tasks, block distractions, and stay on top of your day—so you can achieve more with less stress.",
      T.statsIntro.description,
    ],
    [
      "Our app isn\u2019t just about managing time\u2014it\u2019s about making space for what matters most. From focus tools to flexible scheduling, everything is designed to help you work smarter, not harder.",
      ps.description,
    ],
    [
      "Our app isn't just about managing time—it's about making space for what matters most. From focus tools to flexible scheduling, everything is designed to help you work smarter, not harder.",
      ps.description,
    ],
    [
      "One digital campus where students learn, teachers upload materials, AI assists with doubts, and parents track real academic progress.",
      ps.description,
    ],
    [
      "Discover features and daily tips designed to sharpen your focus, build routines, and boost long-term productivity.",
      T.features.subtitle,
    ],
    [
      "Start organizing, prioritizing, and crushing your goals today.",
      T.finalCta.subtext,
    ],
    ["Designed to Help You Do More With Less Stress", sw.title],
    ["Designed to Help You Do More ", "How Seniors Works for "],
    ["With Less Stress", "Your School"],
    ["Plan smarter. Focus better. Get more done.", T.statsIntro.title],
    ["Built for focus, made for real life.", ps.title],
    ["Work Smarter Every Day", T.features.title],
    ["Ready to Reclaim Your Time?", T.finalCta.headline],
    ["Make Time Work for You", T.brand.tagline],
    ["Easily create, categorize, and prioritize tasks with a drag-and-drop interface that adapts to your workflow.", sw.pillars[0].description],
    ["Stay ahead of your schedule with a built-in calendar that syncs across all your devices and reminds you before deadlines hit.", sw.pillars[1].description],
    ["Eliminate distractions with a minimalist interface and time-blocking tools that help you get into deep work—fast.", sw.pillars[2].description],
    ["Easily sort, prioritize, and track your to-dos in one clean, intuitive workspace.", feat[3].description],
    ["Use built-in Pomodoro and time-blocking tools to stay in the zone and avoid burnout.", feat[4].description],
    ["Plan your day with a drag-and-drop calendar that adapts to your workflow.", feat[5].description],
    ["Streamline your workflow and focus on what really matters—without the burnout.", ps.description],
    ["Smart Task Management", sw.pillars[0].title],
    ["Integrated Calendar & Deadlines", sw.pillars[1].title],
    ["Focus Mode", sw.pillars[2].title],
    ["Task Organizer", feat[3].title],
    ["Focus Timer", feat[4].title],
    ["Smart Scheduling", feat[5].title],
    ["Get More Done in Less Time", ps.stat],
    ["Stay Clear & Focused", ps.subtitle],
    ["Take Control of Your Schedule", ps.description],
    ["Why It Works", ps.subtitle],
    ["From onboarding to daily learning -built around your campus", ps.subtitle],
    ["Your institution's methodology becomes the foundation of every lesson.", ps.description],
    ["Join 1,000 companies already building their websites with Frameblox.", T.features.subtitle],
    ["Partner schools achieving better outcomes with school-aligned learning", T.features.subtitle],
    ["1,000+ customers joined", ps.stat],
    ["4.8★ Parent satisfaction", ps.stat],
    [FRAMER_TEMPLATE_DEFAULTS.trust, T.brand.trustLine],
    [FRAMER_TEMPLATE_DEFAULTS.headlineL1, heroL1],
    [FRAMER_TEMPLATE_DEFAULTS.headlineL2, heroL2],
    ["Work Smarter", heroL1],
    ["Not Harder", heroL2],
    ["Try it for Free", T.hero.primaryCta.label],
    ["TRY IT FOR FREE", T.hero.primaryCta.label],
    [FRAMER_TEMPLATE_DEFAULTS.cta, T.hero.primaryCta.label],
    [FRAMER_TEMPLATE_DEFAULTS.brand, "Seniors"],
    ["Enblox", "Seniors"],
  ];

  return pairs
    .filter(([from, to]) => from && to && from !== to)
    .sort((a, b) => b[0].length - a[0].length);
}
