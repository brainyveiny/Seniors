"use client";

import { useParams } from "next/navigation";
import { StudentLearnClient } from "@/presentation/components/templates/seniors/SeniorsRouteClients";
import type { StudentLearnMeta } from "@/presentation/components/templates/seniors/student/StudentLearnPage";
import type { SeniorsSubjectSummary } from "@/domain/seniors/types";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  SeniorsPortalLoadingGate,
  useSeniorsCachedJson,
} from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";

type LearnPayload = {
  subjects: SeniorsSubjectSummary[];
  student: StudentLearnMeta;
};

export default function StudentLearnPage() {
  const params = useParams();
  const site = useSeniorsSite();
  const tenant =
    (typeof params.tenant === "string" ? params.tenant : "") || site.tenant;
  const url = tenant
    ? `/api/tenants/${encodeURIComponent(tenant)}/seniors/student/page?view=learn`
    : null;
  const { data, loading, error } = useSeniorsCachedJson<LearnPayload>(url);

  return (
    <SeniorsPortalLoadingGate loading={loading} hasData={Boolean(data)} error={error}>
      {data ? (
        <StudentLearnClient subjects={data.subjects} student={data.student} />
      ) : null}
    </SeniorsPortalLoadingGate>
  );
}
