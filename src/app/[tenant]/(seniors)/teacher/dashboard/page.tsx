"use client";

import { useParams } from "next/navigation";
import { TeacherDashboardClient } from "@/presentation/components/templates/seniors/SeniorsRoleClients";
import type { TeacherDashboardData } from "@/presentation/components/templates/seniors/teacher/TeacherDashboardPage";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  TeacherPortalLoadingGate,
  useTeacherPortalData,
} from "@/presentation/components/templates/seniors/shared/useTeacherPortalData";

export default function TeacherDashboardPage() {
  const params = useParams();
  const site = useSeniorsSite();
  const tenant =
    (typeof params.tenant === "string" ? params.tenant : "") || site.tenant;
  const { data, loading, error } = useTeacherPortalData<TeacherDashboardData>(
    tenant,
    "dashboard",
  );

  return (
    <TeacherPortalLoadingGate loading={loading} hasData={Boolean(data)} error={error}>
      {data ? <TeacherDashboardClient data={data} /> : null}
    </TeacherPortalLoadingGate>
  );
}
