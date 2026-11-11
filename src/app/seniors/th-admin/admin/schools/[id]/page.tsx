import { notFound } from "next/navigation";
import { getSeniorsSchoolDetail } from "@/application/seniors/seniors-product-admin";
import { requireSuperAdminPage } from "@/infrastructure/auth/super-admin-guard";
import { SeniorsProductAdminShell } from "@/presentation/components/templates/seniors/admin/SeniorsProductAdminShell";
import {
  SuperAdminSchoolDetail,
  type SchoolDetailTab,
} from "@/presentation/components/templates/seniors/admin/SuperAdminSchoolDetail";

export const dynamic = "force-dynamic";

const TABS: SchoolDetailTab[] = ["overview", "branding", "admins", "profile", "access"];

export default async function SeniorsProductAdminSchoolPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireSuperAdminPage();
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const school = await getSeniorsSchoolDetail(id);
  if (!school) notFound();

  const initialTab = TABS.includes(tab as SchoolDetailTab) ? (tab as SchoolDetailTab) : "overview";

  return (
    <SeniorsProductAdminShell title="School">
      <SuperAdminSchoolDetail initialSchool={school} initialTab={initialTab} />
    </SeniorsProductAdminShell>
  );
}
