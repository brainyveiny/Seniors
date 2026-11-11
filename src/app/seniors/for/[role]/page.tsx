import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadSeniorsAudiencePageContent } from "@/application/seniors/seniors-platform-cms";
import { SeniorsAudiencePage } from "@/presentation/components/templates/seniors/SeniorsAudiencePage";
import { type SeniorsAudienceId } from "@/shared/config/seniors-audiences";
import { buildPageMetadata } from "@/shared/lib/seo-metadata";

const IDS = ["school", "teacher", "student", "parent"] as const;

export function generateStaticParams() {
  return IDS.map((role) => ({ role }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ role: string }>;
}): Promise<Metadata> {
  const { role } = await params;
  if (!IDS.includes(role as SeniorsAudienceId)) return {};
  const page = await loadSeniorsAudiencePageContent(role as SeniorsAudienceId);
  return buildPageMetadata({
    title: `${page.navLabel} on Seniors`,
    description: page.subheadline,
    path: `/seniors/for/${role}`,
  });
}

export default async function SeniorsForRolePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!IDS.includes(role as SeniorsAudienceId)) notFound();
  const content = await loadSeniorsAudiencePageContent(role as SeniorsAudienceId);
  return (
    <SeniorsAudiencePage
      audienceId={role as SeniorsAudienceId}
      content={content}
    />
  );
}
