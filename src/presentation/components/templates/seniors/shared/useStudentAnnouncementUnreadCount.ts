"use client";

import { useCallback, useEffect, useState } from "react";
import { loadSeniorsCachedJson } from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";

export const SENIORS_ANNOUNCEMENTS_CHANGED_EVENT = "seniors:announcements-changed";

type AnnouncementRow = { id: string };

function storageKey(tenant: string) {
  return `seniors-announcement-seen:${tenant}`;
}

function readSeenIds(tenant: string): Set<string> {
  if (typeof window === "undefined" || !tenant) return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey(tenant));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { ids?: string[] };
    return new Set(Array.isArray(parsed.ids) ? parsed.ids : []);
  } catch {
    return new Set();
  }
}

function writeSeenIds(tenant: string, ids: Iterable<string>) {
  if (typeof window === "undefined" || !tenant) return;
  const unique = [...new Set(ids)];
  window.localStorage.setItem(storageKey(tenant), JSON.stringify({ ids: unique }));
}

export function notifySeniorsAnnouncementsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SENIORS_ANNOUNCEMENTS_CHANGED_EVENT));
}

/** Mark announcement IDs as seen and clear the nav badge. */
export function markStudentAnnouncementsSeen(tenant: string, ids: string[]) {
  if (!tenant || ids.length === 0) {
    notifySeniorsAnnouncementsChanged();
    return;
  }
  const seen = readSeenIds(tenant);
  for (const id of ids) seen.add(id);
  writeSeenIds(tenant, seen);
  notifySeniorsAnnouncementsChanged();
}

export function useStudentAnnouncementUnreadCount(tenant: string, enabled: boolean) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async (force = false) => {
    if (!enabled || !tenant) {
      setCount(0);
      return;
    }
    try {
      const url = `/api/tenants/${encodeURIComponent(tenant)}/seniors/student/page?view=school`;
      const data = await loadSeniorsCachedJson<{ announcements: AnnouncementRow[] }>(
        url,
        force,
      );
      const announcements = Array.isArray(data?.announcements) ? data.announcements : [];
      const seen = readSeenIds(tenant);
      setCount(announcements.filter((row) => row.id && !seen.has(row.id)).length);
    } catch {
      // keep last known count
    }
  }, [enabled, tenant]);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    void refresh(false);
    const id = window.setInterval(() => void refresh(false), 120_000);
    const onFocus = () => {
      if (document.visibilityState === "hidden") return;
      void refresh(true);
    };
    const onChanged = () => void refresh(true);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener(SENIORS_ANNOUNCEMENTS_CHANGED_EVENT, onChanged);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener(SENIORS_ANNOUNCEMENTS_CHANGED_EVENT, onChanged);
    };
  }, [enabled, refresh]);

  return count;
}
