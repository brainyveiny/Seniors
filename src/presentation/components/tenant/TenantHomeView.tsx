"use client";

import { SeniorsTenantLanding } from "@/presentation/components/templates/seniors/SeniorsTenantLanding";
import { useTenantSite } from "@/presentation/components/website/TenantSiteShell";
import { resolveSeniorsContent } from "@/shared/lib/seniors-content";

export function TenantHomeView() {
  const ctx = useTenantSite();
  const content = resolveSeniorsContent(undefined, ctx.academyName);
  return <SeniorsTenantLanding ctx={ctx} content={content} />;
}
