"use client";

import { SeniorsLoginHub } from "@/presentation/components/templates/seniors/SeniorsRoleLoginPage";
import { useTenantSite } from "@/presentation/components/website/TenantSiteShell";

export default function LoginRoute() {
  const ctx = useTenantSite();
  return <SeniorsLoginHub ctx={ctx} />;
}
