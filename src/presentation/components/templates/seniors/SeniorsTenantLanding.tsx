"use client";

import type { SiteContext } from "@/application/hooks/use-site-context";
import type { SeniorsContent } from "@/domain/entities/seniors-content";
import { SeniorsLanding } from "./SeniorsLanding";

/**
 * Tenant homepage when a school uses the Seniors template.
 * Brand stays "Seniors" (platform) -school name is not the product brand.
 */
export function SeniorsTenantLanding({
  ctx,
  content,
}: {
  ctx: SiteContext;
  content?: SeniorsContent;
}) {
  return (
    <SeniorsLanding
      brandName="Seniors"
      tenantMode
      platformMode={false}
      content={content}
      siteCtx={ctx}
      linkFor={(segment) => ctx.sitePath(segment)}
    />
  );
}
