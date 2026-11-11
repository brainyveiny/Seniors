"use client";

import type { WebsiteTemplateId } from "@/domain/entities/website";
import type { PageBlock } from "@/domain/entities/page-builder";
import { useTenantServerSiteSnapshot } from "@/presentation/components/tenant/TenantServerSiteProvider";
import { seniorsPlatformSitePath } from "@/shared/lib/seniors-platform-urls";

export interface SiteContext {
  tenant: string;
  academyName: string;
  ownerName: string;
  brandHex: string;
  tagline: string;
  activeTemplateId: WebsiteTemplateId | null;
  sitePath: (segment?: string) => string;
  footerBlock: PageBlock | null;
  logoUrl: string;
}

const DEFAULT_TAGLINE = "Quality education, structured for results.";
const DEFAULT_BRAND_HEX = "#2563EB";

export function useSiteContext(tenant: string): SiteContext {
  const snapshot = useTenantServerSiteSnapshot();
  const useServer = snapshot !== null && snapshot.tenant === tenant;

  return {
    tenant,
    academyName: useServer ? snapshot.academyName : "Seniors",
    ownerName: useServer ? snapshot.ownerName : "School Admin",
    brandHex: useServer ? snapshot.brandHex : DEFAULT_BRAND_HEX,
    tagline: DEFAULT_TAGLINE,
    activeTemplateId: "seniors-platform",
    sitePath: seniorsPlatformSitePath,
    footerBlock: null,
    logoUrl: useServer ? snapshot.logoUrl : "",
  };
}
