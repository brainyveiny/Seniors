"use client";

import Link from "next/link";
import { useState } from "react";
import { Flame } from "lucide-react";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import { CoinGlyph } from "@/presentation/components/templates/seniors/gamification/SeniorsCoinBurst";
import { useSeniorsGamification } from "@/presentation/components/templates/seniors/gamification/SeniorsGamificationProvider";
import { cn } from "@/shared/lib/utils";

export function SeniorsStreakHud() {
  const ctx = useSeniorsSite();
  const { snapshot } = useSeniorsGamification();
  const [open, setOpen] = useState(false);
  const streak = snapshot?.streak ?? 0;
  const coins = snapshot?.coins ?? 0;
  const atRisk = snapshot?.atRisk ?? false;
  const live = streak > 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 shadow-sm transition hover:opacity-90 sm:gap-2 sm:px-2.5"
        style={{
          borderColor: "var(--sp-border, #E5E7EB)",
          backgroundColor: "var(--sp-surface, #ffffff)",
        }}
        aria-label="Study streak and coins"
      >
        <span
          className={cn(
            "inline-flex items-center gap-1 text-sm font-bold",
            live ? "text-orange-500" : "text-[color:var(--sp-muted,#9CA3AF)]",
            atRisk && "seniors-streak-pulse",
          )}
        >
          <Flame className={cn("h-4 w-4", live && "fill-orange-500")} />
          {streak}
        </span>
        <span className="h-4 w-px bg-[color:var(--sp-border,#E5E7EB)]" />
        <span
          id="seniors-coin-hud"
          className="inline-flex items-center gap-1 text-sm font-bold text-amber-700 dark:text-amber-300"
        >
          <span className="h-4 w-4">
            <CoinGlyph />
          </span>
          {coins}
        </span>
      </button>

      {open ? (
        <div
          className="absolute right-0 z-[80] mt-2 w-64 overflow-hidden rounded-2xl border shadow-xl"
          style={{
            borderColor: "var(--sp-border, #E5E7EB)",
            backgroundColor: "var(--sp-surface, #ffffff)",
          }}
        >
          <div className="px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--sp-muted,#6B7280)]">
              Daily streak
            </p>
            <p className="mt-1 text-2xl font-bold text-[color:var(--sp-text-strong,#111827)]">
              {streak} day{streak === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[color:var(--sp-muted,#6B7280)]">
              {atRisk
                ? "Your streak is at risk. Open Learn or Ask a Doubt today to keep it."
                : live
                  ? `Best streak: ${snapshot?.longestStreak ?? streak} days. Come back tomorrow to continue.`
                  : "Visit the panel or study today to start a streak. Miss a day and it resets to 0."}
            </p>
          </div>
          <div
            className="flex items-center justify-between border-t px-4 py-2.5"
            style={{ borderColor: "var(--sp-border, #F3F4F6)" }}
          >
            <span className="text-xs font-semibold text-[color:var(--sp-muted,#6B7280)]">
              Merit coins · {coins}
            </span>
            <Link
              href={ctx.sitePath("student/leaderboard")}
              className="text-xs font-bold text-[color:var(--sp-accent,#2563EB)]"
              onClick={() => setOpen(false)}
            >
              Leaderboard
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
