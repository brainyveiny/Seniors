import { SeniorsPortalLayout } from "@/presentation/components/templates/seniors/shared/SeniorsPortalLayout";

export default function TeacherPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SeniorsPortalLayout role="teacher">{children}</SeniorsPortalLayout>;
}
