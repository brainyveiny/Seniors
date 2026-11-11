"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  SeniorsPortalLoadingGate,
  useSeniorsCachedJson,
} from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";
import {
  ParentAttendancePage,
  ParentCalendarPage,
  ParentHomeworkPage,
  ParentLessonPlanPage,
  ParentProfilePage,
  ParentTestResultsPage,
  ParentTimetablePage,
} from "@/presentation/components/templates/seniors/parent/ParentSectionPages";

const VIEW_CONFIG = {
  homework: ParentHomeworkPage,
  "test-results": ParentTestResultsPage,
  attendance: ParentAttendancePage,
  profile: ParentProfilePage,
  timetable: ParentTimetablePage,
  calendar: ParentCalendarPage,
  "lesson-plan": ParentLessonPlanPage,
} as const;

export type ParentSectionView = keyof typeof VIEW_CONFIG;

export function ParentSectionRoute({ view }: { view: ParentSectionView }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const site = useSeniorsSite();
  const tenant =
    (typeof params.tenant === "string" ? params.tenant : "") || site.tenant;
  const child = searchParams.get("child")?.trim() ?? "";
  const url = tenant
    ? `/api/tenants/${encodeURIComponent(tenant)}/seniors/parent/page?view=${encodeURIComponent(view)}${
        child ? `&child=${encodeURIComponent(child)}` : ""
      }`
    : null;
  const { data, loading, error } = useSeniorsCachedJson<Record<string, unknown>>(url);
  const Page = VIEW_CONFIG[view];

  return (
    <SeniorsPortalLoadingGate loading={loading} hasData={Boolean(data)} error={error}>
      {data ? <Page ctx={site} data={data as never} /> : null}
    </SeniorsPortalLoadingGate>
  );
}
