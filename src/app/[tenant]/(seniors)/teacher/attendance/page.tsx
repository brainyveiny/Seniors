"use client";

import { useParams } from "next/navigation";
import { TeacherAttendanceClient } from "@/presentation/components/templates/seniors/SeniorsRoleClients";
import type { TeacherAttendanceData } from "@/presentation/components/templates/seniors/teacher/TeacherAttendancePanel";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  TeacherPortalLoadingGate,
  useTeacherPortalData,
} from "@/presentation/components/templates/seniors/shared/useTeacherPortalData";

export default function TeacherAttendancePage() {
  const params = useParams();
  const site = useSeniorsSite();
  const tenant =
    (typeof params.tenant === "string" ? params.tenant : "") || site.tenant;
  const { data, loading, error } = useTeacherPortalData<TeacherAttendanceData>(
    tenant,
    "attendance",
  );

  return (
    <TeacherPortalLoadingGate
      loading={loading}
      hasData={Boolean(data)}
      error={error}
      label="Loading attendance…"
    >
      {data ? <TeacherAttendanceClient data={data} /> : null}
    </TeacherPortalLoadingGate>
  );
}
