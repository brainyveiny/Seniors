"use client";

import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import { SeniorsBrandMark } from "@/presentation/components/templates/seniors/SeniorsBrandMark";
import { cn } from "@/shared/lib/utils";

export const SENIORS_AUTH_PRIMARY = "#570080";

export const SENIORS_AUTH_GRADIENT =
  "linear-gradient(105deg, #ffc94d 0%, #f2006d 48%, #570080 100%)";

export const SENIORS_AUTH_INPUT =
  "w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] transition focus:border-[#f2006d] focus:outline-none focus:ring-2 focus:ring-[#f2006d]/15";

const AUTH_FEATURES = [
  "School-aligned learning paths",
  "Assessments that match your exams",
  "Students, teachers & parents connected",
];

function AuthDecorPanel() {
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

export function SeniorsAuthShell({
  children,
  footer,
  headerAction,
  onClose,
  wide = false,
  variant = "page",
  className,
}: {
  children: ReactNode;
  footer?: ReactNode;
  headerAction?: ReactNode;
  onClose?: () => void;
  wide?: boolean;
  variant?: "page" | "embedded";
  className?: string;
}) {
  const card = (
      <div
        className={cn(
          "grid w-full overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_rgba(242,0,109,0.14)] md:grid-cols-2",
          wide ? "max-w-4xl" : "max-w-[920px]",
          variant === "embedded" && "max-h-[min(92vh,720px)]",
        )}
      >
        <div className="flex min-h-0 flex-col md:min-h-[min(92vh,680px)]">
          <div className="flex items-center justify-between px-8 pt-8">
            <SeniorsBrandMark size="sm" />
            <div className="flex items-center gap-2">
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

        <AuthDecorPanel />
      </div>
  );

  if (variant === "embedded") {
    return <div className={cn("relative z-10 w-full", className)}>{card}</div>;
  }

  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#fff9f2_50%,#ffe8f0_100%)] p-4 sm:p-8",
        className,
      )}
    >
      {card}
    </div>
  );
}
