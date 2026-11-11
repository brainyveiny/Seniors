"use client";

import {
  TenantServerSiteProvider,
  type TenantServerSiteSnapshot,
} from "@/presentation/components/tenant/TenantServerSiteProvider";

export function TenantRootLayout({
  children,
  snapshot,
}: {
  children: React.ReactNode;
  snapshot: TenantServerSiteSnapshot | null;
}) {
  return (
    <TenantServerSiteProvider snapshot={snapshot}>
      {children}
    </TenantServerSiteProvider>
  );
}
