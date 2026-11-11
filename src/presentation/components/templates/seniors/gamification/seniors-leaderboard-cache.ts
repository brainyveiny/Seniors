import type { LeaderboardEntry } from "@/domain/seniors/gamification-types";

export type LeaderboardPayload = {
  entries: LeaderboardEntry[];
  total: number;
};

const cache = new Map<string, LeaderboardPayload>();
const inflight = new Map<string, Promise<LeaderboardPayload>>();

function urlFor(tenant: string) {
  return `/api/tenants/${encodeURIComponent(tenant)}/seniors/gamification?view=leaderboard`;
}

export function getCachedLeaderboard(tenant: string): LeaderboardPayload | null {
  return cache.get(urlFor(tenant)) ?? null;
}

export async function loadLeaderboard(
  tenant: string,
  fresh = false,
): Promise<LeaderboardPayload> {
  const url = urlFor(tenant);
  if (fresh) cache.delete(url);
  if (cache.has(url)) return cache.get(url)!;

  const existing = inflight.get(url);
  if (existing && !fresh) return existing;

  const promise = fetch(url, { cache: "no-store" })
    .then(async (res) => {
      const json = (await res.json()) as {
        entries?: LeaderboardEntry[];
        total?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Could not load leaderboard");
      const payload: LeaderboardPayload = {
        entries: json.entries ?? [],
        total: json.total ?? 0,
      };
      cache.set(url, payload);
      return payload;
    })
    .finally(() => {
      inflight.delete(url);
    });

  inflight.set(url, promise);
  return promise;
}

export function prefetchLeaderboard(tenant: string) {
  void loadLeaderboard(tenant).catch(() => {
    /* background prefetch */
  });
}

export function invalidateLeaderboard(tenant: string) {
  cache.delete(urlFor(tenant));
}
