import { listSuperAdmins } from "@/application/seniors/seniors-product-admin";
import { requireSuperAdminPage } from "@/infrastructure/auth/super-admin-guard";
import { SeniorsProductAdminShell } from "@/presentation/components/templates/seniors/admin/SeniorsProductAdminShell";
import { SuperAdminTeam } from "@/presentation/components/templates/seniors/admin/SuperAdminTeam";

export const dynamic = "force-dynamic";

export default async function SeniorsProductAdminTeamPage() {
  const session = await requireSuperAdminPage();
  const admins = await listSuperAdmins();
  return (
    <SeniorsProductAdminShell title="Super admins">
      <SuperAdminTeam initialAdmins={admins} currentAdminId={session.userId} />
    </SeniorsProductAdminShell>
  );
}
