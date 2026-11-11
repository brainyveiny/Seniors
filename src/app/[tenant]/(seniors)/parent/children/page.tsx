"use client";

import { useParams } from "next/navigation";
import { ParentChildrenClient } from "@/presentation/components/templates/seniors/SeniorsRoleClients";
import type { ParentChildDetail } from "@/presentation/components/templates/seniors/parent/ParentChildrenClients";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  SeniorsPortalLoadingGate,
  useSeniorsCachedJson,
} from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";

type ChildrenPayload = {
  children: ParentChildDetail[];
  announcements: { id: string; title: string; body: string; publishedAt: Date | string }[];
};

export default function ParentChildrenPage() {
  const params = useParams();
  const site = useSeniorsSite();
  const tenant =
    (typeof params.tenant === "string" ? params.tenant : "") || site.tenant;
  const url = tenant
    ? `/api/tenants/${encodeURIComponent(tenant)}/seniors/parent/page?view=children`
    : null;
  const { data, loading, error } = useSeniorsCachedJson<ChildrenPayload>(url);

  return (
    <SeniorsPortalLoadingGate loading={loading} hasData={Boolean(data)} error={error}>
      {data ? (
        <ParentChildrenClient
          childProfiles={data.children}
          announcements={data.announcements}
        />
      ) : null}
    </SeniorsPortalLoadingGate>
  );
}
