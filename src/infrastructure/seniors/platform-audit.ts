import type { Prisma } from "@prisma/client";
import type { SuperAdminSession } from "@/domain/entities/super-admin";
import { getPrismaClient } from "@/infrastructure/database/prisma";

export type PlatformAuditAction =
  | "school.create"
  | "school.update"
  | "school.branding"
  | "school.suspend"
  | "school.activate"
  | "school.delete"
  | "school.impersonate"
  | "school-admin.create"
  | "school-admin.update"
  | "school-admin.reset-password"
  | "school-admin.delete"
  | "broadcast.send"
  | "super-admin.create"
  | "super-admin.update"
  | "super-admin.password";

export async function logPlatformAction(
  actor: SuperAdminSession,
  action: PlatformAuditAction,
  input: {
    tenantId?: string | null;
    tenantSlug?: string;
    summary: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  try {
    await getPrismaClient().platformAuditLog.create({
      data: {
        actorId: actor.userId,
        actorEmail: actor.email,
        action,
        tenantId: input.tenantId ?? null,
        tenantSlug: input.tenantSlug ?? "",
        summary: input.summary,
        metadata: input.metadata ?? {},
      },
    });
  } catch (error) {
    console.error("[platform-audit]", error instanceof Error ? error.message : error);
  }
}
