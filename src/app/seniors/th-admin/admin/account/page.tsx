import { requireSuperAdminPage } from "@/infrastructure/auth/super-admin-guard";
import { SeniorsProductAdminShell } from "@/presentation/components/templates/seniors/admin/SeniorsProductAdminShell";
import { SuperAdminAccount } from "@/presentation/components/templates/seniors/admin/SuperAdminAccount";

export const dynamic = "force-dynamic";

export default async function SeniorsProductAdminAccountPage() {
  const session = await requireSuperAdminPage();
  return (
    <SeniorsProductAdminShell title="My account">
      <SuperAdminAccount fullName={session.fullName} email={session.email} />
    </SeniorsProductAdminShell>
  );
}
