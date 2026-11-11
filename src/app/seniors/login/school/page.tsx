import { Suspense } from "react";
import { SeniorsRoleLoginPage } from "@/presentation/components/templates/seniors/SeniorsRoleLoginPage";

export default function SeniorsSchoolLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9FAFB]" />}>
      <SeniorsRoleLoginPage role="school-admin" platformMode />
    </Suspense>
  );
}
