import Link from "next/link";
import { listPlatformAuditLog } from "@/application/seniors/seniors-product-admin";
import { requireSuperAdminPage } from "@/infrastructure/auth/super-admin-guard";
import { SeniorsProductAdminShell } from "@/presentation/components/templates/seniors/admin/SeniorsProductAdminShell";
import {
  SaCard,
  auditActionLabel,
} from "@/presentation/components/templates/seniors/admin/SuperAdminUi";
import { seniorsProductAdminPath } from "@/shared/lib/seniors-platform-urls";

export const dynamic = "force-dynamic";

export default async function SeniorsProductAdminActivityPage() {
  await requireSuperAdminPage();
  const entries = await listPlatformAuditLog({ take: 200 });

  return (
    <SeniorsProductAdminShell title="Activity log">
      <div className="mx-auto max-w-5xl">
        <SaCard
          title="Super admin activity"
          description="Every change made from this panel, including when someone opened a school's admin panel."
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-medium">When</th>
                  <th className="px-3 py-3 font-medium">Action</th>
                  <th className="px-3 py-3 font-medium">Details</th>
                  <th className="px-5 py-3 font-medium">By</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-neutral-100 align-top last:border-0">
                    <td className="whitespace-nowrap px-5 py-3 text-neutral-500">
                      {new Date(entry.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-medium text-neutral-900">
                      {auditActionLabel(entry.action)}
                    </td>
                    <td className="px-3 py-3 text-neutral-700">
                      {entry.summary}
                      {entry.tenantId ? (
                        <Link
                          href={seniorsProductAdminPath(`schools/${entry.tenantId}`)}
                          className="ml-2 text-xs text-neutral-500 hover:underline"
                        >
                          {entry.tenantSlug}
                        </Link>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-neutral-500">{entry.actorEmail}</td>
                  </tr>
                ))}
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-neutral-500">
                      No activity recorded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SaCard>
      </div>
    </SeniorsProductAdminShell>
  );
}
