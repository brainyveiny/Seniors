"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCachedNotifications,
  loadNotifications,
  SENIORS_NOTIFICATIONS_CHANGED_EVENT,
} from "@/presentation/components/templates/seniors/shared/seniors-notifications-cache";

export const SENIORS_ENQUIRIES_CHANGED_EVENT = "seniors:enquiries-changed";

export function notifySeniorsEnquiriesChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SENIORS_ENQUIRIES_CHANGED_EVENT));
}

export function useSchoolAdminEnquiryCount(tenant: string, enabled: boolean) {
  const cached = enabled ? getCachedNotifications(tenant, "school-admin") : null;
  const [count, setCount] = useState(cached?.unreadCount ?? 0);

  const refresh = useCallback(async () => {
    if (!enabled || !tenant) return;
    try {
      const data = await loadNotifications(tenant, "school-admin");
      setCount(data.unreadCount);
    } catch {
      // keep last known count
    }
  }, [enabled, tenant]);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    void refresh();
    const id = window.setInterval(() => void refresh(), 20_000);
    const onFocus = () => {
      if (document.visibilityState === "hidden") return;
      void refresh();
    };
    const onChanged = () => void refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener(SENIORS_ENQUIRIES_CHANGED_EVENT, onChanged);
    window.addEventListener(SENIORS_NOTIFICATIONS_CHANGED_EVENT, onChanged);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener(SENIORS_ENQUIRIES_CHANGED_EVENT, onChanged);
      window.removeEventListener(SENIORS_NOTIFICATIONS_CHANGED_EVENT, onChanged);
    };
  }, [enabled, refresh]);

  return count;
}
