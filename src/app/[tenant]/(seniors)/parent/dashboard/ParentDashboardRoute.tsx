"use client";

import { useParams, useSearchParams } from "next/navigation";
import { ParentDashboardClient } from "@/presentation/components/templates/seniors/SeniorsRoleClients";
import type { ParentDashboardData } from "@/presentation/components/templates/seniors/parent/ParentDashboardPage";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  SeniorsPortalLoadingGate,
  useSeniorsCachedJson,
} from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";

export function ParentDashboardRoute() {
  const params = useParams();
  const searchParams = useSearchParams();
  const site = useSeniorsSite();
  const tenant =
    (typeof params.tenant === "string" ? params.tenant : "") || site.tenant;
  const child = searchParams.get("child")?.trim() ?? "";
  const url = tenant
    ? `/api/tenants/${encodeURIComponent(tenant)}/seniors/parent/page?view=dashboard${
        child ? `&child=${encodeURIComponent(child)}` : ""
      }`
    : null;
  const { data, loading, error } = useSeniorsCachedJson<ParentDashboardData>(url);

  return (
    <SeniorsPortalLoadingGate loading={loading} hasData={Boolean(data)} error={error}>
      {data ? <ParentDashboardClient data={data} /> : null}
    </SeniorsPortalLoadingGate>
  );
}
