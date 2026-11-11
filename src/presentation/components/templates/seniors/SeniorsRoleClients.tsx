"use client";

import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import { SeniorsCard } from "@/presentation/components/templates/seniors/shared/SeniorsUi";
import {
  TeacherDashboardPage,
  type TeacherDashboardData,
} from "@/presentation/components/templates/seniors/teacher/TeacherDashboardPage";
import {
  ParentDashboardPage,
  type ParentDashboardData,
} from "@/presentation/components/templates/seniors/parent/ParentDashboardPage";
import {
  SchoolAdminDashboardPage,
  type SchoolAdminDashboardData,
} from "@/presentation/components/templates/seniors/school-admin/SchoolAdminDashboardPage";

export {
  TeacherContentClient,
  TeacherAssignmentsClient,
  TeacherQuizzesClient,
  TeacherClassworkClient,
  TeacherAnnouncementsClient,
  TeacherStudentsClient,
} from "@/presentation/components/templates/seniors/teacher/TeacherWorkspaceClients";

export { TeacherAttendancePanel as TeacherAttendanceClient } from "@/presentation/components/templates/seniors/teacher/TeacherAttendancePanel";

export { ParentChildrenDetailClient as ParentChildrenClient } from "@/presentation/components/templates/seniors/parent/ParentChildrenClients";

export { SchoolAdminSectionPages as SchoolAdminSectionClient } from "@/presentation/components/templates/seniors/school-admin/SchoolAdminSectionPages";

export function TeacherDashboardClient({
  data,
}: {
  data: TeacherDashboardData;
}) {
  const ctx = useSeniorsSite();
  return <TeacherDashboardPage ctx={ctx} data={data} />;
}

export function ParentDashboardClient({
  data,
}: {
  data: ParentDashboardData;
}) {
  const ctx = useSeniorsSite();
  return <ParentDashboardPage ctx={ctx} data={data} />;
}

export function ParentAnnouncementsClient({
  announcements,
}: {
  announcements: { id: string; title: string; body: string }[];
}) {
  return (
    <div className="space-y-3">
      {announcements.length === 0 ? (
        <SeniorsCard>
          <p className="text-sm text-[#6B7280]">No announcements yet.</p>
        </SeniorsCard>
      ) : (
        announcements.map((a) => (
          <SeniorsCard key={a.id}>
            <p className="font-bold">{a.title}</p>
            <p className="mt-2 text-sm">{a.body}</p>
          </SeniorsCard>
        ))
      )}
    </div>
  );
}

export function SchoolAdminDashboardClient({
  data,
}: {
  data: SchoolAdminDashboardData;
}) {
  const ctx = useSeniorsSite();
  return <SchoolAdminDashboardPage ctx={ctx} data={data} />;
}
