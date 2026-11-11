"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  SeniorsPortalLoadingGate,
  useSeniorsCachedJson,
} from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";
import type { CatalogType } from "@/infrastructure/seniors/seniors-parent-services";
import {
  ParentCatalogPage,
  ParentFeesPage,
  ParentLeavePage,
  ParentTransportPage,
} from "@/presentation/components/templates/seniors/parent/ParentServicesPages";

export type ParentServiceView =
  | "leave"
  | "fees"
  | "transport"
  | "hobby-club"
  | "books"
  | "elective"
  | "uniform";

const CATALOG_VIEW_TYPE: Partial<Record<ParentServiceView, CatalogType>> = {
  "hobby-club": "hobby_club",
  books: "books_stationery",
  elective: "language_elective",
  uniform: "uniform",
};

export function ParentServicesRoute({ view }: { view: ParentServiceView }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const site = useSeniorsSite();
  const tenant =
    (typeof params.tenant === "string" ? params.tenant : "") || site.tenant;
  const child = searchParams.get("child")?.trim() ?? "";
  const url = tenant
    ? `/api/tenants/${encodeURIComponent(tenant)}/seniors/parent/page?view=${encodeURIComponent(view)}${
        child ? `&child=${encodeURIComponent(child)}` : ""
      }`
    : null;
  const { data, loading, error } = useSeniorsCachedJson<Record<string, unknown>>(url);

  const catalogType = CATALOG_VIEW_TYPE[view];

  return (
    <SeniorsPortalLoadingGate loading={loading} hasData={Boolean(data)} error={error}>
      {data && view === "leave" ? <ParentLeavePage ctx={site} data={data as never} /> : null}
      {data && view === "fees" ? <ParentFeesPage ctx={site} data={data as never} /> : null}
      {data && view === "transport" ? <ParentTransportPage ctx={site} data={data as never} /> : null}
      {data && catalogType ? (
        <ParentCatalogPage ctx={site} data={data as never} catalogType={catalogType} />
      ) : null}
    </SeniorsPortalLoadingGate>
  );
}
