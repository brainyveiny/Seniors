import { cache } from "react";
import { getPrismaClient } from "@/infrastructure/database/prisma";

export const findTenantBySlug = cache(async (slug: string) => {
  return getPrismaClient().tenant.findUnique({ where: { slug } });
});

/** Light tenant row for Seniors portals -no pages/products/users. */
export type SeniorsTenantShell = {
  slug: string;
  platformName: string;
  ownerName: string;
  brandColor: string;
  activeTemplateId: string | null;
  status: string;
  suspendedReason: string;
  schoolName: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
  tagline: string | null;
};

export const getSeniorsTenantShell = cache(
  async (slug: string): Promise<SeniorsTenantShell | null> => {
    const tenant = await getPrismaClient().tenant.findUnique({
      where: { slug },
      select: {
        slug: true,
        platformName: true,
        ownerName: true,
        brandColor: true,
        activeTemplateId: true,
        status: true,
        suspendedReason: true,
        seniorsSchoolSettings: {
          select: { schoolName: true, primaryColor: true, logoUrl: true, tagline: true },
        },
      },
    });
    if (!tenant) return null;
    return {
      slug: tenant.slug,
      platformName: tenant.platformName,
      ownerName: tenant.ownerName,
      brandColor: tenant.brandColor,
      activeTemplateId: tenant.activeTemplateId,
      status: tenant.status,
      suspendedReason: tenant.suspendedReason,
      schoolName: tenant.seniorsSchoolSettings?.schoolName ?? null,
      primaryColor: tenant.seniorsSchoolSettings?.primaryColor ?? null,
      logoUrl: tenant.seniorsSchoolSettings?.logoUrl ?? null,
      tagline: tenant.seniorsSchoolSettings?.tagline ?? null,
    };
  },
);
