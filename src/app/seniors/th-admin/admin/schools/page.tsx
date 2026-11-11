import { listSeniorsSchools } from "@/application/seniors/seniors-product-admin";
import { requireSuperAdminPage } from "@/infrastructure/auth/super-admin-guard";
import { SeniorsAddSchoolForm } from "@/presentation/components/templates/seniors/admin/SeniorsAddSchoolForm";
import { SeniorsProductAdminShell } from "@/presentation/components/templates/seniors/admin/SeniorsProductAdminShell";
import { SuperAdminSchoolsTable } from "@/presentation/components/templates/seniors/admin/SuperAdminSchoolsTable";

export const dynamic = "force-dynamic";

export default async function SeniorsProductAdminSchoolsPage() {
  await requireSuperAdminPage();
  const schools = await listSeniorsSchools();

  return (
    <SeniorsProductAdminShell title="Schools">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm text-neutral-600">
            Every school on Seniors. Open a school to manage its branding, admins and access.
          </p>
          <SeniorsAddSchoolForm />
        </div>
        <SuperAdminSchoolsTable schools={schools} />
      </div>
    </SeniorsProductAdminShell>
  );
}
