"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Moon, Sun, User, X } from "lucide-react";
import type { SiteContext } from "@/application/hooks/use-site-context";
import type { SeniorsRole } from "@/infrastructure/auth/auth-constants";
import {
  getCachedProfile,
  loadProfile,
} from "@/presentation/components/templates/seniors/shared/seniors-profile-cache";
import { SeniorsProfileDrawer } from "@/presentation/components/templates/seniors/shared/SeniorsProfileDrawer";
import {
  dismissSeniorsNotification,
  getCachedNotifications,
  loadNotifications,
  SENIORS_NOTIFICATIONS_CHANGED_EVENT,
  type SeniorsNotificationItem,
} from "@/presentation/components/templates/seniors/shared/seniors-notifications-cache";
import { useSeniorsTheme } from "@/presentation/components/templates/seniors/shared/SeniorsTheme";
import { SENIORS_ENQUIRIES_CHANGED_EVENT } from "@/presentation/components/templates/seniors/shared/useSchoolAdminEnquiryCount";
import { SeniorsStreakHud } from "@/presentation/components/templates/seniors/gamification/SeniorsStreakHud";
import { cn } from "@/shared/lib/utils";

function notifRole(role: SeniorsRole) {
  return role === "student" || role === "teacher" || role === "school-admin" ? role : null;
}

export function SeniorsHeaderActions({
  ctx,
  role,
  displayName,
  subtitle,
  variant = "default",
}: {
  ctx: SiteContext;
  role: SeniorsRole;
  displayName?: string;
  subtitle?: string;
  variant?: "default" | "chip";
}) {
  const apiRole = notifRole(role);
  const cached = apiRole ? getCachedNotifications(ctx.tenant, apiRole) : null;
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [items, setItems] = useState<SeniorsNotificationItem[]>(cached?.items ?? []);
  const [unreadCount, setUnreadCount] = useState(cached?.unreadCount ?? 0);
  const cachedProfile = getCachedProfile(ctx.tenant, role);
  const [resolvedDisplayName, setResolvedDisplayName] = useState(
    displayName?.trim() || cachedProfile?.fullName?.trim() || "",
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const { isDark, toggleTheme, theme } = useSeniorsTheme();

  const initial = resolvedDisplayName
    ? resolvedDisplayName[0].toUpperCase()
    : null;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function refreshNotifications(fresh = false) {
    if (!apiRole) return;
    try {
      const data = await loadNotifications(ctx.tenant, apiRole, fresh);
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      // keep last known items
    }
  }

  useEffect(() => {
    if (!apiRole) return;
    void refreshNotifications();
    const onChanged = () => void refreshNotifications(true);
    window.addEventListener(SENIORS_NOTIFICATIONS_CHANGED_EVENT, onChanged);
    if (apiRole === "school-admin") {
      window.addEventListener(SENIORS_ENQUIRIES_CHANGED_EVENT, onChanged);
    }
    return () => {
      window.removeEventListener(SENIORS_NOTIFICATIONS_CHANGED_EVENT, onChanged);
      if (apiRole === "school-admin") {
        window.removeEventListener(SENIORS_ENQUIRIES_CHANGED_EVENT, onChanged);
      }
    };
  }, [ctx.tenant, apiRole]);

  useEffect(() => {
    if (displayName?.trim()) {
      setResolvedDisplayName(displayName.trim());
      return;
    }
    const warm = getCachedProfile(ctx.tenant, role);
    if (warm?.fullName?.trim()) {
      setResolvedDisplayName(warm.fullName.trim());
    }
    let cancelled = false;
    void loadProfile(ctx.tenant, role)
      .then((profile) => {
        const name = profile.fullName?.trim();
        if (!cancelled && name) setResolvedDisplayName(name);
      })
      .catch(() => {
        // Keep the neutral user icon if profile lookup fails.
      });
    return () => {
      cancelled = true;
    };
  }, [ctx.tenant, displayName, role]);

  return (
    <>
      <div ref={rootRef} className="relative z-40 flex shrink-0 items-center gap-1.5 sm:gap-2">
        {role === "student" ? <SeniorsStreakHud /> : null}
        <button
          type="button"
          className="rounded-full p-2 text-[var(--sp-muted,#71717A)] transition hover:bg-[var(--sp-surface-3,#f4f4f5)] hover:text-[var(--sp-text-strong,#18181B)]"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Light mode" : "Dark mode"}
          onClick={toggleTheme}
        >
          {isDark ? <Sun className="h-5 w-5 text-[#FBBF24]" /> : <Moon className="h-5 w-5" />}
        </button>

        {apiRole ? (
          <div className="relative">
            <button
              type="button"
              className="relative rounded-full p-2 text-[var(--sp-muted,#71717A)] transition hover:bg-[var(--sp-surface-3,#f4f4f5)] hover:text-[var(--sp-text-strong,#18181B)]"
              aria-label="Notifications"
              aria-expanded={notifOpen}
              onClick={() => {
                setNotifOpen((v) => !v);
                if (!notifOpen) void refreshNotifications();
              }}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 ? (
                <span className="absolute right-1 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--sp-accent,#18181B)] px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </button>
            {notifOpen ? (
              <div
                className={cn(
                  "seniors-theme-layer absolute right-0 z-[80] mt-2 w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-[#E5EEF5] bg-white shadow-xl",
                  isDark && "seniors-dark",
                )}
                data-theme={theme}
                style={{
                  backgroundColor: "var(--sp-surface, #ffffff)",
                  borderColor: "var(--sp-border, #E5E7EB)",
                }}
              >
                <div
                  className="flex items-center justify-between border-b px-4 py-3"
                  style={{ borderColor: "var(--sp-border, #F3F4F6)" }}
                >
                  <p
                    className="text-sm font-bold"
                    style={{ color: "var(--sp-text-strong, #111827)" }}
                  >
                    Notifications
                  </p>
                  <Link
                    href={ctx.sitePath(
                      apiRole === "teacher"
                        ? "teacher/students"
                        : apiRole === "school-admin"
                          ? "school-admin/enquiries"
                          : "student/homework",
                    )}
                    className="text-xs font-semibold text-[var(--sp-brand-text)]"
                    onClick={() => setNotifOpen(false)}
                  >
                    {apiRole === "teacher"
                      ? "Student records"
                      : apiRole === "school-admin"
                        ? "Enquiries"
                        : "Homework"}
                  </Link>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {items.length === 0 ? (
                    <p
                      className="px-4 py-6 text-sm"
                      style={{ color: "var(--sp-muted, #6B7280)" }}
                    >
                      You&apos;re all caught up.
                    </p>
                  ) : (
                    items.map((item) => (
                      <div
                        key={item.id}
                        className="group relative border-b last:border-0"
                        style={{ borderColor: "var(--sp-border, #F8FAFC)" }}
                      >
                        <Link
                          href={ctx.sitePath(item.href)}
                          className="block px-4 py-3 pr-10 transition hover:bg-[var(--sp-surface-2,#F8FAFC)]"
                          onClick={() => setNotifOpen(false)}
                        >
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "var(--sp-text-strong, #111827)" }}
                          >
                            {item.title}
                          </p>
                          <p
                            className="mt-0.5 line-clamp-2 text-xs"
                            style={{ color: "var(--sp-muted, #6B7280)" }}
                          >
                            {item.body}
                          </p>
                          <p
                            className={cn(
                              "mt-1 text-[10px] font-semibold uppercase tracking-wide",
                              item.type === "student_attention" ||
                                item.type === "join_enquiry"
                                ? "text-[#DC2626]"
                                : item.type === "homework_returned"
                                  ? "text-[#16A34A]"
                                  : "text-[#9CA3AF]",
                            )}
                          >
                            {item.type === "join_enquiry"
                              ? "Action required"
                              : item.type === "student_attention"
                                ? "Needs attention"
                                : item.type === "homework_returned"
                                  ? "Returned"
                                  : item.type === "homework"
                                    ? "Homework"
                                    : "Announcement"}
                          </p>
                        </Link>
                        <button
                          type="button"
                          className="absolute right-2 top-2 rounded-full p-1.5 text-[#9CA3AF] opacity-80 transition hover:bg-[var(--sp-surface-3,#F3F4F6)] hover:text-[#374151] group-hover:opacity-100"
                          aria-label="Dismiss notification"
                          title="Dismiss"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!apiRole) return;
                            dismissSeniorsNotification(ctx.tenant, apiRole, item.id);
                            setItems((prev) => prev.filter((row) => row.id !== item.id));
                            setUnreadCount((prev) => Math.max(0, prev - 1));
                          }}
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            className="relative rounded-xl p-2 transition hover:bg-[#F3F6FB]"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-[#6B7280]" />
          </button>
        )}

        {variant === "chip" ? (
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition hover:bg-[var(--sp-surface-3,#f4f4f5)]"
            aria-expanded={profileOpen}
            aria-label="Open profile"
            onClick={() => {
              setNotifOpen(false);
              setProfileOpen(true);
            }}
          >
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--sp-surface-3,#f4f4f5)] text-sm font-bold text-[var(--sp-text-strong,#18181B)]">
              {initial ?? <User className="h-4 w-4" />}
              <span
                className="absolute bottom-0 right-0 z-10 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#22C55E]"
                aria-hidden
              />
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold text-[var(--sp-text-strong,#18181B)]">
                {resolvedDisplayName || "Account"}
              </span>
              {subtitle ? (
                <span className="block text-xs text-[var(--sp-muted,#71717A)]">{subtitle}</span>
              ) : null}
            </span>
          </button>
        ) : (
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--sp-surface-3,#f4f4f5)] text-sm font-semibold text-[var(--sp-text-strong,#18181B)] transition hover:bg-[var(--sp-surface-4,#ebebed)]"
            aria-label="Open profile"
            aria-expanded={profileOpen}
            onClick={() => {
              setNotifOpen(false);
              setProfileOpen(true);
            }}
          >
            {initial ?? <User className="h-4 w-4" />}
            <span
              className="absolute bottom-0 right-0 z-10 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#22C55E]"
              aria-hidden
            />
          </button>
        )}
      </div>

      <SeniorsProfileDrawer
        ctx={ctx}
        role={role}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        fallbackName={resolvedDisplayName || displayName}
        fallbackSubtitle={subtitle}
      />
    </>
  );
}

/** @deprecated Prefer SeniorsHeaderActions -kept for student page imports. */
export function StudentHeaderActions({
  ctx,
  displayName,
  subtitle,
  variant = "default",
}: {
  ctx: SiteContext;
  displayName?: string;
  subtitle?: string;
  variant?: "default" | "chip";
}) {
  return (
    <SeniorsHeaderActions
      ctx={ctx}
      role="student"
      displayName={displayName}
      subtitle={subtitle}
      variant={variant}
    />
  );
}
