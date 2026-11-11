"use client";

import { useParams } from "next/navigation";
import { StudentProgressClient } from "@/presentation/components/templates/seniors/SeniorsRouteClients";
import type { SeniorsSubjectSummary } from "@/domain/seniors/types";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  SeniorsPortalLoadingGate,
  useSeniorsCachedJson,
} from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";

type ProgressPayload = {
  subjects: SeniorsSubjectSummary[];
  progressSummary: {
    percent: number;
    topicsCompleted: number;
    topicsTotal: number;
    testAverage: number;
  };
};

export default function StudentProgressPage() {
  const params = useParams();
  const site = useSeniorsSite();
  const tenant =
    (typeof params.tenant === "string" ? params.tenant : "") || site.tenant;
  const url = tenant
    ? `/api/tenants/${encodeURIComponent(tenant)}/seniors/student/page?view=progress`
    : null;
  const { data, loading, error } = useSeniorsCachedJson<ProgressPayload>(url);

  return (
    <SeniorsPortalLoadingGate loading={loading} hasData={Boolean(data)} error={error}>
      {data ? (
        <StudentProgressClient
          subjects={data.subjects}
          progressSummary={data.progressSummary}
        />
      ) : null}
    </SeniorsPortalLoadingGate>
  );
}
