"use client";

import { useParams } from "next/navigation";
import { SchoolAdminDashboardClient } from "@/presentation/components/templates/seniors/SeniorsRoleClients";
import type { SchoolAdminDashboardData } from "@/presentation/components/templates/seniors/school-admin/SchoolAdminDashboardPage";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  SeniorsPortalLoadingGate,
  useSeniorsCachedJson,
} from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";

export default function SchoolAdminDashboardPage() {
  const params = useParams();
  const site = useSeniorsSite();
  const tenant =
    (typeof params.tenant === "string" ? params.tenant : "") || site.tenant;
  const url = tenant
    ? `/api/tenants/${encodeURIComponent(tenant)}/seniors/school-admin/page?view=dashboard`
    : null;
  const { data, loading, error } = useSeniorsCachedJson<SchoolAdminDashboardData>(url);

  return (
    <SeniorsPortalLoadingGate loading={loading} hasData={Boolean(data)} error={error}>
      {data ? <SchoolAdminDashboardClient data={data} /> : null}
    </SeniorsPortalLoadingGate>
  );
}
