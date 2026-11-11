import type { SeniorsRole } from "@/infrastructure/auth/auth-constants";

export type SeniorsProfilePayload = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  roleLabel: string;
  schoolName: string;
  schoolLogoUrl?: string;
  details: { label: string; value: string }[];
};

const cache = new Map<string, SeniorsProfilePayload>();
const inflight = new Map<string, Promise<SeniorsProfilePayload>>();

function cacheKey(tenant: string, role: string) {
  return `${tenant}:${role}`;
}

function urlFor(tenant: string, role: string) {
  return `/api/tenants/${encodeURIComponent(tenant)}/seniors/me?role=${encodeURIComponent(role)}`;
}

export function getCachedProfile(
  tenant: string,
  role: SeniorsRole | string,
): SeniorsProfilePayload | null {
  return cache.get(cacheKey(tenant, role)) ?? null;
}

export async function loadProfile(
  tenant: string,
  role: SeniorsRole | string,
  fresh = false,
): Promise<SeniorsProfilePayload> {
  const key = cacheKey(tenant, role);
  if (fresh) cache.delete(key);
  if (cache.has(key)) return cache.get(key)!;

  const existing = inflight.get(key);
  if (existing && !fresh) return existing;

  const promise = fetch(urlFor(tenant, role), { cache: "no-store" })
    .then(async (res) => {
      const json = (await res.json()) as {
        profile?: SeniorsProfilePayload;
        error?: string;
      };
      if (!res.ok || !json.profile) {
        throw new Error(json.error || "Could not load profile");
      }
      cache.set(key, json.profile);
      return json.profile;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function prefetchProfile(tenant: string, role: SeniorsRole | string) {
  void loadProfile(tenant, role).catch(() => {
    /* background prefetch */
  });
}

export function invalidateProfile(tenant: string, role?: string) {
  if (role) {
    cache.delete(cacheKey(tenant, role));
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${tenant}:`)) cache.delete(key);
  }
}
