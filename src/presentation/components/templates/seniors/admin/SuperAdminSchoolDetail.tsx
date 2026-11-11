"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, Copy, ExternalLink, Loader2, LogIn } from "lucide-react";
import type { SeniorsSchoolDetail } from "@/application/seniors/seniors-product-admin";
import { seniorsProductAdminPath, seniorsTenantLoginPath } from "@/shared/lib/seniors-platform-urls";
import { cn } from "@/shared/lib/utils";
import { SuperAdminBrandingEditor } from "./SuperAdminBrandingEditor";
import { SuperAdminSchoolAccess } from "./SuperAdminSchoolAccess";
import { SuperAdminSchoolAdmins } from "./SuperAdminSchoolAdmins";
import { SuperAdminSchoolProfile } from "./SuperAdminSchoolProfile";
import { saRequest, schoolApi } from "./super-admin-api";
import {
  SA_BTN_PRIMARY,
  SA_BTN_SECONDARY,
  SaCard,
  SaNotice,
  SaSchoolAvatar,
  SaStat,
  SaStatusBadge,
  auditActionLabel,
  formatDate,
  formatRelativeTime,
} from "./SuperAdminUi";

export type SchoolDetailTab = "overview" | "branding" | "admins" | "profile" | "access";

const TAB_LABELS: Record<SchoolDetailTab, string> = {
  overview: "Overview",
  branding: "Branding",
  admins: "School admins",
  profile: "Profile & notes",
  access: "Access",
};

export function SuperAdminSchoolDetail({
  initialSchool,
  initialTab,
}: {
  initialSchool: SeniorsSchoolDetail;
  initialTab: SchoolDetailTab;
}) {
  const [school, setSchool] = useState(initialSchool);
  const [tab, setTab] = useState<SchoolDetailTab>(initialTab);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState("");

  function selectTab(next: SchoolDetailTab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  async function openAdminPanel(adminId?: string) {
    setOpening(true);
    setOpenError("");
    try {
      const json = await saRequest<{ redirectTo: string }>(schoolApi(school.id, "/impersonate"), {
        method: "POST",
        body: adminId ? { adminId } : {},
      });
      window.open(json.redirectTo, "_blank", "noopener");
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : "Could not open the admin panel");
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link
        href={seniorsProductAdminPath("schools")}
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" /> All schools
      </Link>

      <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <SaSchoolAvatar
            name={school.branding.schoolName}
            logoUrl={school.branding.logoUrl}
            brandHex={school.branding.primaryColor}
            size="lg"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold text-neutral-900">{school.branding.schoolName}</h2>
              <SaStatusBadge status={school.status} />
            </div>
            <p className="text-sm text-neutral-500">
              Code <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-800">{school.slug}</code>
              {school.profile.city ? ` · ${school.profile.city}` : ""} · Added {formatDate(school.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={seniorsTenantLoginPath(school.slug, "school-admin")}
            target="_blank"
            rel="noreferrer"
            className={SA_BTN_SECONDARY}
          >
            <ExternalLink className="h-4 w-4" /> Login page
          </a>
          <button
            type="button"
            onClick={() => void openAdminPanel()}
            disabled={opening || school.status === "suspended" || school.admins.length === 0}
            className={SA_BTN_PRIMARY}
            title={
              school.status === "suspended"
                ? "Re-activate the school first"
                : "Opens the school admin panel in a new tab, signed in as the school's first admin"
            }
          >
            {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Open admin panel
          </button>
        </div>
      </div>
      {openError ? <SaNotice tone="error">{openError}</SaNotice> : null}

      <div className="flex gap-1 overflow-x-auto border-b border-neutral-200">
        {(Object.keys(TAB_LABELS) as SchoolDetailTab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => selectTab(key)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition",
              tab === key
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800",
            )}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      {tab === "overview" ? <OverviewTab school={school} /> : null}
      {tab === "branding" ? <SuperAdminBrandingEditor school={school} onSaved={setSchool} /> : null}
      {tab === "admins" ? (
        <SuperAdminSchoolAdmins
          school={school}
          onAdminsChange={(admins) => setSchool((s) => ({ ...s, admins }))}
          onOpenAs={(adminId) => void openAdminPanel(adminId)}
          opening={opening}
        />
      ) : null}
      {tab === "profile" ? <SuperAdminSchoolProfile school={school} onSaved={setSchool} /> : null}
      {tab === "access" ? <SuperAdminSchoolAccess school={school} onSaved={setSchool} /> : null}
    </div>
  );
}

function CopyLink({ label, path }: { label: string; path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-neutral-600">{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        <code className="truncate rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-900">{path}</code>
        <button
          type="button"
          className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          aria-label={`Copy ${label}`}
          onClick={() => {
            void navigator.clipboard.writeText(`${window.location.origin}${path}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </span>
    </li>
  );
}

function OverviewTab({ school }: { school: SeniorsSchoolDetail }) {
  const s = school.stats;
  const events = s.events30d;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SaStat label="Students" value={s.students} hint={`${s.classes} classes`} />
        <SaStat label="Teachers" value={s.teachers} hint={`${s.admins} school admins`} />
        <SaStat label="Parents" value={s.parents} />
        <SaStat label="Active users (30d)" value={s.activeUsers30d} hint={`${events.login ?? 0} logins`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SaCard title="Content & engagement" description="Last 30 days of activity in this school">
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-neutral-600">Topic content ({s.topics} topics)</span>
              <span className="font-medium text-neutral-900">{s.coverage.complete}% complete</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-neutral-100">
              <div className="bg-emerald-500" style={{ width: `${s.coverage.complete}%` }} />
              <div className="bg-amber-400" style={{ width: `${s.coverage.inProgress}%` }} />
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              {s.coverage.inProgress}% in progress · {s.coverage.missing}% missing
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Quizzes", s.quizzes],
              ["Homework assigned", s.assignments],
              ["Announcements", s.announcements],
              ["Content uploads (30d)", events.content_upload ?? 0],
              ["Homework submitted (30d)", events.homework_submit ?? 0],
              ["Quiz attempts (30d)", events.quiz_attempt ?? 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-neutral-50 px-3 py-2">
                <dt className="text-xs text-neutral-500">{label}</dt>
                <dd className="text-lg font-semibold text-neutral-900">{value}</dd>
              </div>
            ))}
          </dl>
        </SaCard>

        <SaCard title="Login links" description="Share these with the school">
          <ul className="divide-y divide-neutral-100">
            <CopyLink label="School admin" path={seniorsTenantLoginPath(school.slug, "school-admin")} />
            <CopyLink label="Teachers" path={seniorsTenantLoginPath(school.slug, "teacher")} />
            <CopyLink label="Students" path={seniorsTenantLoginPath(school.slug, "student")} />
            <CopyLink label="Parents" path={seniorsTenantLoginPath(school.slug, "parent")} />
          </ul>
        </SaCard>
      </div>

      <SaCard title="Super admin activity for this school" bodyClassName="p-0">
        {school.audit.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-neutral-500">No changes recorded yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {school.audit.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900">{auditActionLabel(entry.action)}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {entry.summary} · {entry.actorEmail}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-neutral-400" suppressHydrationWarning>
                  {formatRelativeTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SaCard>
    </div>
  );
}
