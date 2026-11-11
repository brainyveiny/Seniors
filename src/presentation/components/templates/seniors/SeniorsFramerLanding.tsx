"use client";

const LOADING_BG =
  "linear-gradient(180deg, #ffffff 0%, #fff9f2 50%, #ffe8f0 100%)";

/**
 * Full-viewport Framer design for /seniors.
 * Loading mask lives inside framer-landing.html only (no parent opacity gate).
 */
export function SeniorsFramerLanding() {
  return (
    <div
      className="m-0 block min-h-[100dvh] w-full overflow-hidden p-0"
      style={{ background: LOADING_BG }}
    >
      <iframe
        src="/seniors/framer-landing.html"
        title="Seniors - School-Specific Personalized Learning"
        className="block min-h-[100dvh] w-full border-0 bg-transparent"
        style={{ height: "100dvh", width: "100%" }}
      />
    </div>
  );
}
