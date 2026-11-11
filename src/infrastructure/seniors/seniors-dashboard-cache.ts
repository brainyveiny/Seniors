import { revalidateTag } from "next/cache";

/** Shared tag for every Seniors portal dashboard / subject / scope cache. */
export function seniorsDashboardsTag(tenantId: string): string {
  return `seniors-dashboards-${tenantId}`;
}

export function revalidateSeniorsDashboards(tenantId: string): void {
  revalidateTag(seniorsDashboardsTag(tenantId), { expire: 0 });
}
