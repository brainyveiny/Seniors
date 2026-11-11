"use client";

import { StudentAiDoubtsPage } from "@/presentation/components/templates/seniors/student/StudentAiDoubtsPage";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";

export default function StudentAiDoubtsRoutePage() {
  const ctx = useSeniorsSite();
  return <StudentAiDoubtsPage ctx={ctx} />;
}
