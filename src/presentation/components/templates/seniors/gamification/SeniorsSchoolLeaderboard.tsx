"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, Trophy } from "lucide-react";
import type { LeaderboardEntry } from "@/domain/seniors/gamification-types";
import { CoinGlyph } from "@/presentation/components/templates/seniors/gamification/SeniorsCoinBurst";
import {
  getCachedLeaderboard,
  loadLeaderboard,
} from "@/presentation/components/templates/seniors/gamification/seniors-leaderboard-cache";
import { StudentLiftCard } from "@/presentation/components/templates/seniors/student/StudentPageChrome";
import { cn } from "@/shared/lib/utils";

function medal(rank: number) {
  if (rank === 1) return "bg-amber-100 text-amber-800";
  if (rank === 2) return "bg-slate-100 text-slate-700";
  if (rank === 3) return "bg-orange-100 text-orange-800";
  return "bg-[var(--sp-surface-2,#F8FAFC)] text-[color:var(--sp-muted,#64748B)]";
}

export function SeniorsSchoolLeaderboard({
  tenant,
  hideIntro = false,
}: {
  tenant: string;
  hideIntro?: boolean;
}) {
  const cached = getCachedLeaderboard(tenant);
  const [entries, setEntries] = useState<LeaderboardEntry[]>(cached?.entries ?? []);
  const [total, setTotal] = useState(cached?.total ?? 0);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(Boolean(cached));
  const [classFilter, setClassFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await loadLeaderboard(tenant);
        if (cancelled) return;
        setEntries(data.entries);
        setTotal(data.total);
        setError("");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load leaderboard");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tenant]);

  const classes = useMemo(() => {
    const unique = [...new Set(entries.map((row) => row.className).filter(Boolean))];
    unique.sort((a, b) => a.localeCompare(b, "en-IN"));
    return unique;
  }, [entries]);

  const visible = useMemo(
    () => (classFilter === "all" ? entries : entries.filter((row) => row.className === classFilter)),
    [classFilter, entries],
  );

  return (
    <div id="leaderboard">
    <StudentLiftCard className="overflow-hidden p-0" lift={false}>
      <div className="flex items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: "var(--sp-border, #E8EEF5)" }}>
        {hideIntro ? (
          <p className="text-sm font-semibold text-[color:var(--sp-text-strong,#111827)]">
            All students · {total}
          </p>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-600" />
              <h2 className="text-base font-bold text-[color:var(--sp-text-strong,#111827)]">
                School leaderboard
              </h2>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[color:var(--sp-muted,#6B7280)]">
              Every student in the school, ranked by daily streak, then merit coins.
            </p>
          </div>
        )}
      </div>

      {classes.length > 1 ? (
        <div
          className="flex flex-wrap gap-1.5 border-b px-5 py-3"
          style={{ borderColor: "var(--sp-border, #E8EEF5)" }}
        >
          <button
            type="button"
            onClick={() => setClassFilter("all")}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold transition",
              classFilter === "all"
                ? "bg-[var(--sp-accent,#1a4696)] text-[color:var(--sp-on-accent,#ffffff)]"
                : "bg-[var(--sp-surface-2,#F8FAFC)] text-[color:var(--sp-muted,#64748B)] hover:bg-[var(--sp-surface-3,#F1F5F9)]",
            )}
          >
            All classes
          </button>
          {classes.map((klass) => (
            <button
              key={klass}
              type="button"
              onClick={() => setClassFilter(klass)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold transition",
                classFilter === klass
                  ? "bg-[var(--sp-accent,#1a4696)] text-[color:var(--sp-on-accent,#ffffff)]"
                  : "bg-[var(--sp-surface-2,#F8FAFC)] text-[color:var(--sp-muted,#64748B)] hover:bg-[var(--sp-surface-3,#F1F5F9)]",
              )}
            >
              {klass}
            </button>
          ))}
        </div>
      ) : null}

      {error && ready && entries.length === 0 ? (
        <p className="px-5 py-8 text-sm text-[color:var(--sp-danger,#DC2626)]">{error}</p>
      ) : ready && visible.length === 0 ? (
        <p className="px-5 py-8 text-sm text-[color:var(--sp-muted,#6B7280)]">
          No students on the board yet.
        </p>
      ) : (
        <ul className="divide-y" style={{ borderColor: "var(--sp-border, #F1F5F9)" }}>
          {visible.map((entry) => (
            <li
              key={entry.studentId}
              className={cn(
                "flex items-center gap-3 px-5 py-3",
                entry.isYou && "bg-[var(--sp-accent-soft,#EFF6FF)]",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  medal(entry.rank),
                )}
              >
                {entry.rank}
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <p className="truncate text-sm font-semibold text-[color:var(--sp-text-strong,#111827)]">
                  {entry.name}
                  {entry.isYou ? (
                    <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--sp-muted,#64748B)]">
                      You
                    </span>
                  ) : null}
                </p>
                <span className="shrink-0 rounded-full bg-[var(--sp-surface-2,#F8FAFC)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--sp-muted,#6B7280)]">
                  {entry.className}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-orange-500">
                <Flame className={cn("h-3.5 w-3.5", entry.streak > 0 && "fill-orange-500")} />
                {entry.streak}
              </span>
              <span className="inline-flex min-w-[3.25rem] items-center justify-end gap-1 text-sm font-bold text-amber-700">
                <span className="h-4 w-4">
                  <CoinGlyph />
                </span>
                {entry.coins}
              </span>
            </li>
          ))}
        </ul>
      )}
    </StudentLiftCard>
    </div>
  );
}
