"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import { SeniorsAppShell } from "@/presentation/components/templates/seniors/shared/SeniorsAppShell";
import { prefetchSeniorsJson } from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";
import { prefetchTeacherViews } from "@/presentation/components/templates/seniors/shared/useTeacherPortalData";
import {
  SENIORS_PARENT_NAV,
  SENIORS_SCHOOL_ADMIN_NAV,
  SENIORS_STUDENT_NAV,
  SENIORS_TEACHER_NAV,
} from "@/presentation/components/templates/seniors/shared/seniors-nav";
import { SeniorsGamificationProvider } from "@/presentation/components/templates/seniors/gamification/SeniorsGamificationProvider";
import { prefetchLeaderboard } from "@/presentation/components/templates/seniors/gamification/seniors-leaderboard-cache";
import { prefetchNotifications } from "@/presentation/components/templates/seniors/shared/seniors-notifications-cache";
import { prefetchProfile } from "@/presentation/components/templates/seniors/shared/seniors-profile-cache";

type PortalRole = "student" | "teacher" | "parent" | "school-admin";

function resolveActiveNav(role: PortalRole, pathname: string): string {
  const nav =
    role === "student"
      ? SENIORS_STUDENT_NAV
      : role === "teacher"
        ? SENIORS_TEACHER_NAV
        : role === "parent"
          ? SENIORS_PARENT_NAV
          : SENIORS_SCHOOL_ADMIN_NAV;

  const match = [...nav]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname.includes(`/${item.href}`));

  return match?.id ?? nav[0]?.id ?? "home";
}

/** Pages that render their own top greeting/actions (no sticky chrome title). */
function shouldHideTopBar(role: PortalRole, pathname: string) {
  if (role === "student") {
    return (
      pathname.includes("/student/home") ||
      pathname.includes("/student/learn") ||
      pathname.includes("/student/exam-prep") ||
      pathname.includes("/student/school") ||
      pathname.includes("/student/progress") ||
      pathname.includes("/student/leaderboard") ||
      pathname.includes("/student/ai-doubts") ||
      pathname.includes("/student/topic/") ||
      pathname.includes("/student/timetable") ||
      (pathname.includes("/student/homework") &&
        !pathname.match(/\/student\/homework\/[^/]+/))
    );
  }
  if (role === "teacher") {
    return pathname.includes("/teacher/dashboard");
  }
  if (role === "parent") {
    return (
      pathname.includes("/parent/dashboard") ||
      pathname.includes("/parent/homework") ||
      pathname.includes("/parent/test-results") ||
      pathname.includes("/parent/attendance") ||
      pathname.includes("/parent/profile") ||
      pathname.includes("/parent/timetable") ||
      pathname.includes("/parent/calendar") ||
      pathname.includes("/parent/lesson-plan") ||
      pathname.includes("/parent/leave") ||
      pathname.includes("/parent/fees") ||
      pathname.includes("/parent/transport") ||
      pathname.includes("/parent/hobby-club") ||
      pathname.includes("/parent/books") ||
      pathname.includes("/parent/elective") ||
      pathname.includes("/parent/uniform")
    );
  }
  if (role === "school-admin") {
    return pathname.includes("/school-admin/dashboard");
  }
  return false;
}

function resolveChrome(
  role: PortalRole,
  pathname: string,
): { title?: string; subtitle?: string } {
  if (role === "student") {
    if (pathname.includes("/student/homework/") && !pathname.endsWith("/homework")) {
      return { title: "Assignment" };
    }
    if (pathname.includes("/student/homework")) return { title: "Classwork" };
    if (pathname.includes("/student/search")) return { title: "Search" };
  }
  if (role === "teacher") {
    if (pathname.includes("/teacher/topic/")) {
      return {
        title: "Topic Preview",
        subtitle: "Student-facing preview of your current draft.",
      };
    }
    if (pathname.includes("/teacher/content")) {
      return {
        title: "Topic Studio",
        subtitle: "Draft, preview and publish full topic experiences with rich content.",
      };
    }
    if (pathname.includes("/teacher/assignments")) {
      return {
        title: "Classwork",
        subtitle: "Assign work and review student submissions.",
      };
    }
    if (pathname.includes("/teacher/quizzes")) {
      return {
        title: "Quizzes",
        subtitle: "Create quizzes and track class results.",
      };
    }
    if (pathname.includes("/teacher/announcements")) {
      return {
        title: "Announcements",
        subtitle: "Share updates with your students.",
      };
    }
    if (pathname.includes("/teacher/students")) {
      return { title: "Student Records" };
    }
  }
  if (role === "parent") {
    if (pathname.includes("/parent/children")) {
      return {
        title: "My Children",
        subtitle: "Progress, alerts, and subject-wise status.",
      };
    }
    const parentItem = SENIORS_PARENT_NAV.find((n) =>
      pathname.includes(`/${n.href}`),
    );
    if (parentItem && parentItem.id !== "dashboard") {
      return { title: parentItem.label };
    }
  }
  if (role === "school-admin") {
    const item = SENIORS_SCHOOL_ADMIN_NAV.find((n) =>
      pathname.includes(`/${n.href}`),
    );
    if (item && item.id !== "dashboard") {
      return {
        title: item.label,
        subtitle:
          item.id === "announcements"
            ? "Publish school-wide updates for students and parents."
            : item.id === "enquiries"
              ? "Review student and teacher signup requests before they join the school."
              : item.id === "exams"
                ? "Schedule exam dates for the whole school or a specific class."
                : undefined,
      };
    }
  }
  return {};
}

function prefetchPortalSections(tenant: string, role: PortalRole, activeNav?: string) {
  prefetchProfile(tenant, role);
  const t = encodeURIComponent(tenant);
  // Only warm the active section on mount -hover prefetch covers the rest.
  // Prefetching every section at once saturates the network and slows first paint.
  if (role === "teacher") {
    prefetchNotifications(tenant, "teacher");
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
    const view =
      activeNav && views.has(activeNav)
        ? (activeNav as
            | "dashboard"
            | "content"
            | "assignments"
            | "quizzes"
            | "classwork"
            | "attendance"
            | "announcements"
            | "students")
        : "dashboard";
    prefetchTeacherViews(tenant, [view]);
    return;
  }
  if (role === "student") {
    prefetchNotifications(tenant, "student");
    const views = ["home", "learn", "exam-prep", "school", "progress"] as const;
    const view =
      activeNav && (views as readonly string[]).includes(activeNav)
        ? activeNav
        : "home";
    prefetchSeniorsJson([`/api/tenants/${t}/seniors/student/page?view=${view}`]);
    // Leaderboard is heavy -only warm when that page is open.
    if (activeNav === "leaderboard") prefetchLeaderboard(tenant);
    return;
  }
  if (role === "parent") {
    const views = [
      "dashboard",
      "profile",
      "homework",
      "test-results",
      "attendance",
      "timetable",
      "calendar",
      "lesson-plan",
      "leave",
      "fees",
      "transport",
      "hobby-club",
      "books",
      "elective",
      "uniform",
      "children",
      "announcements",
    ] as const;
    const view =
      activeNav && (views as readonly string[]).includes(activeNav)
        ? activeNav
        : "dashboard";
    prefetchSeniorsJson([`/api/tenants/${t}/seniors/parent/page?view=${view}`]);
    return;
  }
  prefetchNotifications(tenant, "school-admin");
  const views = [
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
  ] as const;
  const view =
    activeNav && (views as readonly string[]).includes(activeNav)
      ? activeNav
      : "dashboard";
  prefetchSeniorsJson([`/api/tenants/${t}/seniors/school-admin/page?view=${view}`]);
}

export function SeniorsPortalLayout({
  role,
  children,
}: {
  role: PortalRole;
  children: React.ReactNode;
}) {
  const ctx = useSeniorsSite();
  const pathname = usePathname() || "";
  const activeNav = resolveActiveNav(role, pathname);
  const hideTopBar = shouldHideTopBar(role, pathname);
  const chrome = hideTopBar ? {} : resolveChrome(role, pathname);

  useEffect(() => {
    if (!ctx.tenant) return;
    prefetchPortalSections(ctx.tenant, role, activeNav);
  }, [ctx.tenant, role, activeNav]);

  const shell = (
    <SeniorsAppShell
      ctx={ctx}
      role={role}
      activeNav={activeNav}
      title={chrome.title}
      subtitle={chrome.subtitle}
      hideTopBar={hideTopBar}
    >
      {children}
    </SeniorsAppShell>
  );

  if (role !== "student") return shell;
  return (
    <SeniorsGamificationProvider tenant={ctx.tenant}>
      {shell}
    </SeniorsGamificationProvider>
  );
}
