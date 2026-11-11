"use client";

import { useParams } from "next/navigation";
import { StudentTopicClient } from "@/presentation/components/templates/seniors/SeniorsRouteClients";
import type { TopicPageData } from "@/presentation/components/templates/seniors/student/StudentTopicPage";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  SeniorsPortalLoadingGate,
  useSeniorsCachedJson,
} from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";

export default function StudentTopicRoutePage() {
  const params = useParams();
  const site = useSeniorsSite();
  const tenant =
    (typeof params.tenant === "string" ? params.tenant : "") || site.tenant;
  const topicSlug =
    typeof params.topicSlug === "string" ? params.topicSlug : "";
  const url =
    tenant && topicSlug
      ? `/api/tenants/${encodeURIComponent(tenant)}/seniors/student/topic/${encodeURIComponent(topicSlug)}`
      : null;
  const { data, loading, error } = useSeniorsCachedJson<TopicPageData>(url);

  return (
    <SeniorsPortalLoadingGate
      loading={loading}
      hasData={Boolean(data)}
      error={error}
      label="Opening topic…"
    >
      {data ? <StudentTopicClient topic={data} /> : null}
    </SeniorsPortalLoadingGate>
  );
}
