import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadSeniorsTenantShellForLayout } from "@/application/tenant/tenant-server";
import { isSeniorsPlatformTemplate } from "@/application/tenant/seniors-tenant";
import { resolveBrandHex } from "@/infrastructure/data/brand-colors";
import { isDatabaseConfigured } from "@/infrastructure/database/prisma";
import { SeniorsSchoolSuspended } from "@/presentation/components/templates/seniors/SeniorsSchoolSuspended";
import { TenantRootLayout } from "@/presentation/components/tenant/TenantRootLayout";
import type { TenantServerSiteSnapshot } from "@/presentation/components/tenant/TenantServerSiteProvider";
import { resolveAcademyImageUrl } from "@/shared/lib/academy-media-url";

type TenantLayoutParams = { params: Promise<{ tenant: string }> };

export async function generateMetadata({ params }: TenantLayoutParams): Promise<Metadata> {
  if (!isDatabaseConfigured()) return {};
  const { tenant } = await params;
  const shell = await loadSeniorsTenantShellForLayout(tenant);
  if (!shell) return {};
  const name = shell.schoolName?.trim() || shell.platformName.trim() || "Seniors";
  const logo = resolveAcademyImageUrl(shell.logoUrl);
  return {
    title: { default: name, template: `%s | ${name}` },
    ...(shell.tagline?.trim() ? { description: shell.tagline.trim() } : {}),
    ...(logo ? { icons: { icon: logo, apple: logo } } : {}),
  };
}

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutParams & { children: React.ReactNode }) {
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
      tagline: shell.tagline?.trim() || "",
    };

    if (shell.status === "suspended") {
      return (
        <SeniorsSchoolSuspended
          schoolName={snapshot.academyName}
          logoUrl={snapshot.logoUrl}
          brandHex={snapshot.brandHex}
          reason={shell.suspendedReason}
        />
      );
    }
  }

  return <TenantRootLayout snapshot={snapshot}>{children}</TenantRootLayout>;
}
