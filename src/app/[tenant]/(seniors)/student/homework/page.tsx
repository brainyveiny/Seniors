import { loadStudentHomeworkList } from "@/application/seniors/student-server";
import { StudentHomeworkListClient } from "@/presentation/components/templates/seniors/student/StudentHomeworkClients";

export default async function StudentHomeworkPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const items = await loadStudentHomeworkList(tenant);
  return <StudentHomeworkListClient items={items} />;
}
