"use client";

import {
  DraftingCompass,
  GraduationCap,
  PencilRuler,
  Ruler,
  Triangle,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { SeniorsMediaImage } from "@/presentation/components/templates/seniors/shared/SeniorsMediaImage";

/** Simple protractor mark -geometry-box style */
function ProtractorIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M2 18h20" />
      <path d="M4 18a8 8 0 0 1 16 0" />
      <path d="M12 10v8" />
      <path d="M7.5 12.5 12 18" />
      <path d="M16.5 12.5 12 18" />
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FloatIcon({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute z-20 flex items-center justify-center rounded-2xl shadow-[0_12px_30px_rgba(15,23,42,0.12)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SeniorsProductGlimpse({ onCta }: { onCta?: () => void }) {
  return (
    <section
      id="product-glimpse"
      className="relative overflow-x-clip bg-gradient-to-b from-white via-[#F8FBFF] to-white py-12 sm:py-16"
    >
      <div className="relative mx-auto w-full max-w-[1240px] px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)] lg:gap-4 xl:gap-8">
          {/* Left copy */}
          <div className="relative z-10 max-w-lg">
            <h2 className="text-2xl font-bold leading-tight text-[#0F172A] sm:text-3xl lg:text-[2.15rem]">
              Learn from{" "}
              <span className="text-[#38BDF8]">your school</span>
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[#64748B] sm:text-base">
              Seniors brings your school&apos;s notes, doubts, classwork, and timetable
              into one digital campus -so students study the way their school teaches.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {["School notes", "AI doubts", "Timetable", "Parents"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#2563EB] shadow-sm"
                >
                  {tag}
                </span>
              ))}
            </div>

            {onCta ? (
              <button
                type="button"
                onClick={onCta}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_25px_rgba(37,99,235,0.35)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8]"
              >
                Book a school demo
                <GraduationCap className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {/* Right -larger mockup with uneven oval peeking both sides */}
          <div className="relative mx-auto w-full max-w-2xl overflow-visible py-6 sm:py-8 lg:max-w-none lg:translate-y-2 lg:py-4">
            {/* Uneven oval -wider than mockup, asymmetric left/right */}
            <div
              className="absolute left-1/2 top-[52%] h-[78%] w-[118%] -translate-x-[48%] -translate-y-1/2 rounded-[42%_58%_48%_52%] bg-gradient-to-br from-[#C7DBFF] via-[#DCE8FF] to-[#A8C8F8] opacity-95 sm:w-[112%] lg:w-[108%]"
              aria-hidden
            />
            <div
              className="absolute -left-[4%] top-[28%] h-32 w-32 rounded-full bg-[#93C5FD]/35 blur-3xl"
              aria-hidden
            />
            <div
              className="absolute -right-[2%] bottom-[18%] h-28 w-28 rounded-full bg-[#60A5FA]/25 blur-3xl"
              aria-hidden
            />

            {/* Geometry icons -static, near laptop */}
            <FloatIcon className="right-[4%] top-[10%] h-12 w-12 bg-gradient-to-br from-[#60A5FA] to-[#2563EB] text-white sm:right-[2%] sm:h-14 sm:w-14">
              <DraftingCompass className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} />
            </FloatIcon>
            <FloatIcon className="right-[6%] top-[46%] h-11 w-11 bg-gradient-to-br from-[#38BDF8] to-[#0284C7] text-white sm:right-[4%] sm:h-12 sm:w-12">
              <Ruler className="h-5 w-5 rotate-45 sm:h-6 sm:w-6" strokeWidth={2} />
            </FloatIcon>
            <FloatIcon className="left-[8%] top-[38%] h-10 w-10 rotate-[-12deg] bg-gradient-to-br from-[#FB7185] to-[#F43F5E] text-white sm:left-[6%] sm:h-11 sm:w-11">
              <Triangle className="h-5 w-5" fill="currentColor" strokeWidth={0} />
            </FloatIcon>
            <FloatIcon className="bottom-[18%] left-[10%] h-9 w-9 bg-gradient-to-br from-[#34D399] to-[#059669] text-white sm:left-[8%]">
              <ProtractorIcon className="h-4 w-4" />
            </FloatIcon>
            <FloatIcon className="bottom-[14%] right-[10%] h-10 w-10 rotate-[8deg] bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white sm:right-[8%] sm:h-11 sm:w-11">
              <PencilRuler className="h-5 w-5" strokeWidth={2} />
            </FloatIcon>

            {/* Larger mockup -leaves room for oval on both sides */}
            <div className="relative z-10 mx-auto w-[88%] max-w-none scale-105 sm:w-[84%] sm:scale-110 lg:w-[82%] lg:scale-[1.12]">
              <SeniorsMediaImage
                src="/seniors/images/hero-laptop.png"
                alt="Digital school learning on laptop -Seniors personalized academic platform"
                width={1200}
                height={750}
                sizes="(max-width: 1024px) 88vw, 640px"
                className="relative z-0 block h-auto w-full select-none drop-shadow-[0_32px_64px_rgba(0,0,0,0.28)]"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
