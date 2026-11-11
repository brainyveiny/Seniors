import {
  loadStudentHomeworkDetail,
} from "@/application/seniors/student-server";
import { StudentHomeworkDetailClient } from "@/presentation/components/templates/seniors/student/StudentHomeworkClients";
import { notFound } from "next/navigation";

export default async function StudentHomeworkDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant, id } = await params;
  const homework = await loadStudentHomeworkDetail(tenant, id);
  if (!homework) notFound();
  return <StudentHomeworkDetailClient homework={homework} />;
}
