import type { SeniorsContentStatus, SeniorsContentType } from "@/domain/seniors/types";

const MANDATORY_TYPES: SeniorsContentType[] = [
  "notes",
  "practice_question",
  "model_answer",
];

export interface TopicContentCoverage {
  contentType: SeniorsContentType;
  count: number;
}

export function computeContentStatus(
  contents: TopicContentCoverage[],
  hasOverview: boolean,
): SeniorsContentStatus {
  const typesPresent = new Set(
    contents.filter((c) => c.count > 0).map((c) => c.contentType),
  );

  const mandatoryFilled = MANDATORY_TYPES.filter((t) => typesPresent.has(t)).length;
  const hasAny = typesPresent.size > 0 || hasOverview;

  if (!hasAny) return "missing";
  if (mandatoryFilled >= MANDATORY_TYPES.length && hasOverview) return "complete";
  return "in_progress";
}

export function contentStatusLabel(status: SeniorsContentStatus): string {
  switch (status) {
    case "complete":
      return "Complete";
    case "in_progress":
      return "In Progress";
    case "missing":
      return "Missing";
  }
}

export function contentStatusPercentages(
  topics: { contentStatus: SeniorsContentStatus }[],
): { complete: number; inProgress: number; missing: number } {
  if (topics.length === 0) {
    return { complete: 0, inProgress: 0, missing: 0 };
  }
  const complete = topics.filter((t) => t.contentStatus === "complete").length;
  const inProgress = topics.filter((t) => t.contentStatus === "in_progress").length;
  const missing = topics.filter((t) => t.contentStatus === "missing").length;
  const total = topics.length;
  return {
    complete: Math.round((complete / total) * 100),
    inProgress: Math.round((inProgress / total) * 100),
    missing: Math.round((missing / total) * 100),
  };
}
