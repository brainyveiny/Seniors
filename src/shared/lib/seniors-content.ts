import type { SeniorsContent, SeniorsHowStep } from "@/domain/entities/seniors-content";
import { SENIORS_TEMPLATE } from "@/shared/config/seniors-template";

const SUPERSEDED_HOW_IT_WORKS = [
  [
    "School Onboards",
    "Teachers Upload Content",
    "Students Learn",
    "AI Provides Assistance",
    "Parents Track Progress",
  ],
  [
    "Mirror the school",
    "Teachers encode class",
    "Students follow along",
    "Exams feel familiar",
    "Parents stay close",
  ],
  [
    "School becomes a digital twin",
    "Teachers capture how they teach",
    "Students follow the classroom path",
    "Practice matches school exams",
    "Parents see school-true progress",
  ],
  [
    "Clarity through your school's method",
    "Personalised to your classroom path",
    "Unmatched attention from teachers & parents",
  ],
  [
    "Your school's digital twin",
    "Learn the classroom way",
    "Parents see school-true progress",
  ],
  [
    "School digital twin",
    "Teachers encode class",
    "Classroom learning path",
    "School-pattern exams",
    "Parents stay close",
  ],
  [
    "School digital twin",
    "Classroom learning path",
    "Parents stay close",
  ],
] as const;

function isLegacyHowItWorks(steps?: SeniorsHowStep[]) {
  if (!steps?.length) return true;
  if (steps.length !== 4) return true;
  const titles = steps.map((s) => s.title.trim());
  return SUPERSEDED_HOW_IT_WORKS.some(
    (expected) =>
      titles.length === expected.length && titles.every((t, i) => t === expected[i]),
  );
}

export function buildDefaultSeniorsContent(): SeniorsContent {
  return JSON.parse(JSON.stringify(SENIORS_TEMPLATE)) as SeniorsContent;
}

export function resolveSeniorsContent(
  props: unknown,
  _academyName?: string,
): SeniorsContent {
  const defaults = buildDefaultSeniorsContent();
  if (!props || typeof props !== "object") return defaults;
  const stored = props as Partial<SeniorsContent>;

  const normalizeLoginLink = (link: string | undefined, fallback: string) => {
    if (!link) return fallback;
    if (link.includes("/portal/student")) return "/login/student";
    if (link.includes("/portal/parent")) return "/login/parent";
    return link;
  };

  return {
    ...defaults,
    ...stored,
    brand: { ...defaults.brand, ...stored.brand },
    hero: {
      ...defaults.hero,
      ...stored.hero,
      slides: stored.hero?.slides?.length ? stored.hero.slides : defaults.hero.slides,
      studentLogin: {
        ...defaults.hero.studentLogin,
        ...stored.hero?.studentLogin,
        link: normalizeLoginLink(
          stored.hero?.studentLogin?.link,
          defaults.hero.studentLogin.link,
        ),
      },
      parentLogin: {
        ...defaults.hero.parentLogin,
        ...stored.hero?.parentLogin,
        link: normalizeLoginLink(
          stored.hero?.parentLogin?.link,
          defaults.hero.parentLogin.link,
        ),
      },
      teacherLogin: {
        ...defaults.hero.teacherLogin,
        ...stored.hero?.teacherLogin,
        link: normalizeLoginLink(
          stored.hero?.teacherLogin?.link,
          defaults.hero.teacherLogin.link,
        ),
      },
      schoolLogin: {
        ...defaults.hero.schoolLogin,
        ...stored.hero?.schoolLogin,
        link: normalizeLoginLink(
          stored.hero?.schoolLogin?.link === "/portal/parent"
            ? "/login/school"
            : stored.hero?.schoolLogin?.link,
          defaults.hero.schoolLogin.link,
        ),
      },
      primaryCta: { ...defaults.hero.primaryCta, ...stored.hero?.primaryCta },
    },
    statsIntro: { ...defaults.statsIntro, ...stored.statsIntro },
    why: {
      ...defaults.why,
      ...stored.why,
      cards: stored.why?.cards?.length ? stored.why.cards : defaults.why.cards,
    },
    features: {
      ...defaults.features,
      ...stored.features,
      items: stored.features?.items?.length ? stored.features.items : defaults.features.items,
    },
    goals: (() => {
      const storedItems = stored.goals?.items;
      const legacy =
        !storedItems?.length ||
        storedItems.some((item) =>
          ["doctor", "engineer", "class-6-10"].includes(item.id),
        );
      return {
        ...defaults.goals,
        ...stored.goals,
        items: legacy ? defaults.goals.items : storedItems,
      };
    })(),
    howItWorks: (() => {
      if (isLegacyHowItWorks(stored.howItWorks?.steps)) return defaults.howItWorks;
      const title = stored.howItWorks?.title?.trim() || "";
      const legacyTitle =
        !title ||
        title === "How It Works" ||
        title === "Get the Seniors advantage";
      return {
        ...defaults.howItWorks,
        ...stored.howItWorks,
        title: legacyTitle ? defaults.howItWorks.title : stored.howItWorks!.title,
        steps: stored.howItWorks?.steps?.length
          ? stored.howItWorks.steps
          : defaults.howItWorks.steps,
      };
    })(),
    schoolShowcase: {
      ...defaults.schoolShowcase,
      ...stored.schoolShowcase,
      partners: stored.schoolShowcase?.partners?.length
        ? stored.schoolShowcase.partners
        : defaults.schoolShowcase.partners,
      stories: stored.schoolShowcase?.stories?.length
        ? stored.schoolShowcase.stories
        : defaults.schoolShowcase.stories,
    },
    testimonials: {
      ...defaults.testimonials,
      ...stored.testimonials,
      tabs: stored.testimonials?.tabs?.length
        ? stored.testimonials.tabs
        : defaults.testimonials.tabs,
    },
    pricing: {
      ...defaults.pricing,
      ...stored.pricing,
      plans: stored.pricing?.plans?.length ? stored.pricing.plans : defaults.pricing.plans,
    },
    demoBooking: { ...defaults.demoBooking, ...stored.demoBooking },
    appPromo: { ...defaults.appPromo, ...stored.appPromo },
    faq: {
      ...defaults.faq,
      ...stored.faq,
      items: stored.faq?.items?.length ? stored.faq.items : defaults.faq.items,
    },
    finalCta: { ...defaults.finalCta, ...stored.finalCta },
    stats: stored.stats?.length ? stored.stats : defaults.stats,
  };
}

