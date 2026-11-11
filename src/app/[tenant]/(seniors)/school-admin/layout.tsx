import { SeniorsPortalLayout } from "@/presentation/components/templates/seniors/shared/SeniorsPortalLayout";

export default function SchoolAdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SeniorsPortalLayout role="school-admin">{children}</SeniorsPortalLayout>
  );
}
