"use client";

import { useParams } from "next/navigation";
import { SchoolAdminSectionClient } from "@/presentation/components/templates/seniors/SeniorsRoleClients";
import type { SchoolAdminSectionData } from "@/presentation/components/templates/seniors/school-admin/SchoolAdminSectionPages";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  SeniorsPortalLoadingGate,
  useSeniorsCachedJson,
} from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";

const SECTIONS = new Set([
  "teachers",
  "students",
  "attendance",
  "parent-services",
  "enquiries",
  "parents",
  "classes",
  "exams",
  "timetable",
  "content",
  "announcements",
]);

export default function SchoolAdminSectionPage() {
  const params = useParams();
  const site = useSeniorsSite();
  const tenant =
    (typeof params.tenant === "string" ? params.tenant : "") || site.tenant;
  const section = typeof params.section === "string" ? params.section : "";
  const url =
    tenant && SECTIONS.has(section)
      ? `/api/tenants/${encodeURIComponent(tenant)}/seniors/school-admin/page?view=${encodeURIComponent(section)}`
      : null;
  const { data, loading, error } = useSeniorsCachedJson<SchoolAdminSectionData>(url);

  if (!SECTIONS.has(section)) {
    return (
      <p className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-6 text-sm text-[#6B7280]">
        This section was not found.
      </p>
    );
  }

  return (
    <SeniorsPortalLoadingGate loading={loading} hasData={Boolean(data)} error={error}>
      {data ? <SchoolAdminSectionClient data={data} /> : null}
    </SeniorsPortalLoadingGate>
  );
}
