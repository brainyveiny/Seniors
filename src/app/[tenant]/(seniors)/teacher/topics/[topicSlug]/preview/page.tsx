import { notFound } from "next/navigation";
import { loadTeacherTopicPreviewData } from "@/application/seniors/role-server";
import { TeacherTopicPreviewClient } from "@/presentation/components/templates/seniors/teacher/TeacherTopicPreviewClient";

export default async function TeacherTopicPreviewPage({
  params,
}: {
  params: Promise<{ tenant: string; topicSlug: string }>;
}) {
  const { tenant, topicSlug } = await params;
  const topic = await loadTeacherTopicPreviewData(tenant, topicSlug);
  if (!topic) notFound();
  return <TeacherTopicPreviewClient topic={topic} />;
}
