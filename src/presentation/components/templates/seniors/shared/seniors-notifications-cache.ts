export type SeniorsNotificationItem = {
  id: string;
  type:
    | "homework"
    | "homework_returned"
    | "announcement"
    | "student_attention"
    | "join_enquiry";
  title: string;
  body: string;
  href: string;
  urgency: string;
};

export type NotificationsPayload = {
  items: SeniorsNotificationItem[];
  unreadCount: number;
};

const cache = new Map<string, NotificationsPayload>();
const inflight = new Map<string, Promise<NotificationsPayload>>();

function cacheKey(tenant: string, role: string) {
  return `${tenant}:${role}`;
}

function urlFor(tenant: string, role: string) {
  return `/api/tenants/${encodeURIComponent(tenant)}/seniors/notifications?role=${encodeURIComponent(role)}`;
}

function dismissedStorageKey(tenant: string, role: string) {
  return `seniors-notif-dismissed:${tenant}:${role}`;
}

export function getDismissedNotificationIds(tenant: string, role: string): Set<string> {
  if (typeof window === "undefined" || !tenant || !role) return new Set();
  try {
    const raw = window.localStorage.getItem(dismissedStorageKey(tenant, role));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { ids?: string[] };
    return new Set(Array.isArray(parsed.ids) ? parsed.ids : []);
  } catch {
    return new Set();
  }
}

function writeDismissedNotificationIds(tenant: string, role: string, ids: Set<string>) {
  if (typeof window === "undefined" || !tenant || !role) return;
  window.localStorage.setItem(
    dismissedStorageKey(tenant, role),
    JSON.stringify({ ids: [...ids] }),
  );
}

export function dismissSeniorsNotification(tenant: string, role: string, id: string) {
  if (!tenant || !role || !id) return;
  const dismissed = getDismissedNotificationIds(tenant, role);
  dismissed.add(id);
  writeDismissedNotificationIds(tenant, role, dismissed);

  const key = cacheKey(tenant, role);
  const cached = cache.get(key);
  if (cached) {
    const items = cached.items.filter((item) => item.id !== id);
    cache.set(key, {
      items,
      unreadCount: Math.max(0, Math.min(cached.unreadCount, items.length)),
    });
  }

  notifySeniorsNotificationsChanged();
}

function withoutDismissed(
  tenant: string,
  role: string,
  payload: NotificationsPayload,
): NotificationsPayload {
  const dismissed = getDismissedNotificationIds(tenant, role);
  if (dismissed.size === 0) return payload;
  const items = payload.items.filter((item) => !dismissed.has(item.id));
  const removed = payload.items.length - items.length;
  return {
    items,
    unreadCount: Math.max(0, payload.unreadCount - removed),
  };
}

export function getCachedNotifications(
  tenant: string,
  role: string,
): NotificationsPayload | null {
  const cached = cache.get(cacheKey(tenant, role));
  if (!cached) return null;
  return withoutDismissed(tenant, role, cached);
}

export async function loadNotifications(
  tenant: string,
  role: string,
  fresh = false,
): Promise<NotificationsPayload> {
  const key = cacheKey(tenant, role);
  if (fresh) cache.delete(key);
  if (cache.has(key)) return withoutDismissed(tenant, role, cache.get(key)!);

  const existing = inflight.get(key);
  if (existing && !fresh) {
    return existing.then((payload) => withoutDismissed(tenant, role, payload));
  }

  const promise = fetch(urlFor(tenant, role), { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) throw new Error("Could not load notifications");
      const json = (await res.json()) as {
        items?: SeniorsNotificationItem[];
        unreadCount?: number;
      };
      const payload: NotificationsPayload = {
        items: json.items ?? [],
        unreadCount: json.unreadCount ?? 0,
      };
      cache.set(key, payload);
      return payload;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise.then((payload) => withoutDismissed(tenant, role, payload));
}

export function prefetchNotifications(tenant: string, role: string) {
  void loadNotifications(tenant, role).catch(() => {
    /* background prefetch */
  });
}

export function invalidateNotifications(tenant: string, role?: string) {
  if (role) {
    cache.delete(cacheKey(tenant, role));
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${tenant}:`)) cache.delete(key);
  }
}

export const SENIORS_NOTIFICATIONS_CHANGED_EVENT = "seniors:notifications-changed";

export function notifySeniorsNotificationsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SENIORS_NOTIFICATIONS_CHANGED_EVENT));
}
