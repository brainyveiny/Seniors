import { unstable_cache } from "next/cache";
import { getSeniorsTenantShell } from "@/infrastructure/database/tenant-repository";
import { isDatabaseConfigured } from "@/infrastructure/database/prisma";

const REVALIDATE_SECONDS = 60;

export function seniorsTenantShellCacheTag(slug: string): string {
  return `seniors-tenant-shell-${slug}`;
}

/** Cached light seniors tenant shell for layout + template gate. */
export async function loadSeniorsTenantShellForLayout(tenantSlug: string) {
  if (!isDatabaseConfigured()) return null;

  const read = unstable_cache(
    async () => getSeniorsTenantShell(tenantSlug),
    ["seniors-tenant-shell", tenantSlug],
    {
      revalidate: REVALIDATE_SECONDS,
      tags: [seniorsTenantShellCacheTag(tenantSlug)],
    },
  );

  return read();
}
