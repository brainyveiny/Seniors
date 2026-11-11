import { SeniorsPortalLayout } from "@/presentation/components/templates/seniors/shared/SeniorsPortalLayout";

export default function ParentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SeniorsPortalLayout role="parent">{children}</SeniorsPortalLayout>;
}
