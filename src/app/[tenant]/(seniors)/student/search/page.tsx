import { loadStudentLearnData } from "@/application/seniors/student-server";
import { searchSeniorsContent } from "@/application/seniors/search";
import { StudentSearchClient } from "@/presentation/components/templates/seniors/SeniorsRouteClients";

export default async function StudentSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { tenant } = await params;
  const { q = "" } = await searchParams;
  const { subjects } = await loadStudentLearnData(tenant);

  const items = subjects.flatMap((s) => [
    { type: "subject" as const, id: s.id, title: s.name, subtitle: "Subject", href: "student/learn", keywords: [s.name] },
    ...s.chapters.flatMap((ch) => [
      ...ch.topics.map((t) => ({
        type: "topic" as const,
        id: t.id,
        title: t.title,
        subtitle: `${s.name} › ${ch.name}`,
        href: `student/learn/${t.slug}`,
        keywords: [t.title, s.name, ch.name],
      })),
    ]),
  ]);

  const results = searchSeniorsContent(q, items);
  return <StudentSearchClient initialQuery={q} results={results} />;
}
