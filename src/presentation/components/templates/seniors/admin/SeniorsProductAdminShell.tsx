"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Globe,
  Home,
  LayoutDashboard,
  LogOut,
  School,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import {
  SENIORS_PLATFORM_PREFIX,
  SENIORS_PRODUCT_ADMIN_HOME,
  seniorsProductAdminPath,
} from "@/shared/lib/seniors-platform-urls";

const NAV = [
  {
    section: "DASHBOARD",
    items: [
      { id: "home", label: "Home", href: SENIORS_PRODUCT_ADMIN_HOME, Icon: Home },
    ],
  },
  {
    section: "SENIORS",
    items: [
      {
        id: "schools",
        label: "Schools",
        href: seniorsProductAdminPath("schools"),
        Icon: School,
      },
    ],
  },
  {
    section: "WEBSITE",
    items: [
      {
        id: "website",
        label: "View site",
        href: "/seniors",
        Icon: Globe,
        external: true,
      },
    ],
  },
] as const;

const SIDEBAR_CLASS =
  "flex h-full min-h-0 shrink-0 flex-col bg-neutral-950 text-white transition-[width] duration-200 ease-out";

export function SeniorsProductAdminShell({
  children,
  title = "Overview",
  fullBleed = false,
}: {
  children: React.ReactNode;
  title?: string;
  fullBleed?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/super-admin/logout", { method: "POST" });
    } finally {
      router.push(SENIORS_PLATFORM_PREFIX);
      router.refresh();
    }
  }

  return (
    <div
      className="fixed inset-0 flex overflow-hidden bg-neutral-50 font-[family-name:var(--font-tt-norms)]"
      data-zipply-fixed-shell
    >
      <aside className={cn(SIDEBAR_CLASS, "w-60")}>
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-4">
          <LayoutDashboard className="h-5 w-5 text-white" />
          <div>
            <p className="text-sm font-bold tracking-wide text-white">SENIORS</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              Admin
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.section}>
              <p className="mb-1.5 px-2 text-[10px] font-semibold tracking-wider text-slate-500">
                {group.section}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    !("external" in item && item.external) &&
                    (pathname === item.href ||
                      (item.href !== SENIORS_PRODUCT_ADMIN_HOME &&
                        pathname.startsWith(item.href)));
                  const Comp = "external" in item && item.external ? "a" : Link;
                  return (
                    <Comp
                      key={item.id}
                      href={item.href}
                      {...("external" in item && item.external
                        ? { target: "_blank", rel: "noreferrer" }
                        : {})}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                        active
                          ? "bg-white/10 font-medium text-white"
                          : "text-slate-300 hover:bg-white/5 hover:text-slate-100",
                      )}
                    >
                      <item.Icon className="h-4 w-4 shrink-0 opacity-80" />
                      {item.label}
                    </Comp>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/10 p-3">
          <button
            type="button"
            disabled={loggingOut}
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {!fullBleed ? (
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-6">
            <h1 className="text-lg font-medium tracking-tight text-neutral-900">{title}</h1>
            <Link
              href="/seniors"
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
            >
              View Seniors site →
            </Link>
          </header>
        ) : null}
        <main
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            fullBleed
              ? "overflow-hidden bg-neutral-50 p-0"
              : "overflow-y-auto bg-neutral-50 p-6",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
