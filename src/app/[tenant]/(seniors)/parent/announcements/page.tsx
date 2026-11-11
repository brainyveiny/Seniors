"use client";

import { useParams } from "next/navigation";
import { ParentAnnouncementsClient } from "@/presentation/components/templates/seniors/SeniorsRoleClients";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  SeniorsPortalLoadingGate,
  useSeniorsCachedJson,
} from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";

export default function ParentAnnouncementsPage() {
  const params = useParams();
  const site = useSeniorsSite();
  const tenant =
    (typeof params.tenant === "string" ? params.tenant : "") || site.tenant;
  const url = tenant
    ? `/api/tenants/${encodeURIComponent(tenant)}/seniors/parent/page?view=announcements`
    : null;
  const { data, loading, error } = useSeniorsCachedJson<{
    announcements: { id: string; title: string; body: string }[];
  }>(url);

  return (
    <SeniorsPortalLoadingGate loading={loading} hasData={Boolean(data)} error={error}>
      {data ? <ParentAnnouncementsClient announcements={data.announcements} /> : null}
    </SeniorsPortalLoadingGate>
  );
}
