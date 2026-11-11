"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { SeniorsContentSkeleton } from "@/presentation/components/templates/seniors/shared/SeniorsContentSkeleton";

type CacheEntry = { data: unknown; ts: number };

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
const STORAGE_KEY = "seniors-portal-json-v4";
const LEGACY_SESSION_KEYS = ["seniors-portal-json-v3", "seniors-portal-json-v2"];
const MAX_PERSISTED = 40;
/** Serve from memory/disk without network. */
const FRESH_MS = 5 * 60 * 1000;
/** Still usable after tab close; background revalidate. */
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
        for (const key of LEGACY_SESSION_KEYS) {
          const legacy = window.sessionStorage.getItem(key);
          if (legacy) {
            window.sessionStorage.removeItem(key);
            return legacy;
          }
        }
        return null;
      })();
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const [url, value] of Object.entries(parsed)) {
      if (cache.has(url)) continue;
      const entry = normalizeStoredEntry(value);
      if (entry && isUsable(entry)) cache.set(url, entry);
    }
  } catch {
    // ignore corrupt cache
  }
}

function persistToSession() {
  if (typeof window === "undefined") return;
  try {
    const entries = [...cache.entries()]
      .filter(([, entry]) => isUsable(entry))
      .slice(-MAX_PERSISTED);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Object.fromEntries(entries)),
    );
  } catch {
    // quota / private mode
  }
}

function isIncompleteCachedPayload(url: string, data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  if (url.includes("view=announcements")) {
    const payload = data as {
      classes?: unknown;
      students?: unknown;
      teachers?: unknown;
      parents?: unknown;
    };
    return (
      !Array.isArray(payload.classes) ||
      !Array.isArray(payload.students) ||
      !Array.isArray(payload.teachers) ||
      !Array.isArray(payload.parents)
    );
  }
  if (url.includes("view=content")) {
    const payload = data as { classes?: unknown; teachers?: unknown };
    return !Array.isArray(payload.classes) || !Array.isArray(payload.teachers);
  }
  if (url.includes("view=settings")) {
    const payload = data as { settings?: { logoUrl?: unknown } };
    return typeof payload.settings?.logoUrl !== "string";
  }
  if (url.includes("view=school")) {
    const payload = data as { announcements?: unknown };
    if (!Array.isArray(payload.announcements)) return true;
    return payload.announcements.some(
      (row) =>
        !row ||
        typeof row !== "object" ||
        !("source" in row) ||
        ((row as { source?: unknown }).source !== "school" &&
          (row as { source?: unknown }).source !== "teacher"),
    );
  }
  if (url.includes("view=home")) {
    const payload = data as {
      timetable?: { schoolPeriods?: unknown; periods?: unknown };
    };
    if (!payload.timetable) return true;
    return (
      !Array.isArray(payload.timetable.schoolPeriods) &&
      !Array.isArray(payload.timetable.periods)
    );
  }
  if (url.includes("view=timetable") && url.includes("school-admin")) {
    const payload = data as { classes?: { periods?: unknown }[] };
    if (!Array.isArray(payload.classes)) return true;
    return payload.classes.some((c) => !Array.isArray(c?.periods));
  }
  if (url.includes("view=timetable")) {
    const payload = data as {
      schoolPeriods?: unknown;
      personalPeriods?: unknown;
    };
    return (
      !Array.isArray(payload.schoolPeriods) || !Array.isArray(payload.personalPeriods)
    );
  }
  return false;
}

function readCacheEntry(url: string): CacheEntry | undefined {
  hydrateFromSession();
  const entry = cache.get(url);
  if (!entry) return undefined;
  if (isIncompleteCachedPayload(url, entry.data) || !isUsable(entry)) {
    cache.delete(url);
    return undefined;
  }
  return entry;
}

function readCache(url: string): unknown | undefined {
  return readCacheEntry(url)?.data;
}

function writeCache(url: string, data: unknown) {
  cache.set(url, { data, ts: Date.now() });
  persistToSession();
  notifyCacheListeners();
}

function revalidateInBackground(url: string) {
  if (backgroundRefresh.has(url) || inflight.has(url)) return;
  backgroundRefresh.add(url);
  void fetchNetworkJson(url)
    .catch(() => {
      /* keep stale */
    })
    .finally(() => {
      backgroundRefresh.delete(url);
    });
}

async function fetchNetworkJson<T>(url: string): Promise<T> {
  const existing = inflight.get(url);
  if (existing) return existing as Promise<T>;

  const promise = fetch(url, { cache: "no-store" })
    .then(async (res) => {
      const json = (await res.json()) as { ok?: boolean; data?: T; error?: string };
      if (!res.ok || json.data === undefined) {
        throw new Error(json.error ?? "Failed to load");
      }
      writeCache(url, json.data);
      return json.data;
    })
    .finally(() => {
      inflight.delete(url);
    });

  inflight.set(url, promise);
  return promise;
}

async function fetchJson<T>(url: string, fresh = false): Promise<T> {
  hydrateFromSession();
  const entry = readCacheEntry(url);
  if (entry && !fresh) {
    if (isFresh(entry)) return entry.data as T;
    // Stale-while-revalidate: return immediately, refresh quietly.
    revalidateInBackground(url);
    return entry.data as T;
  }

  return fetchNetworkJson<T>(url);
}

export function loadSeniorsCachedJson<T>(url: string, fresh = false) {
  return fetchJson<T>(url, fresh);
}

/** Update portal cache in place without a loading flash. */
export function writeSeniorsCachedJson(url: string, data: unknown) {
  if (!url) return;
  hydrateFromSession();
  writeCache(url, data);
}

export function hasSeniorsCachedJson(url: string): boolean {
  return readCache(url) !== undefined;
}

export function prefetchSeniorsJsonUrl(url: string) {
  if (!url) return;
  hydrateFromSession();
  const entry = readCacheEntry(url);
  if (entry && isFresh(entry)) return;
  if (inflight.has(url)) return;
  void fetchJson(url).catch(() => {
    /* ignore background prefetch errors */
  });
}

export function studentTopicApiUrl(tenant: string, topicSlug: string) {
  return `/api/tenants/${encodeURIComponent(tenant)}/seniors/student/topic/${encodeURIComponent(topicSlug)}`;
}

export function prefetchStudentTopic(tenant: string, topicSlug: string) {
  if (!tenant || !topicSlug) return;
  prefetchSeniorsJsonUrl(studentTopicApiUrl(tenant, topicSlug));
}

/**
 * Warm portal APIs in parallel so sidebar navigation skips the Loading spinner.
 * First URL is highest priority (usually the active page).
 */
export function prefetchSeniorsJson(urls: string[]) {
  const unique = [...new Set(urls.filter(Boolean))];
  if (unique.length === 0) return;

  // Kick the first URL immediately (current page / dashboard).
  prefetchSeniorsJsonUrl(unique[0]);

  const rest = unique.slice(1);
  const concurrency = 3;
  let index = 0;

  void (async () => {
    async function worker() {
      while (index < rest.length) {
        const i = index++;
        const url = rest[i];
        try {
          await fetchJson(url);
        } catch {
          /* ignore background prefetch errors */
        }
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(concurrency, rest.length) }, () => worker()),
    );
  })();
}

export function useSeniorsCachedJson<T>(url: string | null) {
  // Server + hydration always see null; after hydration / client nav, cache hits are instant.
  const cached = useSyncExternalStore(
    subscribeToCache,
    () => {
      if (!url) return null;
      const hit = readCache(url);
      return hit !== undefined ? (hit as T) : null;
    },
    () => null,
  );

  const [fetched, setFetched] = useState<{ url: string; data: T } | null>(null);
  const [error, setError] = useState<{ url: string; message: string } | null>(null);

  const data = cached ?? (fetched?.url === url ? fetched.data : null);
  const activeError =
    error && url && error.url === url ? error.message : null;

  useEffect(() => {
    if (!url) {
      setFetched(null);
      setError(null);
      return;
    }
    let cancelled = false;

    const entry = readCacheEntry(url);
    if (entry) {
      setFetched({ url, data: entry.data as T });
      setError(null);
      if (!isFresh(entry)) revalidateInBackground(url);
      return;
    }

    void fetchJson<T>(url)
      .then((next) => {
        if (!cancelled) {
          setFetched({ url, data: next });
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError({
            url,
            message: e instanceof Error ? e.message : "Failed to load",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return {
    data,
    // Keep loading until we have data or an error (SSR/hydration start with no cache).
    loading: !data && activeError == null,
    error: activeError,
  };
}

export function SeniorsPortalLoadingGate({
  loading,
  hasData,
  error,
  children,
  label,
}: {
  loading: boolean;
  hasData: boolean;
  error: string | null;
  children: React.ReactNode;
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

/** Map sidebar nav id → API url for hover prefetch (all roles). */
export function portalNavPrefetchUrl(
  tenant: string,
  role: "student" | "teacher" | "parent" | "school-admin",
  navId: string,
): string | null {
  if (!tenant) return null;
  const t = encodeURIComponent(tenant);
  if (role === "student") {
    const views: Record<string, string> = {
      home: "home",
      learn: "learn",
      "exam-prep": "exam-prep",
      school: "school",
      progress: "progress",
    };
    const view = views[navId];
    return view
      ? `/api/tenants/${t}/seniors/student/page?view=${view}`
      : null;
  }
  if (role === "teacher") {
    const views = new Set([
      "dashboard",
      "content",
      "assignments",
      "quizzes",
      "classwork",
      "attendance",
      "announcements",
      "students",
    ]);
    return views.has(navId)
      ? `/api/tenants/${t}/seniors/teacher/page?view=${navId}`
      : null;
  }
  if (role === "parent") {
    const views: Record<string, string> = {
      dashboard: "dashboard",
      profile: "profile",
      homework: "homework",
      "test-results": "test-results",
      attendance: "attendance",
      timetable: "timetable",
      calendar: "calendar",
      "lesson-plan": "lesson-plan",
      leave: "leave",
      fees: "fees",
      transport: "transport",
      "hobby-club": "hobby-club",
      books: "books",
      elective: "elective",
      uniform: "uniform",
      children: "children",
      announcements: "announcements",
    };
    const view = views[navId];
    return view
      ? `/api/tenants/${t}/seniors/parent/page?view=${view}`
      : null;
  }
  const views = new Set([
    "dashboard",
    "classes",
    "teachers",
    "students",
    "attendance",
    "parent-services",
    "enquiries",
    "parents",
    "exams",
    "timetable",
    "announcements",
    "content",
  ]);
  return views.has(navId)
    ? `/api/tenants/${t}/seniors/school-admin/page?view=${navId}`
    : null;
}
