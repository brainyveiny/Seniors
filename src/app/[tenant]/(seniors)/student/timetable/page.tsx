"use client";

import { useParams } from "next/navigation";
import type { SeniorsStudentTimetableData } from "@/domain/seniors/types";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  SeniorsPortalLoadingGate,
  useSeniorsCachedJson,
} from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";
import { StudentTimetablePage } from "@/presentation/components/templates/seniors/student/StudentTimetablePage";

export default function StudentTimetableRoutePage() {
  const params = useParams();
  const site = useSeniorsSite();
  const tenant =
    (typeof params.tenant === "string" ? params.tenant : "") || site.tenant;
  const url = tenant
    ? `/api/tenants/${encodeURIComponent(tenant)}/seniors/student/page?view=timetable`
    : null;
  const { data, loading, error } = useSeniorsCachedJson<SeniorsStudentTimetableData>(url);

  return (
    <SeniorsPortalLoadingGate loading={loading} hasData={Boolean(data)} error={error}>
      {data ? <StudentTimetablePage ctx={site} data={data} /> : null}
    </SeniorsPortalLoadingGate>
  );
}
