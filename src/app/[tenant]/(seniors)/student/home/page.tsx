"use client";

import { useParams } from "next/navigation";
import { StudentHomeClient } from "@/presentation/components/templates/seniors/SeniorsRouteClients";
import type { SeniorsStudentDashboardData } from "@/domain/seniors/types";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  SeniorsPortalLoadingGate,
  useSeniorsCachedJson,
} from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";

export default function StudentHomePage() {
  const params = useParams();
  const site = useSeniorsSite();
  const tenant =
    (typeof params.tenant === "string" ? params.tenant : "") || site.tenant;
  const url = tenant
    ? `/api/tenants/${encodeURIComponent(tenant)}/seniors/student/page?view=home`
    : null;
  const { data, loading, error } = useSeniorsCachedJson<SeniorsStudentDashboardData | null>(
    url,
  );
  const ready = Boolean(data) || (!loading && !error);

  return (
    <SeniorsPortalLoadingGate loading={loading} hasData={ready} error={error}>
      {ready ? <StudentHomeClient data={data} /> : null}
    </SeniorsPortalLoadingGate>
  );
}
