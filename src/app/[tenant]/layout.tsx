import { notFound } from "next/navigation";
import { loadSeniorsTenantShellForLayout } from "@/application/tenant/tenant-server";
import { isSeniorsPlatformTemplate } from "@/application/tenant/seniors-tenant";
import { resolveBrandHex } from "@/infrastructure/data/brand-colors";
import { isDatabaseConfigured } from "@/infrastructure/database/prisma";
import { TenantRootLayout } from "@/presentation/components/tenant/TenantRootLayout";
import type { TenantServerSiteSnapshot } from "@/presentation/components/tenant/TenantServerSiteProvider";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;

  let snapshot: TenantServerSiteSnapshot | null = null;

  if (isDatabaseConfigured()) {
    const shell = await loadSeniorsTenantShellForLayout(tenant);
    if (!shell || !isSeniorsPlatformTemplate(shell.activeTemplateId)) {
      notFound();
    }

    snapshot = {
      tenant: shell.slug,
      academyName: shell.schoolName?.trim() || shell.platformName.trim() || "Seniors",
      ownerName: shell.ownerName.trim() || "School Admin",
      brandHex: resolveBrandHex(shell.primaryColor?.trim() || shell.brandColor || "#2563EB"),
      activeTemplateId: "seniors-platform",
      logoUrl: shell.logoUrl?.trim() || "",
    };
  }

  return <TenantRootLayout snapshot={snapshot}>{children}</TenantRootLayout>;
}
