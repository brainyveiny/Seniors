import type { TopicTabId } from "@/presentation/components/templates/seniors/shared/seniors-nav";

const WEIGHTS = {
  overview: 25,
  notes: 20,
  practice: 20,
  revision: 15,
  quiz: 20,
} as const;

export type TopicProgressMilestone = { tab: TopicTabId; weight: number };

export function buildTopicProgressMilestones(input: {
  hasNotes: boolean;
  hasPractice: boolean;
  hasRevision: boolean;
  hasQuiz: boolean;
}): TopicProgressMilestone[] {
  const milestones: TopicProgressMilestone[] = [
    { tab: "overview", weight: WEIGHTS.overview },
  ];
  if (input.hasNotes) milestones.push({ tab: "notes", weight: WEIGHTS.notes });
  if (input.hasPractice) milestones.push({ tab: "practice", weight: WEIGHTS.practice });
  if (input.hasRevision) milestones.push({ tab: "revision", weight: WEIGHTS.revision });
  if (input.hasQuiz) milestones.push({ tab: "quiz", weight: WEIGHTS.quiz });
  return milestones;
}

export function computeTopicProgressPercent(
  visitedTabs: ReadonlySet<TopicTabId>,
  milestones: TopicProgressMilestone[],
  options?: { quizSubmitted?: boolean },
): number {
  if (milestones.length === 0) return 0;

  const totalWeight = milestones.reduce((sum, milestone) => sum + milestone.weight, 0);
  let earned = 0;

  for (const milestone of milestones) {
    if (milestone.tab === "quiz") {
      if (options?.quizSubmitted) {
        earned += milestone.weight;
      } else if (visitedTabs.has("quiz")) {
        earned += Math.round(milestone.weight * 0.35);
      }
      continue;
    }
    if (visitedTabs.has(milestone.tab)) {
      earned += milestone.weight;
    }
  }

  return Math.min(100, Math.max(0, Math.round((earned / totalWeight) * 100)));
}
