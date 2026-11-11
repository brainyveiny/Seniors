"use client";

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Compass,
  Headphones,
  Layers,
  Lightbulb,
  MapPin,
  MessageCircleQuestionMark,
  NotebookPen,
  Phone,
  School,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudentSession } from "@/application/hooks/use-student-session";
import { trackLeadCapture } from "@/application/services/analytics-tracker";
import { logoutStudent } from "@/application/services/student-session";
import type { SiteContext } from "@/application/hooks/use-site-context";
import type { SiteFooterBlockProps } from "@/domain/entities/page-builder";
import type { SeniorsContent, SeniorsHeroSlide, SeniorsWhyCard } from "@/domain/entities/seniors-content";
import { resolveSiteLink } from "@/presentation/components/website/builder/resolve-link";
import { TenantSiteLogo } from "@/presentation/components/website/shared/TenantSiteLogo";
import { buildDefaultSeniorsContent } from "@/shared/lib/seniors-content";
import { cn } from "@/shared/lib/utils";
import { SeniorsLandingFooter } from "@/presentation/components/templates/seniors/SeniorsLandingFooter";
import { SeniorsMediaImage } from "@/presentation/components/templates/seniors/shared/SeniorsMediaImage";
import { SENIORS_AUDIENCE_NAV } from "@/shared/config/seniors-audiences";
import { coachingImage } from "@/infrastructure/data/coaching-stock-images";

const SeniorsAuthDrawer = dynamic(
  () =>
    import("@/presentation/components/templates/seniors/SeniorsAuthDrawer").then(
      (m) => m.SeniorsAuthDrawer,
    ),
  { ssr: false },
);

const SeniorsProductGlimpse = dynamic(
  () =>
    import("@/presentation/components/templates/seniors/SeniorsProductGlimpse").then(
      (m) => m.SeniorsProductGlimpse,
    ),
  { ssr: true, loading: () => <div className="min-h-[320px] bg-white" aria-hidden /> },
);

const SeniorsConcernBanner = dynamic(
  () =>
    import("@/presentation/components/templates/seniors/SeniorsConcernBanner").then(
      (m) => m.SeniorsConcernBanner,
    ),
  { ssr: true, loading: () => <div className="h-[350px] bg-[#E8EEF7]" aria-hidden /> },
);

const SeniorsFaqSection = dynamic(
  () =>
    import("@/presentation/components/templates/seniors/SeniorsFaqSection").then(
      (m) => m.SeniorsFaqSection,
    ),
  { ssr: true, loading: () => <div className="min-h-[280px] bg-white" aria-hidden /> },
);

const FEATURE_ICONS = {
  school: School,
  bot: Bot,
  book: BookOpen,
  clipboard: ClipboardCheck,
  users: Users,
  chart: BarChart3,
  trophy: Trophy,
} as const;

const WHY_ICONS = {
  layers: Layers,
  lightbulb: Lightbulb,
  map: MapPin,
  compass: Compass,
  school: School,
  book: BookOpen,
  chart: BarChart3,
} as const;

const WHY_CARD_LAYOUT = [
  "md:[grid-area:why-a]",
  "md:[grid-area:why-b]",
  "md:[grid-area:why-c]",
  "md:[grid-area:why-d] md:h-full md:min-h-0",
] as const;

/** Unacademy-style pastel icon backgrounds per feature */
const FEATURE_ICON_BG = [
  "bg-violet-100 text-violet-600",
  "bg-sky-100 text-sky-600",
  "bg-amber-100 text-amber-600",
  "bg-rose-100 text-rose-600",
  "bg-teal-100 text-teal-600",
  "bg-indigo-100 text-indigo-600",
  "bg-orange-100 text-orange-600",
];

const BLUE = "#2563EB";
const INK = "#3C4852";
const MUTED = "#707070";
const BORDER = "#E0E0E0";

function resolveHref(
  link: string,
  sitePath: ((segment?: string) => string) | undefined,
  linkFor: ((segment: string) => string) | undefined,
): string {
  const trimmed = link.trim();
  if (trimmed.startsWith("#")) return trimmed;
  if (sitePath) return resolveSiteLink(sitePath, trimmed);
  if (linkFor) {
    if (trimmed.startsWith("http")) return trimmed;
    const segment = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
    return linkFor(segment);
  }
  return trimmed || "/";
}

function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1180px] px-4 sm:px-6", className)}>{children}</div>
  );
}

function HighlightedHeading({ text }: { text: string }) {
  const parts = text.split(/(Seniors)/i);
  return (
    <h2 className="mx-auto max-w-3xl text-center text-2xl font-bold leading-tight text-[#0F172A] sm:text-3xl lg:text-[2.15rem]">
      {parts.map((part, i) =>
        part.toLowerCase() === "seniors" ? (
          <span key={i} className="text-[#38BDF8]">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </h2>
  );
}

const ADVANTAGE_SCENES = [
  {
    blob: "bg-[#DBEAFE]",
    photo: coachingImage("teacherB", 640),
    photoClass: "left-[8%] top-[18%] h-[188px] w-[132px]",
  },
  {
    blob: "bg-[#E0F2FE]",
    photo: coachingImage("professional", 640),
    photoClass: "left-[8%] top-[20%] h-[180px] w-[138px]",
  },
  {
    blob: "bg-[#EFF6FF]",
    photo: coachingImage("students", 640),
    photoClass: "left-[8%] top-[22%] h-[176px] w-[148px]",
  },
  {
    blob: "bg-[#F0F9FF]",
    photo: coachingImage("study", 640),
    photoClass: "left-[10%] top-[20%] h-[180px] w-[136px]",
  },
] as const;

function AdvantageCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute right-0 top-[24%] z-[2] w-[138px] rounded-xl border border-[#BFDBFE] bg-white p-2.5 shadow-[0_10px_28px_rgba(37,99,235,0.12)] transition duration-500 group-hover:-translate-y-2">
      {children}
    </div>
  );
}

function AdvantageVisual({ index }: { index: number }) {
  const scene = ADVANTAGE_SCENES[index] ?? ADVANTAGE_SCENES[0];
  return (
    <div className="group relative mx-auto h-[270px] w-full max-w-[260px]">
      <div
        className={cn(
          "absolute left-1/2 top-[46%] h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full transition duration-500 group-hover:scale-105",
          scene.blob,
        )}
      />
      <SeniorsMediaImage
        src={scene.photo}
        alt=""
        width={296}
        height={376}
        sizes="148px"
        className={cn(
          "absolute z-[1] rounded-2xl object-cover shadow-[0_16px_36px_rgba(14,165,233,0.16)] transition duration-500 group-hover:-translate-y-1.5",
          scene.photoClass,
        )}
      />
      {index === 0 ? (
        <AdvantageCard>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#38BDF8]">School twin</p>
          <p className="mt-1 text-xs font-bold text-[#0F172A]">Marking scheme</p>
          <div className="mt-2 space-y-1.5">
            {["Answer format", "Exam calendar"].map((row) => (
              <div key={row} className="flex items-center gap-2 text-[11px] text-[#64748B]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]" />
                {row}
              </div>
            ))}
          </div>
        </AdvantageCard>
      ) : null}
      {index === 1 ? (
        <AdvantageCard>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#38BDF8]">Topic Studio</p>
          <p className="mt-1 text-xs font-bold text-[#0F172A]">How we teach</p>
          <div className="mt-2 space-y-1.5">
            {["Explanation", "Model answers"].map((row) => (
              <div key={row} className="flex items-center gap-2 text-[11px] text-[#64748B]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]" />
                {row}
              </div>
            ))}
          </div>
        </AdvantageCard>
      ) : null}
      {index === 2 ? (
        <AdvantageCard>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#38BDF8]">Topic path</p>
          <div className="mt-2 space-y-1.5">
            {["Notes", "Practice", "Quiz"].map((label) => (
              <div key={label} className="flex items-center gap-2 text-[11px] font-semibold text-[#0F172A]">
                <span className="h-2 w-2 rounded-full bg-[#38BDF8]" />
                {label}
              </div>
            ))}
          </div>
        </AdvantageCard>
      ) : null}
      {index === 3 ? (
        <AdvantageCard>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#38BDF8]">Parents</p>
          <p className="mt-1 text-xs font-bold text-[#0F172A]">Syllabus progress</p>
          <p className="mt-1 text-sm font-bold text-[#0F172A]">72%</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E0F2FE]">
            <div className="h-full w-[72%] rounded-full bg-[#38BDF8]" />
          </div>
          <p className="mt-2 text-[11px] font-semibold text-[#0F172A]">Parents stay close</p>
        </AdvantageCard>
      ) : null}
    </div>
  );
}

function WhyBentoCard({
  card,
  index,
  href,
}: {
  card: SeniorsWhyCard;
  index: number;
  href: (link: string) => string;
}) {
  const Icon =
    WHY_ICONS[card.icon as keyof typeof WHY_ICONS] ??
    WHY_ICONS[Object.keys(WHY_ICONS)[index % Object.keys(WHY_ICONS).length] as keyof typeof WHY_ICONS];
  const isHighlight = card.variant === "highlight" || index === 3;

  if (isHighlight) {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-col justify-between rounded-2xl bg-gradient-to-b from-[#0F172A] to-[#1E293B] p-4 sm:p-5",
          WHY_CARD_LAYOUT[index],
        )}
      >
        <div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]">
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
          </div>
          <h3 className="mt-4 text-base font-bold leading-snug text-white sm:text-lg">{card.title}</h3>
        </div>
        {card.description ? (
          <p className="text-sm leading-relaxed text-slate-300 sm:text-[0.95rem]">{card.description}</p>
        ) : null}
        {card.ctaLabel ? (
          <Link
            href={href(card.ctaLink ?? "#demo-booking")}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-[#38BDF8] px-4 py-2 text-sm font-semibold text-[#0F172A] transition hover:bg-[#7DD3FC]"
          >
            {card.ctaLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#DBEAFE] bg-[#F0F7FF] p-5 sm:p-6 lg:p-5 xl:p-6",
        WHY_CARD_LAYOUT[index],
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#BFDBFE] bg-white text-[#2563EB] lg:h-7 lg:w-7">
        <Icon className="h-3.5 w-3.5 lg:h-3 lg:w-3" strokeWidth={1.75} />
      </div>
      <h3 className="mt-4 text-base font-bold leading-snug text-[#0F172A] sm:text-lg lg:mt-3 lg:text-sm xl:text-base">
        {card.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[#64748B] lg:text-xs lg:leading-snug xl:text-sm">
        {card.description}
      </p>
    </div>
  );
}

const CAROUSEL_INTERVAL_MS = 5000;

function HeroPromoCarousel({
  slides,
  fallback,
  defaultEyebrow,
  ctaHref,
  ctaLabel,
}: {
  slides: SeniorsHeroSlide[];
  fallback: SeniorsContent["hero"];
  defaultEyebrow: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  const items = useMemo(() => {
    if (slides.length > 0) return slides;
    if (fallback.imageUrl?.trim()) {
      return [{ imageUrl: fallback.imageUrl, headline: fallback.headline, subheadline: fallback.subheadline }];
    }
    return [{ imageUrl: "", headline: fallback.headline, subheadline: fallback.subheadline }];
  }, [slides, fallback]);

  const infinite = items.length > 1;
  const loopItems = useMemo(() => {
    if (!infinite) return items;
    return [items[items.length - 1], ...items, items[0]];
  }, [items, infinite]);

  /** Position in loopItems (1 = first real slide when infinite) */
  const [pos, setPos] = useState(infinite ? 1 : 0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);

  const realIndex = infinite
    ? pos === 0
      ? items.length - 1
      : pos === loopItems.length - 1
        ? 0
        : pos - 1
    : 0;

  const goNext = useCallback(() => {
    if (!infinite) return;
    setAnimate(true);
    setPos((p) => p + 1);
  }, [infinite]);

  const goPrev = useCallback(() => {
    if (!infinite) return;
    setAnimate(true);
    setPos((p) => p - 1);
  }, [infinite]);

  const goToReal = useCallback(
    (real: number) => {
      if (!infinite) return;
      setAnimate(true);
      setPos(real + 1);
    },
    [infinite],
  );

  useEffect(() => {
    if (!infinite || paused) return;
    const timer = window.setInterval(goNext, CAROUSEL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [infinite, paused, goNext]);

  /** Seamless wrap after clone slides */
  useEffect(() => {
    if (!infinite || !animate) return;
    if (pos !== 0 && pos !== loopItems.length - 1) return;

    const id = window.setTimeout(() => {
      setAnimate(false);
      setPos(pos === 0 ? items.length : 1);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setAnimate(true));
      });
    }, 520);
    return () => window.clearTimeout(id);
  }, [pos, infinite, animate, items.length, loopItems.length]);

  return (
    <div
      className="relative w-full overflow-hidden py-1"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className={cn(
          "flex gap-4 will-change-transform",
          animate && "transition-transform duration-500 ease-out",
        )}
        style={{
          transform: `translateX(calc(50% - min(44vw, 560px) - ${pos} * (min(88vw, 1120px) + 1rem)))`,
        }}
      >
        {loopItems.map((item, i) => {
          const eyebrow = item.eyebrow || defaultEyebrow;
          const headline = item.headline || fallback.headline;
          const subheadline = item.subheadline || fallback.subheadline;
          const active = infinite ? i === pos : i === 0;
          const nearActive =
            !infinite ||
            Math.abs(i - pos) <= 1 ||
            (pos === 0 && i === loopItems.length - 1) ||
            (pos === loopItems.length - 1 && i === 0);
          return (
            <article
              key={`${item.imageUrl}-loop-${i}`}
              className={cn(
                "relative grid h-[280px] w-[min(88vw,1120px)] shrink-0 overflow-hidden rounded-2xl bg-[#0B1F3A] transition-opacity duration-500 sm:h-[320px] lg:h-[360px] lg:grid-cols-2 xl:h-[380px]",
                active ? "opacity-100" : "opacity-80",
              )}
            >
              <div className="relative z-10 flex flex-col justify-center px-5 py-5 sm:px-8 sm:py-6 lg:px-10">
                {eyebrow ? (
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#38BDF8] sm:text-xs">
                    {eyebrow}
                  </p>
                ) : null}
                <h1 className="mt-1.5 max-w-md text-xl font-bold leading-tight text-white sm:text-2xl lg:text-[1.85rem]">
                  {headline}
                </h1>
                <p className="mt-2 max-w-md text-xs leading-relaxed text-white/75 sm:text-sm">
                  {subheadline}
                </p>
                {active ? (
                  <Link
                    href={ctaHref}
                    className="mt-4 inline-flex w-fit rounded-lg bg-[#2563EB] px-5 py-2 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] transition hover:bg-[#1D4ED8]"
                  >
                    {ctaLabel}
                  </Link>
                ) : (
                  <span className="mt-4 inline-flex w-fit rounded-lg bg-[#2563EB]/70 px-5 py-2 text-sm font-bold text-white/90">
                    {ctaLabel}
                  </span>
                )}
              </div>

              <div className="relative h-[42%] min-h-[120px] lg:h-full lg:min-h-0">
                {item.imageUrl?.trim() && nearActive ? (
                  <SeniorsMediaImage
                    src={item.imageUrl}
                    alt=""
                    fill
                    priority={i === (infinite ? 1 : 0)}
                    sizes="(max-width: 1024px) 88vw, 560px"
                    className="object-cover object-center"
                    draggable={false}
                  />
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {infinite ? (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous slide"
            className="absolute left-[calc(50%-min(44vw,560px)+0.5rem)] top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#0F172A] shadow-lg transition hover:scale-105 sm:h-10 sm:w-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next slide"
            className="absolute right-[calc(50%-min(44vw,560px)+0.5rem)] top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#0F172A] shadow-lg transition hover:scale-105 sm:h-10 sm:w-10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="mt-3 flex justify-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goToReal(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === realIndex ? "w-4 bg-[#2563EB]" : "w-1.5 bg-[#CBD5E1] hover:bg-[#94A3B8]",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export type SeniorsLandingProps = {
  brandName?: string;
  tenantMode?: boolean;
  /** /seniors product page -not a school website */
  platformMode?: boolean;
  siteCtx?: SiteContext;
  content?: SeniorsContent;
  linkFor?: (segment: string) => string;
};

const NAV_TABS = [
  { id: "hero", label: "Get started" },
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How it works" },
  { id: "demo-booking", label: "Book demo" },
] as const;

export function SeniorsLanding({
  brandName,
  tenantMode = false,
  platformMode = false,
  siteCtx,
  content,
  linkFor,
}: SeniorsLandingProps) {
  const C = content ?? buildDefaultSeniorsContent();
  /** Product brand is always Seniors -school name is never the platform brand */
  const brand = brandName ?? "Seniors";
  const accent = platformMode ? BLUE : siteCtx?.brandHex ?? BLUE;
  const sitePath = siteCtx?.sitePath;
  const tenantSlug = siteCtx?.tenant ?? "";
  const { session: studentSession, ready: studentReady } = useStudentSession(tenantSlug);

  const [activeNav, setActiveNav] = useState<string>("hero");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [demoSchool, setDemoSchool] = useState("");
  const [demoContact, setDemoContact] = useState("");
  const [demoEmail, setDemoEmail] = useState("");
  const [demoPhone, setDemoPhone] = useState("");
  const [demoMessage, setDemoMessage] = useState("");
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoSaving, setDemoSaving] = useState(false);

  const href = (link: string) => resolveHref(link, sitePath, linkFor);
  const footerProps =
    siteCtx?.footerBlock?.type === "site-footer"
      ? (siteCtx.footerBlock.props as SiteFooterBlockProps)
      : null;
  const supportPhone = footerProps?.phone?.trim() || "";
  const homeHref = platformMode
    ? "/seniors"
    : tenantMode && sitePath
      ? sitePath()
      : "/seniors";

  function openAuth(mode: "login" | "signup" = "login") {
    setAuthMode(mode);
    setAuthOpen(true);
  }

  async function handleStudentLogout() {
    if (!siteCtx?.tenant) return;
    await logoutStudent(siteCtx.tenant);
    window.location.href = siteCtx.sitePath();
  }

  function scrollToSection(id: string) {
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="seniors-landing min-h-screen overflow-x-hidden bg-white text-[#3C4852]">
      {/* ── Top bar: Seniors platform + Login ── */}
      <header className="sticky top-0 z-50 bg-white shadow-[0_1px_0_rgba(0,0,0,0.06)]">
        <div style={{ backgroundColor: accent }}>
          <PageContainer className="flex items-center gap-4 py-3 sm:gap-6">
            <Link href={homeHref} className="flex shrink-0 items-center gap-2">
              <TenantSiteLogo
                logoUrl={platformMode ? undefined : siteCtx?.logoUrl}
                academyName={brand}
                imageClassName="h-7 brightness-0 invert"
              />
              <span className="text-base font-extrabold tracking-wide text-white">
                SENIORS
              </span>
            </Link>

            <nav className="hidden items-center gap-0.5 md:flex lg:gap-1">
              {SENIORS_AUDIENCE_NAV.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-white/95 hover:bg-white/15"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              {supportPhone ? (
                <a
                  href={`tel:${supportPhone.replace(/\s/g, "")}`}
                  className="hidden items-center gap-1.5 text-xs font-medium text-white/90 lg:flex"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {supportPhone}
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => scrollToSection("demo-booking")}
                className="hidden text-sm font-semibold text-white/95 hover:underline sm:inline"
              >
                Enquire Now
              </button>
              {tenantMode && siteCtx && studentReady && studentSession ? (
                <div className="flex items-center gap-2">
                  <Link
                    href={siteCtx.sitePath("student/home")}
                    className="rounded-lg border border-white bg-white px-3 py-1.5 text-xs font-bold"
                    style={{ color: accent }}
                  >
                    My Learning
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleStudentLogout()}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white"
                  >
                    {studentSession.fullName?.charAt(0) ?? "U"}
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => openAuth("login")}
                    className="rounded-lg border-2 border-white px-4 py-1.5 text-sm font-bold text-white hover:bg-white/10"
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuth("signup")}
                    className="hidden rounded-lg bg-white px-4 py-1.5 text-sm font-bold sm:inline"
                    style={{ color: accent }}
                  >
                    Signup
                  </button>
                </>
              )}
            </div>
          </PageContainer>
        </div>

        {/* Mobile audience links */}
        <div
          className="flex gap-1 overflow-x-auto px-4 py-2 md:hidden"
          style={{ backgroundColor: accent }}
        >
          {SENIORS_AUDIENCE_NAV.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* ── Section sub-nav (restored) ── */}
        <nav className="border-b border-[#F0F0F0] bg-white">
          <PageContainer className="flex gap-6 overflow-x-auto scrollbar-none">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => scrollToSection(tab.id)}
                className={cn(
                  "shrink-0 border-b-[3px] py-3 text-sm font-semibold transition",
                  activeNav === tab.id
                    ? "border-[#3C4852] text-[#3C4852]"
                    : "border-transparent text-[#707070] hover:text-[#3C4852]",
                )}
              >
                {tab.label}
              </button>
            ))}
          </PageContainer>
        </nav>
      </header>

      {authOpen ? (
        <SeniorsAuthDrawer
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          ctx={siteCtx}
          accent={accent}
          mode={authMode}
          platformMode={platformMode || !siteCtx?.tenant}
          onRequestSignup={() => setAuthMode("signup")}
          onRequestLogin={() => setAuthMode("login")}
        />
      ) : null}

      <main>
        {/* ── Promo banner carousel (full-bleed peek) ── */}
        <section id="hero" className="overflow-x-clip bg-white pt-4 pb-2">
          <HeroPromoCarousel
            slides={C.hero.slides ?? []}
            fallback={C.hero}
            defaultEyebrow={C.brand.trustLine}
            ctaHref={href(C.hero.primaryCta.link)}
            ctaLabel={C.hero.primaryCta.label}
          />
        </section>

        {/* ── Main CTA block ── */}
        <section className="border-b border-[#F0F0F0] bg-white py-8 sm:py-10">
          <PageContainer className="flex flex-col items-center gap-6 text-center">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold leading-tight text-[#0F172A] sm:text-3xl lg:text-[2.15rem]">
                {C.hero.headline.split(/(Your School Teaches)/i).map((part, i) =>
                  /your school teaches/i.test(part) ? (
                    <span key={i} className="text-[#38BDF8]">
                      {part}
                    </span>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
              </h2>
              <p className="mt-3 text-sm text-[#64748B] sm:text-base">
                {C.brand.trustLine}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/seniors/for/student"
                className="rounded-lg border border-[#3C4852] bg-white px-5 py-2.5 text-sm font-semibold text-[#3C4852] hover:bg-[#F9F9F9]"
              >
                See student demo
              </Link>
              <button
                type="button"
                onClick={() => openAuth("login")}
                className="rounded-lg border border-[#3C4852] bg-white px-5 py-2.5 text-sm font-semibold text-[#3C4852] hover:bg-[#F9F9F9]"
              >
                Login
              </button>
              <Link
                href={href(C.hero.primaryCta.link)}
                className="rounded-lg px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
                style={{ backgroundColor: accent }}
              >
                {C.hero.primaryCta.label}
              </Link>
            </div>
          </PageContainer>
        </section>

        {/* ── Select your role ── */}
        <section id="goals" className="bg-white py-10 sm:py-12">
          <PageContainer>
            <h2 className="text-center text-2xl font-bold leading-tight text-[#0F172A] sm:text-3xl lg:text-[2.15rem]">
              {C.goals.titleBefore}{" "}
              <span className="text-[#38BDF8]">{C.goals.titleHighlight}</span>
            </h2>
            <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
              {C.goals.items.map((goal) => {
                const isSchool = goal.id === "school";
                return (
                  <Link
                    key={goal.id}
                    href={href(goal.href || "#demo-booking")}
                    className="group flex flex-col items-center rounded-2xl border border-[#E5E7EB] bg-white p-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-[#BFDBFE] hover:shadow-[0_8px_20px_rgba(37,99,235,0.1)] sm:p-3"
                  >
                    <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-[#F0F7FF]">
                      {goal.imageUrl?.trim() ? (
                        <SeniorsMediaImage
                          src={goal.imageUrl}
                          alt={goal.label}
                          fill
                          sizes="(max-width: 640px) 45vw, 180px"
                          className={cn(
                            "object-contain object-center transition",
                            isSchool
                              ? "origin-center translate-y-3 scale-[1.75] group-hover:scale-[1.8]"
                              : "origin-center translate-y-2 scale-[1.32] group-hover:scale-[1.38]",
                          )}
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F1FB] text-3xl font-bold text-[#94A3B8]">
                          {goal.label.slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <p className="mt-3 text-center text-base font-bold text-[#0F172A] sm:text-lg">
                      {goal.label}
                    </p>
                  </Link>
                );
              })}
            </div>
          </PageContainer>
        </section>

        {/* ── Product glimpse (laptop mockup) ── */}
        <SeniorsProductGlimpse onCta={() => scrollToSection("demo-booking")} />

        {/* ── Feature grid ── */}
        <section id="features" className="bg-white py-10 sm:py-12">
          <PageContainer>
            <h2 className="text-center text-2xl font-bold leading-tight text-[#0F172A] sm:text-3xl lg:text-[2.15rem]">
              {C.features.title}
            </h2>
            {C.features.subtitle?.trim() ? (
              <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#64748B] sm:text-base">
                {C.features.subtitle}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-4">
              {C.features.items.map((item, i) => {
                const Icon = FEATURE_ICONS[item.icon as keyof typeof FEATURE_ICONS] ?? School;
                const iconBg = FEATURE_ICON_BG[i % FEATURE_ICON_BG.length];
                return (
                  <div
                    key={item.title}
                    className="group flex w-[calc(50%-0.375rem)] max-w-[200px] flex-col items-center rounded-xl bg-white px-3 py-5 text-center transition hover:-translate-y-0.5 sm:w-[calc(33.333%-0.75rem)] lg:w-[calc(25%-0.75rem)]"
                  >
                    <div
                      className={cn(
                        "mb-4 flex h-16 w-16 items-center justify-center rounded-2xl sm:h-[4.5rem] sm:w-[4.5rem]",
                        iconBg,
                      )}
                    >
                      <Icon className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-sm font-bold text-[#0F172A] sm:text-base">{item.title}</h3>
                  </div>
                );
              })}
            </div>
          </PageContainer>
        </section>

        {/* ── Concern → Seniors resolves (animated) ── */}
        <SeniorsConcernBanner />

        {/* ── Why Seniors (bento grid) ── */}
        <section id="why" className="bg-white pt-20 pb-10 sm:pt-24 sm:pb-12">
          <PageContainer>
            <h2 className="mx-auto max-w-3xl text-center text-2xl font-bold leading-tight text-[#0F172A] sm:text-3xl lg:text-[2.15rem]">
              {C.why.titleBefore}{" "}
              <span className="text-[#38BDF8]">{C.why.titleHighlight}</span>{" "}
              {C.why.titleAfter}
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:mt-10 md:grid-cols-3 md:items-stretch md:gap-3 md:[grid-template-areas:'why-a_why-b_why-d'_'why-c_why-c_why-d']">
              {C.why.cards.slice(0, 4).map((card, i) => (
                <WhyBentoCard key={`${card.title}-${i}`} card={card} index={i} href={href} />
              ))}
            </div>
          </PageContainer>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="bg-white pt-20 pb-10 sm:pt-24 sm:pb-12">
          <PageContainer>
            <HighlightedHeading text={C.howItWorks.title} />
            {C.howItWorks.subtitle?.trim() ? (
              <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-[#64748B] sm:text-[0.95rem]">
                {C.howItWorks.subtitle}
              </p>
            ) : null}
            <div className="mt-8 grid gap-6 sm:mt-10 sm:grid-cols-2 lg:grid-cols-4">
              {C.howItWorks.steps.slice(0, 4).map((step, i) => (
                <div key={step.step} className="text-center">
                  <AdvantageVisual index={i} />
                  <p className="mx-auto mt-4 max-w-[200px] text-sm font-semibold leading-snug text-[#0F172A]">
                    {step.title}
                  </p>
                  {step.description?.trim() ? (
                    <p className="mx-auto mt-2 max-w-[220px] text-xs leading-relaxed text-[#64748B]">
                      {step.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </PageContainer>
        </section>

        <SeniorsFaqSection
          titleBefore={C.faq.titleBefore}
          titleHighlight={C.faq.titleHighlight}
          imageUrl={C.faq.imageUrl}
          items={C.faq.items}
        />

        {/* ── AI Doubt Solving (after FAQ) ── */}
        <section id="ai-doubts" className="bg-white py-8 sm:py-10">
          <PageContainer>
            <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
              <div className="max-w-lg">
                <h2 className="text-2xl font-bold leading-tight text-[#0F172A] sm:text-3xl lg:text-[2.15rem]">
                  AI <span className="text-[#38BDF8]">Doubt Solving</span>
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#64748B] sm:text-base">
                  Answers according to your teachers&apos; notes -not random internet content.
                </p>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {[
                    { icon: NotebookPen, label: "Teachers' notes" },
                    { icon: MessageCircleQuestionMark, label: "Ask anytime" },
                    { icon: Lightbulb, label: "Clear answers" },
                  ].map(({ icon: Icon, label }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#BFDBFE] bg-[#F0F7FF] px-3 py-1.5 text-xs font-semibold text-[#2563EB]"
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative mx-auto flex w-full max-w-lg items-center justify-center overflow-visible py-2 lg:max-w-none lg:py-0">
                <div
                  className="absolute left-1/2 top-[55%] h-[62%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-[42%_58%_48%_52%] bg-gradient-to-br from-[#C7DBFF] via-[#DCE8FF] to-[#A8C8F8] opacity-95"
                  aria-hidden
                />
                <div
                  className="absolute left-[12%] top-[28%] h-20 w-20 rounded-full bg-[#93C5FD]/35 blur-2xl"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute right-[2%] top-[10%] z-20 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#60A5FA] to-[#2563EB] text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)] sm:h-14 sm:w-14"
                  aria-hidden
                >
                  <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} />
                </div>
                <div
                  className="pointer-events-none absolute bottom-[14%] right-[8%] z-20 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FBBF24] to-[#F59E0B] text-white shadow-[0_10px_24px_rgba(245,158,11,0.3)] sm:h-12 sm:w-12"
                  aria-hidden
                >
                  <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" strokeWidth={1.5} />
                </div>
                <div
                  className="pointer-events-none absolute left-[4%] top-[42%] z-20 flex h-11 w-11 rotate-[-8deg] items-center justify-center rounded-2xl bg-gradient-to-br from-[#34D399] to-[#059669] text-white shadow-[0_10px_24px_rgba(5,150,105,0.28)] sm:left-[2%] sm:h-12 sm:w-12"
                  aria-hidden
                >
                  <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
                </div>
                <div
                  className="pointer-events-none absolute bottom-[20%] left-[10%] z-20 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white shadow-[0_10px_24px_rgba(124,58,237,0.28)]"
                  aria-hidden
                >
                  <MessageCircleQuestionMark className="h-5 w-5" strokeWidth={2} />
                </div>
                <SeniorsMediaImage
                  src="/assets/seniors/ai.png"
                  alt="AI doubt solving based on teacher notes"
                  width={640}
                  height={640}
                  sizes="(max-width: 640px) 92vw, 512px"
                  className="relative z-10 h-auto w-[96%] max-w-md scale-[1.12] bg-transparent object-contain sm:w-[92%] sm:max-w-lg sm:scale-[1.18]"
                  draggable={false}
                />
              </div>
            </div>
          </PageContainer>
        </section>

        {/* ── Demo booking ── */}
        <section id="demo-booking" className="bg-white pt-20 pb-10 sm:pt-24 sm:pb-12">
          <PageContainer>
            <h2 className="mx-auto max-w-3xl text-center text-2xl font-bold leading-tight text-[#0F172A] sm:text-3xl lg:text-[2.15rem]">
              {C.demoBooking.title.split(/(Demo)/i).map((part, i) =>
                part.toLowerCase() === "demo" ? (
                  <span key={i} className="text-[#38BDF8]">
                    {part}
                  </span>
                ) : (
                  <span key={i}>{part}</span>
                ),
              )}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-[#64748B] sm:text-[0.95rem]">
              {C.demoBooking.description}
            </p>
            <div className="mt-8 overflow-hidden rounded-2xl border border-[#DBEAFE] bg-[#F0F7FF] shadow-[0_1px_3px_rgba(37,99,235,0.06)] sm:mt-10">
              <div className="grid lg:grid-cols-2">
                <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                  <p className="text-sm font-semibold text-[#0F172A] sm:text-base">
                    Ready to see Seniors for your campus?
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                    Share a few details and we&apos;ll set up a walkthrough tailored to your school.
                  </p>
                  <Link
                    href="#demo-booking-form"
                    className="mt-6 inline-flex w-fit rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition hover:bg-[#1D4ED8]"
                  >
                    {C.demoBooking.ctaLabel}
                  </Link>
                </div>
                <div
                  id="demo-booking-form"
                  className="border-t border-[#DBEAFE] bg-white p-6 sm:p-8 lg:border-l lg:border-t-0"
                >
                  {demoSubmitted ? (
                    <p className="py-8 text-center text-sm font-medium text-[#0F172A]">
                      {C.demoBooking.successMessage}
                    </p>
                  ) : (
                    <form
                      className="space-y-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        setDemoSaving(true);
                        const finish = () => {
                          setDemoSaving(false);
                          setDemoSubmitted(true);
                        };
                        if (tenantMode && siteCtx?.tenant) {
                          void trackLeadCapture(
                            siteCtx.tenant,
                            {
                              fullName: demoContact.trim(),
                              email: demoEmail.trim(),
                              phone: demoPhone.trim(),
                              source: "seniors-demo-booking",
                              courseInterest: demoSchool.trim(),
                              notes: demoMessage.trim(),
                            },
                            "seniors_demo_booking",
                          )
                            .catch(() => undefined)
                            .finally(finish);
                        } else {
                          finish();
                        }
                      }}
                    >
                      <input
                        type="text"
                        required
                        value={demoSchool}
                        onChange={(e) => setDemoSchool(e.target.value)}
                        placeholder={C.demoBooking.schoolNameLabel}
                        className="w-full rounded-lg border border-[#BFDBFE] bg-[#F8FBFF] px-4 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#38BDF8] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/25"
                      />
                      <input
                        type="text"
                        required
                        value={demoContact}
                        onChange={(e) => setDemoContact(e.target.value)}
                        placeholder={C.demoBooking.contactNameLabel}
                        className="w-full rounded-lg border border-[#BFDBFE] bg-[#F8FBFF] px-4 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#38BDF8] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/25"
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          type="email"
                          required
                          value={demoEmail}
                          onChange={(e) => setDemoEmail(e.target.value)}
                          placeholder={C.demoBooking.emailLabel}
                          className="w-full rounded-lg border border-[#BFDBFE] bg-[#F8FBFF] px-4 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#38BDF8] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/25"
                        />
                        <input
                          type="tel"
                          required
                          value={demoPhone}
                          onChange={(e) => setDemoPhone(e.target.value)}
                          placeholder={C.demoBooking.phoneLabel}
                          className="w-full rounded-lg border border-[#BFDBFE] bg-[#F8FBFF] px-4 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#38BDF8] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/25"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={demoMessage}
                        onChange={(e) => setDemoMessage(e.target.value)}
                        placeholder={C.demoBooking.messageLabel}
                        className="w-full rounded-lg border border-[#BFDBFE] bg-[#F8FBFF] px-4 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#38BDF8] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/25"
                      />
                      <button
                        type="submit"
                        disabled={demoSaving}
                        className="w-full rounded-xl bg-[#2563EB] py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition hover:bg-[#1D4ED8] disabled:opacity-60"
                      >
                        {demoSaving ? "Submitting…" : C.demoBooking.ctaLabel}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </PageContainer>
        </section>

        {/* ── Final CTA (subscription strip) ── */}
        <section id="final-cta" className="border-t border-[#E0E0E0] bg-[#FAFAFA] py-8">
          <PageContainer className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#3C4852]">{C.finalCta.headline}</h2>
              <p className="mt-1 text-sm text-[#707070]">{C.finalCta.subtext}</p>
            </div>
            <Link
              href={href(C.finalCta.ctaLink)}
              className="inline-flex shrink-0 rounded-lg px-6 py-2.5 text-sm font-bold text-white hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              {C.finalCta.ctaLabel}
            </Link>
          </PageContainer>
        </section>
      </main>

      {/* ── Floating widgets (AI Doubts + support) ── */}
      <div className="pointer-events-none fixed bottom-6 right-4 z-40 flex flex-col items-end gap-3 sm:right-6">
        <a
          href="#ai-doubts"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-[#3C4852] px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-[#2d3640]"
        >
          <Sparkles className="h-4 w-4 text-amber-300" />
          AI Doubts
        </a>
        <a
          href={supportPhone ? `tel:${supportPhone.replace(/\s/g, "")}` : href(C.hero.primaryCta.link)}
          className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#3C4852] text-white shadow-lg hover:bg-[#2d3640]"
          aria-label="Contact support"
        >
          <Headphones className="h-5 w-5" />
        </a>
      </div>

      <SeniorsLandingFooter
        brand={brand}
        tagline={C.brand.tagline}
        homeHref={homeHref}
        phone={supportPhone || undefined}
        loginLinks={[
          { label: C.hero.schoolLogin.label, href: href(C.hero.schoolLogin.link) },
          { label: C.hero.teacherLogin.label, href: href(C.hero.teacherLogin.link) },
          { label: C.hero.studentLogin.label, href: href(C.hero.studentLogin.link) },
          { label: C.hero.parentLogin.label, href: href(C.hero.parentLogin.link) },
        ]}
      />
    </div>
  );
}
