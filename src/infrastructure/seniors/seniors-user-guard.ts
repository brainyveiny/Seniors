import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getPrismaClient } from "@/infrastructure/database/prisma";

/**
 * Returns true if a Seniors user still exists in the DB for this tenant/role.
 * Sessions are JWT-based, so a deleted user keeps a valid cookie until this
 * check runs. Portal loaders and API auth use it to hard-block removed users.
 *
 * Cached 60s so sidebar navigation does not hit DB on every click.
 */
export async function seniorsUserStillExists(
  tenantId: string,
  userId: string,
  role: string,
): Promise<boolean> {
  return unstable_cache(
    async () => {
      const prisma = getPrismaClient();
      const user = await prisma.platformUser.findFirst({
        where: { id: userId, tenantId, userType: role },
        select: { id: true },
      });
      return Boolean(user);
    },
    ["seniors-user-exists", tenantId, userId, role],
    { revalidate: 60 },
  )();
}

/** Same-request dedupe for loaders that call the check more than once. */
export const seniorsUserStillExistsCached = cache(seniorsUserStillExists);
