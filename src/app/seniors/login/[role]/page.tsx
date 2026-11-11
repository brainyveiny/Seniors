import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import type { SeniorsRole } from "@/infrastructure/auth/auth-constants";
import { SENIORS_ROLES } from "@/infrastructure/auth/auth-constants";
import { SeniorsRoleLoginPage } from "@/presentation/components/templates/seniors/SeniorsRoleLoginPage";

function isRole(value: string): value is SeniorsRole {
  return (SENIORS_ROLES as readonly string[]).includes(value);
}

export default async function SeniorsPlatformRoleLoginPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role: raw } = await params;
  if (raw === "school") {
    redirect("/seniors/login/school");
  }
  if (!isRole(raw) || raw === "school-admin") {
    notFound();
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9FAFB]" />}>
      <SeniorsRoleLoginPage role={raw} platformMode />
    </Suspense>
  );
}
