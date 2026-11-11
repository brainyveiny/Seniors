"use client";

import type { CSSProperties, ReactNode } from "react";
import { Check, X } from "lucide-react";
import { SeniorsBrandMark } from "@/presentation/components/templates/seniors/SeniorsBrandMark";
import { seniorsBrandCssVars } from "@/shared/lib/seniors-brand";
import { cn } from "@/shared/lib/utils";

export const SENIORS_AUTH_PRIMARY = "#570080";

export const SENIORS_AUTH_GRADIENT =
  "linear-gradient(105deg, #ffc94d 0%, #f2006d 48%, #570080 100%)";

export const SENIORS_AUTH_INPUT =
  "w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] transition focus:border-[var(--sp-auth-accent,#f2006d)] focus:outline-none focus:ring-2 focus:ring-[var(--sp-auth-accent,#f2006d)]/15";

/** School branding shown on tenant login pages (set by the super admin). */
export type SeniorsAuthSchoolBrand = {
  name: string;
  logoUrl: string;
  tagline: string;
  brandHex: string;
};

/**
 * Colour tokens used by the auth card: `--sp-auth-primary` (badges),
 * `--sp-auth-on-primary`, `--sp-auth-link`, `--sp-auth-accent` (focus) and
 * `--sp-auth-button` (submit background).
 */
function authThemeStyle(school: SeniorsAuthSchoolBrand | null | undefined): CSSProperties {
  if (!school) {
    return {
      "--sp-auth-primary": SENIORS_AUTH_PRIMARY,
      "--sp-auth-on-primary": "#FFFFFF",
      "--sp-auth-link": SENIORS_AUTH_PRIMARY,
      "--sp-auth-accent": "#f2006d",
      "--sp-auth-button": SENIORS_AUTH_GRADIENT,
    } as CSSProperties;
  }
  return {
    ...seniorsBrandCssVars(school.brandHex, false),
    "--sp-auth-primary": "var(--sp-brand)",
    "--sp-auth-on-primary": "var(--sp-on-brand)",
    "--sp-auth-link": "var(--sp-brand-text)",
    "--sp-auth-accent": "var(--sp-brand)",
    "--sp-auth-button": "var(--sp-brand)",
  } as CSSProperties;
}

const AUTH_FEATURES = [
  "School-aligned learning paths",
  "Assessments that match your exams",
  "Students, teachers & parents connected",
];

const SCHOOL_FEATURES = [
  "Your syllabus, homework and tests in one place",
  "Progress tracking for students and parents",
  "Updates straight from your teachers",
];

function AuthDecorPanel({ school }: { school?: SeniorsAuthSchoolBrand | null }) {
  if (school) {
    return (
      <div className="relative hidden min-h-full overflow-hidden md:flex md:flex-col">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(140deg, var(--sp-brand) 0%, var(--sp-brand-hover) 60%, color-mix(in srgb, var(--sp-brand) 55%, #000) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 15% 10%, rgba(255,255,255,0.28) 0%, transparent 55%), radial-gradient(ellipse 60% 45% at 90% 90%, rgba(0,0,0,0.25) 0%, transparent 55%)",
          }}
        />
        <div className="relative z-10 flex flex-1 flex-col justify-center px-10 py-10 text-[var(--sp-on-brand)]">
          {school.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={school.logoUrl}
              alt=""
              className="h-16 w-16 rounded-2xl bg-white object-contain p-2 shadow-lg"
            />
          ) : null}
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] opacity-85">
            Welcome to
          </p>
          <h2 className="mt-2 text-[2rem] font-bold leading-[1.1] tracking-tight">{school.name}</h2>
          {school.tagline ? (
            <p className="mt-3 text-sm leading-relaxed opacity-90">{school.tagline}</p>
          ) : null}
          <ul className="mt-8 space-y-3.5">
            {SCHOOL_FEATURES.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm opacity-95">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-xs opacity-75">Powered by Seniors</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative hidden min-h-full overflow-hidden md:flex md:flex-col">
      <div
        className="absolute inset-0"
        style={{ background: SENIORS_AUTH_GRADIENT }}
      />
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 20% 15%, rgba(255,255,255,0.35) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 85% 80%, rgba(87,0,128,0.35) 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col justify-center px-10 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
          School-Specific Personalized Learning
        </p>
        <h2 className="mt-4 text-[2rem] font-bold leading-[1.08] tracking-tight text-white">
          Learn The Way
          <br />
          <span className="font-serif italic font-normal">Your School Teaches</span>
        </h2>
        <ul className="mt-8 space-y-3.5">
          {AUTH_FEATURES.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-white/95">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
                <Check className="h-3 w-3" strokeWidth={2.5} />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-xs leading-relaxed text-white/80">
          Trusted by schools, students, parents, and teachers across India
        </p>
      </div>
    </div>
  );
}

function SchoolMark({ school }: { school: SeniorsAuthSchoolBrand }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {school.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={school.logoUrl}
          alt=""
          className="h-10 w-10 shrink-0 rounded-xl border border-[#E5E7EB] bg-white object-contain p-1"
        />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sp-brand)] text-base font-bold text-[var(--sp-on-brand)]">
          {school.name.trim().charAt(0).toUpperCase() || "S"}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[#111827]">{school.name}</p>
        <p className="text-[11px] font-medium text-[#9CA3AF]">Powered by Seniors</p>
      </div>
    </div>
  );
}

export function SeniorsAuthShell({
  children,
  footer,
  headerAction,
  onClose,
  wide = false,
  variant = "page",
  className,
  school,
}: {
  children: ReactNode;
  footer?: ReactNode;
  headerAction?: ReactNode;
  onClose?: () => void;
  wide?: boolean;
  variant?: "page" | "embedded";
  className?: string;
  school?: SeniorsAuthSchoolBrand | null;
}) {
  const themeStyle = authThemeStyle(school);
  const card = (
      <div
        className={cn(
          "grid w-full overflow-hidden rounded-2xl bg-white md:grid-cols-2",
          school
            ? "shadow-[0_24px_64px_rgba(15,23,42,0.14)]"
            : "shadow-[0_24px_64px_rgba(242,0,109,0.14)]",
          wide ? "max-w-4xl" : "max-w-[920px]",
          variant === "embedded" && "max-h-[min(92vh,720px)]",
        )}
        style={themeStyle}
      >
        <div className="flex min-h-0 flex-col md:min-h-[min(92vh,680px)]">
          <div className="flex items-center justify-between gap-3 px-8 pt-8">
            {school ? <SchoolMark school={school} /> : <SeniorsBrandMark size="sm" />}
            <div className="flex shrink-0 items-center gap-2">
              {headerAction}
              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto px-8 pb-8 pt-6">{children}</div>

          {footer ? (
            <div className="border-t border-[#F3F4F6] px-8 py-4 text-center text-sm text-[#6B7280]">
              {footer}
            </div>
          ) : null}
        </div>

        <AuthDecorPanel school={school} />
      </div>
  );

  if (variant === "embedded") {
    return <div className={cn("relative z-10 w-full", className)}>{card}</div>;
  }

  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center p-4 sm:p-8",
        !school && "bg-[linear-gradient(180deg,#ffffff_0%,#fff9f2_50%,#ffe8f0_100%)]",
        className,
      )}
      style={
        school
          ? {
              ...themeStyle,
              background:
                "linear-gradient(180deg, #ffffff 0%, var(--sp-brand-soft) 55%, var(--sp-brand-soft-2) 100%)",
            }
          : undefined
      }
    >
      {card}
    </div>
  );
}
