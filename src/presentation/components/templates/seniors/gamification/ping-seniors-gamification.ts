import type { GamificationKind, GamificationPingResult } from "@/domain/seniors/gamification-types";

export const SENIORS_GAMIFICATION_EVENT = "seniors:gamification";

export async function pingSeniorsGamification(
  tenant: string,
  kind: GamificationKind = "visit",
  options?: { dispatch?: boolean },
): Promise<GamificationPingResult | null> {
  try {
    const res = await fetch(`/api/tenants/${encodeURIComponent(tenant)}/seniors/gamification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as GamificationPingResult;
    if (options?.dispatch !== false) {
      window.dispatchEvent(new CustomEvent(SENIORS_GAMIFICATION_EVENT, { detail: json }));
    }
    return json;
  } catch {
    return null;
  }
}
