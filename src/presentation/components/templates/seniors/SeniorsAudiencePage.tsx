"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useState } from "react";
import {
  SENIORS_AUDIENCES,
  type SeniorsAudienceId,
  type SeniorsAudiencePage,
} from "@/shared/config/seniors-audiences";
import { SeniorsAudienceLiveDemo } from "@/presentation/components/templates/seniors/SeniorsAudienceLiveDemo";
import {
  SeniorsPlatformChrome,
  SeniorsPlatformContainer,
} from "@/presentation/components/templates/seniors/SeniorsPlatformChrome";

const BLUE = "#2563EB";

const ROLE_LOGIN: Record<SeniorsAudienceId, string> = {
  school: "school",
  teacher: "teacher",
  student: "student",
  parent: "parent",
};

export function SeniorsAudiencePage({
  audienceId,
  content: contentProp,
}: {
  audienceId: SeniorsAudienceId;
  content?: SeniorsAudiencePage;
}) {
  const page = contentProp ?? SENIORS_AUDIENCES[audienceId];
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  return (
    <SeniorsPlatformChrome
      accent={BLUE}
      showSectionNav
      authOpen={authOpen}
      onAuthOpenChange={setAuthOpen}
      authMode={authMode}
      onAuthModeChange={setAuthMode}
    >
      <main>
        <section className="border-b border-[#F0F0F0] bg-white py-10 sm:py-14">
          <SeniorsPlatformContainer>
            <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB]">
              {page.badge}
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl">
              {page.headline}
            </h1>
            <p className="mt-3 max-w-2xl text-base text-[#64748B] sm:text-lg">
              {page.subheadline}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthOpen(true);
                }}
                className="rounded-lg px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
                style={{ backgroundColor: BLUE }}
              >
                {page.ctaLabel}
              </button>
              <Link
                href="/seniors#demo-booking"
                className="rounded-lg border border-[#3C4852] px-5 py-2.5 text-sm font-semibold text-[#3C4852] hover:bg-[#F9F9F9]"
              >
                Book a school demo
              </Link>
            </div>
          </SeniorsPlatformContainer>
        </section>

        <section className="bg-white py-10 sm:py-12">
          <SeniorsPlatformContainer>
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
              <div>
                <h2 className="text-xl font-bold text-[#0F172A]">
                  What {page.navLabel.toLowerCase()} get on Seniors
                </h2>
                <ul className="mt-5 space-y-4">
                  {page.features.map((f) => (
                    <li key={f.title} className="flex gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ECFDF5] text-[#059669]">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="font-semibold text-[#111827]">{f.title}</p>
                        <p className="mt-0.5 text-sm text-[#64748B]">{f.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-[#0F172A]">{page.demoTitle}</p>
                <p className="mb-4 text-sm text-[#64748B]">
                  Click around -interactive preview of the {page.navLabel.toLowerCase()}{" "}
                  experience. No login needed.
                </p>
                <SeniorsAudienceLiveDemo role={audienceId} />
              </div>
            </div>
          </SeniorsPlatformContainer>
        </section>

        <section className="border-t border-[#F0F0F0] bg-[#FAFAFA] py-10">
          <SeniorsPlatformContainer className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-lg font-bold text-[#0F172A]">Ready to try with your school?</p>
              <p className="mt-1 text-sm text-[#64748B]">
                Login with your school code, or book a walkthrough with our team.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthOpen(true);
              }}
              className="rounded-lg border-2 px-5 py-2.5 text-sm font-bold hover:bg-white"
              style={{ borderColor: BLUE, color: BLUE }}
            >
              Open {ROLE_LOGIN[audienceId]} login
            </button>
          </SeniorsPlatformContainer>
        </section>
      </main>
    </SeniorsPlatformChrome>
  );
}
