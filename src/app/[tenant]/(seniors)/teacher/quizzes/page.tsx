"use client";

import { useParams } from "next/navigation";
import { TeacherQuizzesClient } from "@/presentation/components/templates/seniors/SeniorsRoleClients";
import type { TeacherWorkspaceData } from "@/presentation/components/templates/seniors/teacher/TeacherWorkspaceClients";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  TeacherPortalLoadingGate,
  useTeacherPortalData,
} from "@/presentation/components/templates/seniors/shared/useTeacherPortalData";

export default function TeacherQuizzesPage() {
  const params = useParams();
  const site = useSeniorsSite();
  const tenant =
    (typeof params.tenant === "string" ? params.tenant : "") || site.tenant;
  const { data, loading, error } = useTeacherPortalData<TeacherWorkspaceData>(
    tenant,
    "quizzes",
  );

  return (
    <TeacherPortalLoadingGate
      loading={loading}
      hasData={Boolean(data)}
      error={error}
      label="Loading quizzes…"
    >
      {data ? <TeacherQuizzesClient data={data} /> : null}
    </TeacherPortalLoadingGate>
  );
}
