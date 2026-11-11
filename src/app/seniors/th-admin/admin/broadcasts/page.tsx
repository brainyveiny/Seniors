import { listPlatformBroadcasts, listSeniorsSchools } from "@/application/seniors/seniors-product-admin";
import { requireSuperAdminPage } from "@/infrastructure/auth/super-admin-guard";
import { SeniorsProductAdminShell } from "@/presentation/components/templates/seniors/admin/SeniorsProductAdminShell";
import { SuperAdminBroadcasts } from "@/presentation/components/templates/seniors/admin/SuperAdminBroadcasts";

export const dynamic = "force-dynamic";

export default async function SeniorsProductAdminBroadcastsPage() {
  await requireSuperAdminPage();
  const [schools, broadcasts] = await Promise.all([listSeniorsSchools(), listPlatformBroadcasts()]);

  return (
    <SeniorsProductAdminShell title="Broadcasts">
      <SuperAdminBroadcasts
        schools={schools
          .filter((s) => s.status === "active")
          .map((s) => ({ id: s.id, name: s.name, slug: s.slug }))}
        initialBroadcasts={broadcasts}
      />
    </SeniorsProductAdminShell>
  );
}
