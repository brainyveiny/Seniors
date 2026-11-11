"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { SeniorsContentSkeleton } from "@/presentation/components/templates/seniors/shared/SeniorsContentSkeleton";

type TeacherView =
  | "dashboard"
  | "content"
  | "assignments"
  | "quizzes"
  | "classwork"
  | "attendance"
  | "announcements"
  | "students";

type CacheEntry = { data: unknown; ts: number };

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
const STORAGE_KEY = "seniors-teacher-portal-v2";
const LEGACY_SESSION_KEY = "seniors-teacher-portal-v1";
const FRESH_MS = 5 * 60 * 1000;
const STALE_MS = 24 * 60 * 60 * 1000;
const cacheListeners = new Set<() => void>();
const backgroundRefresh = new Set<string>();
let storageHydrated = false;

function subscribeToCache(onStoreChange: () => void) {
  cacheListeners.add(onStoreChange);
  return () => {
    cacheListeners.delete(onStoreChange);
  };
}

function notifyCacheListeners() {
  for (const listener of cacheListeners) listener();
}

function cacheKey(tenant: string, view: TeacherView) {
  return `${tenant}::teacher::${view}`;
}

function apiUrl(tenant: string, view: TeacherView) {
  return `/api/tenants/${encodeURIComponent(tenant)}/seniors/teacher/page?view=${view}`;
}

function ageMs(entry: CacheEntry) {
  return Date.now() - entry.ts;
}

function isFresh(entry: CacheEntry) {
  return ageMs(entry) <= FRESH_MS;
}

function isUsable(entry: CacheEntry) {
  return ageMs(entry) <= STALE_MS;
}

function normalizeStoredEntry(value: unknown): CacheEntry | null {
  if (value == null) return null;
  if (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    "ts" in value &&
    typeof (value as CacheEntry).ts === "number"
  ) {
    return value as CacheEntry;
  }
  return { data: value, ts: Date.now() };
}

function hydrateFromSession() {
  if (storageHydrated || typeof window === "undefined") return;
  storageHydrated = true;
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      (() => {
        const legacy = window.sessionStorage.getItem(LEGACY_SESSION_KEY);
        if (legacy) window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
        return legacy;
      })();
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const [key, value] of Object.entries(parsed)) {
      if (cache.has(key)) continue;
      const entry = normalizeStoredEntry(value);
      if (entry && isUsable(entry)) cache.set(key, entry);
    }
  } catch {
    // ignore
  }
}

function persistToSession() {
  if (typeof window === "undefined") return;
  try {
    const entries = [...cache.entries()].filter(([, entry]) => isUsable(entry));
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Object.fromEntries(entries)),
    );
  } catch {
    // ignore
  }
}

function writeCache(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
  persistToSession();
  notifyCacheListeners();
}

export function invalidateTeacherPortalCache(tenant?: string) {
  if (!tenant) {
    cache.clear();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
    }
    notifyCacheListeners();
    return;
  }
  for (const key of [...cache.keys()]) {
    if (key.startsWith(`${tenant}::teacher::`)) cache.delete(key);
  }
  persistToSession();
  notifyCacheListeners();
}

async function fetchNetworkTeacherView<T>(tenant: string, view: TeacherView): Promise<T> {
  const key = cacheKey(tenant, view);
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fetch(apiUrl(tenant, view), { cache: "no-store" })
    .then(async (res) => {
      const json = (await res.json()) as { ok?: boolean; data?: T; error?: string };
      if (!res.ok || !json.data) {
        throw new Error(json.error ?? "Failed to load");
      }
      writeCache(key, json.data);
      return json.data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

function revalidateTeacherInBackground(tenant: string, view: TeacherView) {
  const key = cacheKey(tenant, view);
  if (backgroundRefresh.has(key) || inflight.has(key)) return;
  backgroundRefresh.add(key);
  void fetchNetworkTeacherView(tenant, view)
    .catch(() => {
      /* keep stale */
    })
    .finally(() => {
      backgroundRefresh.delete(key);
    });
}

async function fetchTeacherView<T>(tenant: string, view: TeacherView): Promise<T> {
  hydrateFromSession();
  const key = cacheKey(tenant, view);
  const entry = cache.get(key);
  if (entry && isUsable(entry)) {
    if (isFresh(entry)) return entry.data as T;
    revalidateTeacherInBackground(tenant, view);
    return entry.data as T;
  }

  return fetchNetworkTeacherView<T>(tenant, view);
}

/** Warm cache for other tabs in parallel so clicks feel instant. */
export function prefetchTeacherViews(tenant: string, views: TeacherView[]) {
  if (!tenant || views.length === 0) return;
  hydrateFromSession();
  const pending = views.filter((view) => {
    const key = cacheKey(tenant, view);
    const entry = cache.get(key);
    return !(entry && isFresh(entry)) && !inflight.has(key);
  });
  if (pending.length === 0) return;

  const concurrency = 2;
  let index = 0;
  void (async () => {
    async function worker() {
      while (index < pending.length) {
        const i = index++;
        try {
          await fetchTeacherView(tenant, pending[i]);
        } catch {
          /* ignore */
        }
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(concurrency, pending.length) }, () => worker()),
    );
  })();
}

export function useTeacherPortalData<T>(tenant: string, view: TeacherView) {
  const key = cacheKey(tenant, view);
  const cached = useSyncExternalStore(
    subscribeToCache,
    () => {
      hydrateFromSession();
      const entry = cache.get(key);
      if (!entry || !isUsable(entry)) return null;
      return entry.data as T;
    },
    () => null,
  );

  const [fetched, setFetched] = useState<{ key: string; data: T } | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);

  const data = cached ?? (fetched?.key === key ? fetched.data : null);
  const activeError = error?.key === key ? error.message : null;

  const reload = useCallback(async () => {
    const k = cacheKey(tenant, view);
    cache.delete(k);
    notifyCacheListeners();
    setError(null);
    setFetched(null);
    try {
      const next = await fetchNetworkTeacherView<T>(tenant, view);
      setFetched({ key: k, data: next });
    } catch (e) {
      setError({
        key: k,
        message: e instanceof Error ? e.message : "Failed to load",
      });
    }
  }, [tenant, view]);

  useEffect(() => {
    let cancelled = false;
    hydrateFromSession();
    const k = cacheKey(tenant, view);
    const entry = cache.get(k);
    if (entry && isUsable(entry)) {
      setFetched({ key: k, data: entry.data as T });
      setError(null);
      if (!isFresh(entry)) revalidateTeacherInBackground(tenant, view);
      return;
    }

    void fetchTeacherView<T>(tenant, view)
      .then((next) => {
        if (!cancelled) {
          setFetched({ key: k, data: next });
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError({
            key: k,
            message: e instanceof Error ? e.message : "Failed to load",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tenant, view]);

  return {
    data,
    loading: !data && activeError == null,
    error: activeError,
    reload,
  };
}

export function TeacherPortalLoadingGate({
  loading,
  hasData,
  error,
  children,
  label,
}: {
  loading: boolean;
  hasData: boolean;
  error: string | null;
  children?: React.ReactNode;
  label?: string;
}) {
  if (error && !hasData) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
        {error}
      </div>
    );
  }
  if (loading && !hasData) {
    return <SeniorsContentSkeleton label={label} />;
  }
  return <>{children}</>;
}
