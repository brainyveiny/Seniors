"use client";

import { createContext, useContext } from "react";
import type { WebsiteTemplateId } from "@/domain/entities/website";

export interface TenantServerSiteSnapshot {
  tenant: string;
  academyName: string;
  ownerName: string;
  brandHex: string;
  activeTemplateId: WebsiteTemplateId;
  logoUrl: string;
}

const TenantServerSiteContext = createContext<TenantServerSiteSnapshot | null>(
  null,
);

export function TenantServerSiteProvider({
  children,
  snapshot,
}: {
  children: React.ReactNode;
  snapshot: TenantServerSiteSnapshot | null;
}) {
  if (!snapshot) {
    return <>{children}</>;
  }

  return (
    <TenantServerSiteContext.Provider value={snapshot}>
      {children}
    </TenantServerSiteContext.Provider>
  );
}

export function useTenantServerSiteSnapshot(): TenantServerSiteSnapshot | null {
  return useContext(TenantServerSiteContext);
}
