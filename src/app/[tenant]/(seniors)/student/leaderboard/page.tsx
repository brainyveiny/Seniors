"use client";

import { StudentLeaderboardPage } from "@/presentation/components/templates/seniors/student/StudentLeaderboardPage";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";

export default function StudentLeaderboardRoutePage() {
  const ctx = useSeniorsSite();
  return <StudentLeaderboardPage ctx={ctx} />;
}
