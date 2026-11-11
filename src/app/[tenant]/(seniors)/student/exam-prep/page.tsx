"use client";

import { useParams } from "next/navigation";
import { StudentExamPrepClient } from "@/presentation/components/templates/seniors/SeniorsRouteClients";
import type { SeniorsExamItem, StudentPracticeTopic } from "@/domain/seniors/types";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  SeniorsPortalLoadingGate,
  useSeniorsCachedJson,
} from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";

type ExamPrepPayload = {
  exams: SeniorsExamItem[];
  weakTopics?: StudentPracticeTopic[];
  practiceTopics?: StudentPracticeTopic[];
  papersHref?: string;
  mockHref?: string;
};

export default function StudentExamPrepPage() {
  const params = useParams();
  const site = useSeniorsSite();
  const tenant =
    (typeof params.tenant === "string" ? params.tenant : "") || site.tenant;
  const url = tenant
    ? `/api/tenants/${encodeURIComponent(tenant)}/seniors/student/page?view=exam-prep`
    : null;
  const { data, loading, error } = useSeniorsCachedJson<ExamPrepPayload>(url);

  return (
    <SeniorsPortalLoadingGate loading={loading} hasData={Boolean(data)} error={error}>
      {data ? (
        <StudentExamPrepClient
          exams={data.exams}
          weakTopics={data.weakTopics}
          practiceTopics={data.practiceTopics}
          papersHref={data.papersHref}
          mockHref={data.mockHref}
        />
      ) : null}
    </SeniorsPortalLoadingGate>
  );
}
