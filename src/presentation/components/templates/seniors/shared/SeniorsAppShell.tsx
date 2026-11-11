"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  GraduationCap,
  Home,
  Inbox,
  LogOut,
  Menu,
  Megaphone,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  Sun,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { SiteContext } from "@/application/hooks/use-site-context";
import { TenantSiteLogo } from "@/presentation/components/website/shared/TenantSiteLogo";
import { cn } from "@/shared/lib/utils";
import {
  SENIORS_BLUE,
  SENIORS_PARENT_NAV,
  SENIORS_SCHOOL_ADMIN_NAV,
  SENIORS_STUDENT_NAV,
  SENIORS_TEACHER_NAV,
  groupNavBySection,
  type SeniorsParentNavId,
  type SeniorsSchoolAdminNavId,
  type SeniorsStudentNavId,
  type SeniorsTeacherNavId,
} from "./seniors-nav";
import {
  logoutSeniorsRoleAndGoHome,
} from "@/application/services/seniors-session";
import type { SeniorsRole } from "@/infrastructure/auth/auth-constants";
import {
  SeniorsConfirmProvider,
  useSeniorsConfirm,
} from "@/presentation/components/templates/seniors/shared/SeniorsConfirmProvider";
import { SeniorsHeaderActions } from "@/presentation/components/templates/seniors/shared/SeniorsHeaderActions";
import { useSchoolAdminEnquiryCount } from "@/presentation/components/templates/seniors/shared/useSchoolAdminEnquiryCount";
import { useStudentAnnouncementUnreadCount } from "@/presentation/components/templates/seniors/shared/useStudentAnnouncementUnreadCount";
import {
  portalNavPrefetchUrl,
  prefetchSeniorsJsonUrl,
} from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";
import { prefetchTeacherViews } from "@/presentation/components/templates/seniors/shared/useTeacherPortalData";
import {
  SeniorsThemeProvider,
  useSeniorsTheme,
} from "@/presentation/components/templates/seniors/shared/SeniorsTheme";
import {
  getCachedProfile,
  loadProfile,
} from "@/presentation/components/templates/seniors/shared/seniors-profile-cache";

type PortalRole = "student" | "teacher" | "parent" | "school-admin";

const SIDEBAR_COLLAPSED_KEY = "seniors-sidebar-collapsed";

const ICONS = {
  home: Home,
  book: BookOpen,
  calendar: Calendar,
  building: Building2,
  chart: BarChart3,
  file: FileText,
  clipboard: ClipboardList,
  quiz: ClipboardList,
  megaphone: Megaphone,
  inbox: Inbox,
  users: Users,
  user: User,
  graduation: GraduationCap,
  settings: Settings,
  sparkles: Sparkles,
  trophy: Trophy,
} as const;

const ROLE_LABELS: Record<PortalRole, string> = {
  student: "Student",
  teacher: "Teacher",
  parent: "Parent",
  "school-admin": "School Admin",
};

function getNav(role: PortalRole) {
  switch (role) {
    case "student":
      return SENIORS_STUDENT_NAV;
    case "teacher":
      return SENIORS_TEACHER_NAV;
    case "parent":
      return SENIORS_PARENT_NAV;
    case "school-admin":
      return SENIORS_SCHOOL_ADMIN_NAV;
  }
}

function navHref(ctx: SiteContext, segment: string) {
  return ctx.sitePath(segment);
}

function SeniorsAppShellInner({
  ctx,
  role,
  activeNav,
  title,
  subtitle,
  headerExtra,
  children,
  onLogout,
  hideTopBar = false,
}: {
  ctx: SiteContext;
  role: PortalRole;
  activeNav: string;
  title?: string;
  subtitle?: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  onLogout?: () => void | Promise<void>;
  hideTopBar?: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isDark, toggleTheme } = useSeniorsTheme();
  const { confirm } = useSeniorsConfirm();

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }
  const nav = getNav(role);
  const navSections = groupNavBySection(nav);
  const accent = ctx.brandHex || SENIORS_BLUE;
  const enquiryCount = useSchoolAdminEnquiryCount(ctx.tenant, role === "school-admin");
  const announcementCount = useStudentAnnouncementUnreadCount(
    ctx.tenant,
    role === "student",
  );

  const cachedProfile = getCachedProfile(ctx.tenant, role);
  const [profileName, setProfileName] = useState(cachedProfile?.fullName?.trim() || "");
  const [profileRole, setProfileRole] = useState(cachedProfile?.roleLabel || ROLE_LABELS[role]);

  useEffect(() => {
    const warm = getCachedProfile(ctx.tenant, role);
    if (warm?.fullName?.trim()) setProfileName(warm.fullName.trim());
    if (warm?.roleLabel) setProfileRole(warm.roleLabel);
    let cancelled = false;
    void loadProfile(ctx.tenant, role)
      .then((profile) => {
        if (cancelled) return;
        if (profile.fullName?.trim()) setProfileName(profile.fullName.trim());
        if (profile.roleLabel) setProfileRole(profile.roleLabel);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ctx.tenant, role]);

  function warmNav(navId: string) {
    if (!ctx.tenant) return;
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
      if (views.has(navId)) {
        prefetchTeacherViews(ctx.tenant, [
          navId as
            | "dashboard"
            | "content"
            | "assignments"
            | "quizzes"
            | "classwork"
            | "attendance"
            | "announcements"
            | "students",
        ]);
      }
      return;
    }
    const url = portalNavPrefetchUrl(ctx.tenant, role, navId);
    if (url) prefetchSeniorsJsonUrl(url);
  }

  function renderNavItem(item: (typeof nav)[number]) {
    const Icon = ICONS[item.icon as keyof typeof ICONS] ?? Home;
    const href = navHref(ctx, item.href);
    const active = activeNav === item.id || pathname === href || pathname.startsWith(`${href}/`);
    const unreadEnquiry = item.id === "enquiries" && enquiryCount > 0;
    const unreadAnnouncements = item.id === "school" && announcementCount > 0;
    const unread = unreadEnquiry || unreadAnnouncements;
    const unreadBadgeCount = unreadEnquiry ? enquiryCount : announcementCount;
    const unreadAria = unreadEnquiry
      ? `${enquiryCount} pending enquiries`
      : `${announcementCount} unread announcements`;

    return (
      <Link
        key={item.id}
        href={href}
        onClick={() => setMobileOpen(false)}
        onMouseEnter={() => warmNav(item.id)}
        onTouchStart={() => warmNav(item.id)}
        onFocus={() => warmNav(item.id)}
        title={sidebarCollapsed ? item.label : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98]",
          active
            ? "sp-nav-pill-active font-semibold"
            : unread
              ? "sp-text-strong font-semibold hover:bg-[var(--sp-surface-3)]"
              : "sp-muted hover:bg-[var(--sp-surface-3)] hover:text-[var(--sp-text-strong)]",
          sidebarCollapsed && "justify-center px-2.5",
        )}
      >
        <Icon
          className="h-[18px] w-[18px] shrink-0"
          strokeWidth={active || unread ? 2.25 : 1.75}
        />
        {!sidebarCollapsed ? (
          <>
            <span className={cn("min-w-0 flex-1 truncate", unread && "font-semibold")}>
              {item.label}
            </span>
            {unread ? (
              <span
                className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--sp-accent,#18181B)] px-1.5 text-[10px] font-bold leading-none text-[var(--sp-on-accent,#ffffff)]"
                aria-label={unreadAria}
              >
                {unreadBadgeCount > 99 ? "99+" : unreadBadgeCount}
              </span>
            ) : null}
          </>
        ) : unread ? (
          <span
            className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--sp-accent,#18181B)]"
            aria-label={unreadAria}
          />
        ) : null}
      </Link>
    );
  }

  const sidebar = (
    <aside
      className={cn(
        "relative z-20 flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-[var(--sp-border)]/60 transition-[width] duration-300 ease-in-out",
        sidebarCollapsed ? "w-[4.25rem]" : "w-[17.5rem]",
      )}
      style={{ backgroundColor: "var(--sp-shell)" }}
    >
      {/* Logo header */}
      <div
        className={cn(
          "shrink-0 border-b border-[var(--sp-border)]/60 px-3 pb-3 pt-4",
          sidebarCollapsed ? "flex flex-col items-center gap-2" : "space-y-3",
        )}
      >
        <div
          className={cn(
            "flex w-full items-start gap-2",
            sidebarCollapsed ? "justify-center" : "justify-between",
          )}
        >
          <Link
            href={ctx.sitePath()}
            className={cn(
              "flex min-w-0 items-center gap-2.5",
              sidebarCollapsed && "justify-center",
            )}
            title={sidebarCollapsed ? ctx.academyName || "Seniors" : undefined}
          >
            {ctx.logoUrl ? (
              <TenantSiteLogo
                logoUrl={ctx.logoUrl}
                academyName={ctx.academyName}
                imageClassName="h-9 w-9 shrink-0 object-contain"
              />
            ) : (
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                style={{ backgroundColor: accent, color: "var(--sp-on-brand, #ffffff)" }}
                aria-hidden
              >
                {(ctx.academyName.trim()[0] || "S").toUpperCase()}
              </span>
            )}
            {!sidebarCollapsed ? (
              <span className="sp-text-strong line-clamp-2 text-sm font-bold leading-snug tracking-tight">
                {ctx.academyName || "Seniors"}
              </span>
            ) : null}
          </Link>
          {!sidebarCollapsed ? (
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="hidden shrink-0 rounded-lg p-1.5 text-[var(--sp-muted)] transition hover:bg-[var(--sp-surface-3)] hover:text-[var(--sp-text-strong)] lg:inline-flex"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {sidebarCollapsed ? (
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className="hidden w-full items-center justify-center rounded-lg p-1.5 text-[var(--sp-muted)] transition hover:bg-[var(--sp-surface-3)] hover:text-[var(--sp-text-strong)] lg:inline-flex"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 py-3">
        {navSections.map((section, sectionIndex) => (
          <div key={section.section}>
            {sidebarCollapsed && sectionIndex > 0 ? (
              <div className="mx-auto my-2 h-px w-8 bg-[var(--sp-border)]" aria-hidden />
            ) : null}
            {!sidebarCollapsed ? (
              <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--sp-muted-2)]">
                {section.label}
              </p>
            ) : null}
            <div className="space-y-0.5">
              {section.items.map(renderNavItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* Account footer */}
      <div className="shrink-0 space-y-1 border-t border-[var(--sp-border)]/60 p-2.5">
        {!sidebarCollapsed ? (
          <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--sp-muted-2)]">
            Account
          </p>
        ) : null}
        <button
          type="button"
          onClick={toggleTheme}
          className={cn(
            "group flex w-full items-center gap-3 rounded-full px-3 py-2 text-sm text-[var(--sp-muted)] transition-all duration-200 hover:bg-[var(--sp-surface-3)] hover:text-[var(--sp-text-strong)] active:scale-[0.98]",
            sidebarCollapsed && "justify-center",
          )}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          {!sidebarCollapsed ? (isDark ? "Light mode" : "Dark mode") : null}
        </button>
        <button
          type="button"
          onClick={async () => {
            const shouldLogout = await confirm({
              title: "Log out?",
              message: "Do you want to log out?",
              confirmLabel: "Log out",
              cancelLabel: "Cancel",
            });
            if (!shouldLogout) return;
            if (onLogout) {
              await onLogout();
              return;
            }
            await logoutSeniorsRoleAndGoHome(ctx.tenant, role as SeniorsRole);
          }}
          className={cn(
            "group flex w-full items-center gap-3 rounded-full px-3 py-2 text-sm text-[var(--sp-muted)] transition-all duration-200 hover:bg-[var(--sp-danger-soft)] hover:text-[var(--sp-danger)] active:scale-[0.98]",
            sidebarCollapsed && "justify-center",
          )}
        >
          <LogOut className="h-[18px] w-[18px]" />
          {!sidebarCollapsed ? "Logout" : null}
        </button>
        <div
          className={cn(
            "mt-1 flex items-center gap-2.5 rounded-2xl px-3 py-2.5",
            sidebarCollapsed && "justify-center px-2",
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--sp-surface-3)] text-sm font-bold text-[var(--sp-text-strong)]">
            {profileName ? profileName[0].toUpperCase() : <User className="h-4 w-4" />}
          </span>
          {!sidebarCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--sp-text-strong)]">
                {profileName || "Account"}
              </p>
              <p className="truncate text-[11px] text-[var(--sp-muted)]">{profileRole}</p>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );

  return (
    <div
      className="h-dvh overflow-hidden p-2 sm:p-3 lg:p-4"
      style={{
        backgroundColor: "var(--sp-page)",
        color: "var(--sp-text)",
      }}
    >
      <div
        className="sp-shell-card mx-auto flex h-full max-w-[1600px] overflow-hidden"
        style={{ backgroundColor: "var(--sp-shell)" }}
      >
        <div className="hidden h-full min-h-0 shrink-0 lg:block">{sidebar}</div>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <div
              className="absolute left-2 top-2 h-[calc(100%-1rem)] w-[17.5rem] overflow-hidden rounded-[var(--sp-radius-shell)] shadow-xl"
              style={{ backgroundColor: "var(--sp-shell)" }}
            >
              {sidebar}
            </div>
          </div>
        ) : null}

        <div
          className="relative z-10 flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--sp-surface)]"
        >
          {hideTopBar ? (
            <div className="flex shrink-0 items-center gap-2 px-4 pt-4 lg:hidden">
              <button
                type="button"
                className="rounded-full p-2 text-[var(--sp-text)] transition hover:bg-[var(--sp-surface-3)]"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <header className="z-30 shrink-0 border-b border-[var(--sp-border)]/60 bg-[var(--sp-surface)] px-4 py-3 lg:px-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="rounded-full p-2 text-[var(--sp-text)] transition hover:bg-[var(--sp-surface-3)] lg:hidden"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                  <div>
                    {title ? (
                      <h1 className="sp-text-strong text-lg font-bold tracking-tight">{title}</h1>
                    ) : null}
                    {subtitle ? <p className="sp-muted text-xs">{subtitle}</p> : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SeniorsHeaderActions ctx={ctx} role={role} />
                  {headerExtra}
                </div>
              </div>
            </header>
          )}
          <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function SeniorsAppShell(props: {
  ctx: SiteContext;
  role: PortalRole;
  activeNav: string;
  title?: string;
  subtitle?: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  onLogout?: () => void | Promise<void>;
  hideTopBar?: boolean;
}) {
  return (
    <SeniorsThemeProvider brandHex={props.ctx.brandHex}>
      <SeniorsConfirmProvider>
        <SeniorsAppShellInner {...props} />
      </SeniorsConfirmProvider>
    </SeniorsThemeProvider>
  );
}

export type {
  SeniorsStudentNavId,
  SeniorsTeacherNavId,
  SeniorsParentNavId,
  SeniorsSchoolAdminNavId,
};
