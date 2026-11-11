import { SeniorsPortalLayout } from "@/presentation/components/templates/seniors/shared/SeniorsPortalLayout";

export default function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SeniorsPortalLayout role="student">{children}</SeniorsPortalLayout>;
}
