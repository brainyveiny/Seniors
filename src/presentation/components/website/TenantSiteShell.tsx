"use client";

import { useParams } from "next/navigation";
import { useSiteContext, type SiteContext } from "@/application/hooks/use-site-context";

export function useTenantSite(): SiteContext {
  const params = useParams();
  const tenant = typeof params.tenant === "string" ? params.tenant : "";
  return useSiteContext(tenant);
}

/**
 * Stable site context for Seniors school portals.
 * Always uses `/seniors/...` URLs so SSR and client hydration match
 * (public URLs are rewritten to /{tenant}/... internally).
 */
export function useSeniorsSite(tenantOverride?: string): SiteContext {
  const params = useParams();
  const tenant =
    tenantOverride ??
    (typeof params.tenant === "string" ? params.tenant : "");
  return useSiteContext(tenant);
}
