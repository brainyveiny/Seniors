"use client";

import { SeniorsRoleLoginPage } from "@/presentation/components/templates/seniors/SeniorsRoleLoginPage";
import { useTenantSite } from "@/presentation/components/website/TenantSiteShell";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SeniorsSchoolLoginRoute() {
  const ctx = useTenantSite();
  const router = useRouter();
  useEffect(() => {
    if (ctx.activeTemplateId !== "seniors-platform") {
      router.replace(ctx.sitePath("login"));
    }
  }, [ctx, router]);
  if (ctx.activeTemplateId !== "seniors-platform") return null;
  return <SeniorsRoleLoginPage ctx={ctx} role="school-admin" />;
}
