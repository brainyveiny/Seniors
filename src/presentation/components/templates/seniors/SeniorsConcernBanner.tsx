"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { SeniorsMediaImage } from "@/presentation/components/templates/seniors/shared/SeniorsMediaImage";

/** Reference speech-bubble fill (slate-blue from design). */
const BUBBLE = "#5B6D8A";

const CONCERNS = [
  {
    id: "c1",
    lines: [
      "The exam paper is set",
      "from our school notes…",
      "exactly what teachers",
      "taught in class.",
    ],
    delayMs: 350,
    className: "top-[8%] left-[44%] w-max sm:left-[48%] lg:left-[52%]",
  },
  {
    id: "c2",
    lines: [
      "…but when the paper",
      "comes, I still freeze",
      "and can't solve it",
      "properly!",
    ],
    delayMs: 1500,
    className: "top-[46%] left-[48%] w-max sm:left-[52%] lg:left-[56%]",
  },
] as const;

/**
 * Exact-style cloud box: rounded slate body + curved swoop tail (SVG),
 * white monospace copy -matches the reference bubble.
 */
function SpeechCloud({
  lines,
  visible,
  className,
}: {
  lines: readonly string[];
  visible: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 transition-all duration-500 ease-out",
        visible
          ? "translate-y-0 scale-100 opacity-100"
          : "translate-y-4 scale-90 opacity-0",
        className,
      )}
      role="status"
      aria-hidden={!visible}
    >
      <div className="relative">
        <div
          className="w-max max-w-[min(90vw,320px)] rounded-[14px] px-5 py-4 sm:px-6 sm:py-5"
          style={{ backgroundColor: BUBBLE }}
        >
          <p className="font-mono text-[12px] leading-[1.45] text-white sm:text-[13px]">
            {lines.map((line) => (
              <span key={line} className="block whitespace-nowrap">
                {line}
              </span>
            ))}
          </p>
        </div>

        <svg
          className="absolute -bottom-[20px] left-3 h-[28px] w-[48px] sm:left-4"
          viewBox="0 0 48 28"
          fill="none"
          aria-hidden
        >
          <path
            d="M8 1
               C14 1 18 4 20 9
               C22 14 18 19 12 26
               C20 22 32 14 44 9
               C34 7 20 4 8 1Z"
            fill={BUBBLE}
          />
        </svg>
      </div>
    </div>
  );
}

/** Full-bleed banner: student image + concern clouds on scroll-into-view. */
export function SeniorsConcernBanner() {
  const rootRef = useRef<HTMLElement>(null);
  const [show, setShow] = useState<Record<string, boolean>>({});
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const clearTimers = () => {
      for (const t of timersRef.current) window.clearTimeout(t);
      timersRef.current = [];
    };

    const play = () => {
      clearTimers();
      setShow({});
      for (const c of CONCERNS) {
        timersRef.current.push(
          window.setTimeout(() => {
            setShow((prev) => ({ ...prev, [c.id]: true }));
          }, c.delayMs),
        );
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          play();
        } else {
          clearTimers();
          setShow({});
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );

    io.observe(el);
    return () => {
      clearTimers();
      io.disconnect();
    };
  }, []);

  return (
    <section
      ref={rootRef}
      id="features-banner"
      className="relative left-1/2 right-auto w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden"
    >
      <SeniorsMediaImage
        src="/assets/seniors/image.png"
        alt="Student preparing for exams"
        width={1920}
        height={780}
        sizes="100vw"
        className="block h-[350px] w-full max-w-none object-cover object-center sm:h-[370px] lg:h-[390px]"
      />

      {CONCERNS.map((c) => (
        <SpeechCloud
          key={c.id}
          lines={c.lines}
          visible={Boolean(show[c.id])}
          className={c.className}
        />
      ))}
    </section>
  );
}
