"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Phone } from "lucide-react";
import { SeniorsAuthDrawer } from "@/presentation/components/templates/seniors/SeniorsAuthDrawer";
import { SENIORS_AUDIENCE_NAV } from "@/shared/config/seniors-audiences";
import { cn } from "@/shared/lib/utils";

const BLUE = "#2563EB";

const SECTION_TABS = [
  { id: "hero", label: "Get started", href: "/seniors#hero" },
  { id: "features", label: "Features", href: "/seniors#features" },
  { id: "how-it-works", label: "How it works", href: "/seniors#how-it-works" },
  { id: "demo-booking", label: "Book demo", href: "/seniors#demo-booking" },
] as const;

function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>
  );
}

export function SeniorsPlatformChrome({
  children,
  accent = BLUE,
  showSectionNav = true,
  activeSection,
  onSectionClick,
  authOpen: authOpenProp,
  onAuthOpenChange,
  authMode: authModeProp,
  onAuthModeChange,
}: {
  children: ReactNode;
  accent?: string;
  showSectionNav?: boolean;
  activeSection?: string;
  onSectionClick?: (id: string) => void;
  authOpen?: boolean;
  onAuthOpenChange?: (open: boolean) => void;
  authMode?: "login" | "signup";
  onAuthModeChange?: (mode: "login" | "signup") => void;
}) {
  const pathname = usePathname();
  const [authOpenInternal, setAuthOpenInternal] = useState(false);
  const [authModeInternal, setAuthModeInternal] = useState<"login" | "signup">("login");

  const authOpen = authOpenProp ?? authOpenInternal;
  const setAuthOpen = onAuthOpenChange ?? setAuthOpenInternal;
  const authMode = authModeProp ?? authModeInternal;
  const setAuthMode = onAuthModeChange ?? setAuthModeInternal;

  function openAuth(mode: "login" | "signup" = "login") {
    setAuthMode(mode);
    setAuthOpen(true);
  }

  return (
    <div className="min-h-screen bg-white text-[#3C4852]">
      <header className="sticky top-0 z-50 bg-white shadow-[0_1px_0_rgba(0,0,0,0.06)]">
        <div style={{ backgroundColor: accent }}>
          <PageContainer className="flex items-center gap-3 py-3 sm:gap-5">
            <Link href="/seniors" className="flex shrink-0 items-center gap-2">
              <span className="text-base font-extrabold tracking-wide text-white">SENIORS</span>
            </Link>

            <nav className="hidden items-center gap-0.5 md:flex lg:gap-1">
              {SENIORS_AUDIENCE_NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-sm font-semibold transition",
                      active ? "bg-white/20 text-white" : "text-white/95 hover:bg-white/15",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              <a
                href="tel:+911234567890"
                className="hidden items-center gap-1.5 text-xs font-medium text-white/90 xl:flex"
              >
                <Phone className="h-3.5 w-3.5" />
                Talk to us
              </a>
              <Link
                href="/seniors#demo-booking"
                className="hidden text-sm font-semibold text-white/95 hover:underline sm:inline"
              >
                Enquire Now
              </Link>
              <button
                type="button"
                onClick={() => openAuth("login")}
                className="rounded-lg border-2 border-white px-4 py-1.5 text-sm font-bold text-white hover:bg-white/10"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => openAuth("signup")}
                className="hidden rounded-lg bg-white px-4 py-1.5 text-sm font-bold sm:inline"
                style={{ color: accent }}
              >
                Signup
              </button>
            </div>
          </PageContainer>
        </div>

        {/* Mobile audience links */}
        <div className="flex gap-1 overflow-x-auto border-b border-white/20 px-4 py-2 md:hidden" style={{ backgroundColor: accent }}>
          {SENIORS_AUDIENCE_NAV.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {showSectionNav ? (
          <nav className="border-b border-[#F0F0F0] bg-white">
            <PageContainer className="flex gap-6 overflow-x-auto scrollbar-none">
              {SECTION_TABS.map((tab) => {
                const active = activeSection === tab.id;
                return onSectionClick ? (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onSectionClick(tab.id)}
                    className={cn(
                      "shrink-0 border-b-[3px] py-3 text-sm font-semibold transition",
                      active
                        ? "border-[#3C4852] text-[#3C4852]"
                        : "border-transparent text-[#707070] hover:text-[#3C4852]",
                    )}
                  >
                    {tab.label}
                  </button>
                ) : (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    className="shrink-0 border-b-[3px] border-transparent py-3 text-sm font-semibold text-[#707070] hover:text-[#3C4852]"
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </PageContainer>
          </nav>
        ) : null}
      </header>

      <SeniorsAuthDrawer
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        accent={accent}
        mode={authMode}
        platformMode
        onRequestSignup={() => setAuthMode("signup")}
        onRequestLogin={() => setAuthMode("login")}
      />

      {children}
    </div>
  );
}

export { PageContainer as SeniorsPlatformContainer };
