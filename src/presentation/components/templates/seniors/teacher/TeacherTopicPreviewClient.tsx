"use client";

import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import { SeniorsCard } from "@/presentation/components/templates/seniors/shared/SeniorsUi";
import {
  StudentTopicPage,
  type TopicPageData,
} from "@/presentation/components/templates/seniors/student/StudentTopicPage";

export function TeacherTopicPreviewClient({ topic }: { topic: TopicPageData }) {
  const ctx = useSeniorsSite();

  return (
    <>
      <SeniorsCard className="mb-4 border-[var(--sp-brand-border)] bg-[var(--sp-brand-soft)] p-4">
        <p className="text-sm font-semibold text-[var(--sp-brand-text)]">Draft Preview</p>
        <p className="mt-1 text-sm text-[var(--sp-brand-text)]">
          Yeh screen student page jaise render hoti hai, lekin abhi draft data dikha rahi hai.
          Publish karne ke baad hi students ko live update milega.
        </p>
      </SeniorsCard>
      <StudentTopicPage ctx={ctx} topic={topic} mode="teacher-preview" />
    </>
  );
}
