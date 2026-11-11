export interface SeniorsStatItem {
  value: string;
  label: string;
  icon?: string;
  context?: string;
}

export interface SeniorsWhyItem {
  title: string;
  description: string;
}

export interface SeniorsWhyCard {
  title: string;
  description: string;
  icon?: string;
  variant?: "light" | "highlight";
  ctaLabel?: string;
  ctaLink?: string;
}

export interface SeniorsFeatureItem {
  title: string;
  description: string;
  icon: string;
  imageUrl?: string;
  group?: string;
}

export interface SeniorsGoalItem {
  id: string;
  label: string;
  /** Illustration -upload later in page builder if empty */
  imageUrl: string;
  href: string;
}

export interface SeniorsHowStep {
  step: number;
  title: string;
  description: string;
}

export interface SeniorsPartnerSchool {
  name: string;
  logoUrl: string;
}

export interface SeniorsSuccessStory {
  title: string;
  description: string;
  metric?: string;
}

export interface SeniorsTestimonialItem {
  name: string;
  role: string;
  rating: number;
  text: string;
  initials: string;
}

export type SeniorsTestimonialTabId = "student" | "parent" | "school";

export interface SeniorsTestimonialTab {
  id: SeniorsTestimonialTabId;
  label: string;
  items: SeniorsTestimonialItem[];
}

export interface SeniorsPricingPlan {
  id: string;
  name: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  ctaLabel: string;
  ctaLink: string;
  popular?: boolean;
}

export interface SeniorsDemoBooking {
  title: string;
  description: string;
  schoolNameLabel: string;
  contactNameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  messageLabel: string;
  ctaLabel: string;
  successMessage: string;
  backgroundImageUrl?: string;
}

export interface SeniorsAppPromo {
  enabled: boolean;
  headline: string;
  subtext: string;
  appStoreUrl: string;
  playStoreUrl: string;
  imageUrl: string;
}

export interface SeniorsFaqItem {
  question: string;
  answer: string;
}

export interface SeniorsFaq {
  titleBefore: string;
  titleHighlight: string;
  imageUrl: string;
  items: SeniorsFaqItem[];
}

export interface SeniorsCtaLink {
  label: string;
  link: string;
}

export interface SeniorsHeroSlide {
  imageUrl: string;
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
}

export interface SeniorsContent {
  brand: {
    tagline: string;
    trustLine: string;
  };
  hero: {
    headline: string;
    subheadline: string;
    primaryCta: SeniorsCtaLink;
    studentLogin: SeniorsCtaLink;
    parentLogin: SeniorsCtaLink;
    teacherLogin: SeniorsCtaLink;
    schoolLogin: SeniorsCtaLink;
    imageUrl: string;
    slides: SeniorsHeroSlide[];
  };
  statsIntro: {
    title: string;
    description: string;
  };
  stats: SeniorsStatItem[];
  why: {
    titleBefore: string;
    titleHighlight: string;
    titleAfter: string;
    cards: SeniorsWhyCard[];
  };
  mission: {
    title: string;
    missionTitle: string;
    missionBody: string;
    visionTitle: string;
    visionBody: string;
  };
  features: {
    title: string;
    subtitle: string;
    items: SeniorsFeatureItem[];
  };
  goals: {
    titleBefore: string;
    titleHighlight: string;
    items: SeniorsGoalItem[];
  };
  howItWorks: {
    title: string;
    subtitle: string;
    steps: SeniorsHowStep[];
  };
  schoolShowcase: {
    title: string;
    subtitle: string;
    partners: SeniorsPartnerSchool[];
    stories: SeniorsSuccessStory[];
  };
  testimonials: {
    title: string;
    subtitle: string;
    tabs: SeniorsTestimonialTab[];
  };
  pricing: {
    title: string;
    subtitle: string;
    plans: SeniorsPricingPlan[];
  };
  demoBooking: SeniorsDemoBooking;
  appPromo: SeniorsAppPromo;
  faq: SeniorsFaq;
  finalCta: {
    headline: string;
    subtext: string;
    ctaLabel: string;
    ctaLink: string;
  };
}
