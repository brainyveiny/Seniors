"use client";

import { useParams } from "next/navigation";
import { StudentSchoolClient } from "@/presentation/components/templates/seniors/SeniorsRouteClients";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  SeniorsPortalLoadingGate,
  useSeniorsCachedJson,
} from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";

type SchoolPayload = {
  announcements: {
    id: string;
    title: string;
    body: string;
    publishedAt: Date | string;
    source?: "school" | "teacher";
    authorName?: string;
  }[];
};

export default function StudentSchoolPage() {
  const params = useParams();
  const site = useSeniorsSite();
  const tenant =
    (typeof params.tenant === "string" ? params.tenant : "") || site.tenant;
  const url = tenant
    ? `/api/tenants/${encodeURIComponent(tenant)}/seniors/student/page?view=school`
    : null;
  const { data, loading, error } = useSeniorsCachedJson<SchoolPayload>(url);

  return (
    <SeniorsPortalLoadingGate loading={loading} hasData={Boolean(data)} error={error}>
      {data ? <StudentSchoolClient announcements={data.announcements} /> : null}
    </SeniorsPortalLoadingGate>
  );
}
