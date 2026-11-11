"use client";

import { useParams } from "next/navigation";
import { TeacherStudentsClient } from "@/presentation/components/templates/seniors/SeniorsRoleClients";
import type { TeacherWorkspaceData } from "@/presentation/components/templates/seniors/teacher/TeacherWorkspaceClients";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  TeacherPortalLoadingGate,
  useTeacherPortalData,
} from "@/presentation/components/templates/seniors/shared/useTeacherPortalData";

export default function TeacherStudentsPage() {
  const params = useParams();
  const site = useSeniorsSite();
  const tenant =
    (typeof params.tenant === "string" ? params.tenant : "") || site.tenant;
  const { data, loading, error } = useTeacherPortalData<TeacherWorkspaceData>(
    tenant,
    "students",
  );

  return (
    <TeacherPortalLoadingGate
      loading={loading}
      hasData={Boolean(data)}
      error={error}
      label="Loading students…"
    >
      {data ? <TeacherStudentsClient data={data} /> : null}
    </TeacherPortalLoadingGate>
  );
}
