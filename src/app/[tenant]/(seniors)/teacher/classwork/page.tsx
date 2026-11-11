"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { TeacherClassworkClient } from "@/presentation/components/templates/seniors/SeniorsRoleClients";
import type { TeacherWorkspaceData } from "@/presentation/components/templates/seniors/teacher/TeacherWorkspaceClients";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  TeacherPortalLoadingGate,
  useTeacherPortalData,
} from "@/presentation/components/templates/seniors/shared/useTeacherPortalData";

function TeacherClassworkPageInner() {
  const params = useParams();
  const site = useSeniorsSite();
  const tenant =
    (typeof params.tenant === "string" ? params.tenant : "") || site.tenant;
  const { data, loading, error } = useTeacherPortalData<TeacherWorkspaceData>(
    tenant,
    "classwork",
  );

  return (
    <TeacherPortalLoadingGate
      loading={loading}
      hasData={Boolean(data)}
      error={error}
      label="Loading submissions…"
    >
      {data ? <TeacherClassworkClient data={data} /> : null}
    </TeacherPortalLoadingGate>
  );
}

export default function TeacherClassworkPage() {
  return (
    <Suspense
      fallback={
        <TeacherPortalLoadingGate
          loading
          hasData={false}
          error={null}
          label="Loading submissions…"
        />
      }
    >
      <TeacherClassworkPageInner />
    </Suspense>
  );
}
