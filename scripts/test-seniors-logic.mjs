/**
 * Unit tests for Seniors Continue Learning priority and content status.
 * Run: npm run test:seniors
 */
import assert from "node:assert/strict";

function resolveContinueLearning(ctx) {
  const overdue = ctx.homework.find((h) => h.status === "overdue");
  if (overdue) return { type: "overdue-homework" };

  const exam = ctx.exams.find((e) => e.daysLeft >= 0 && e.daysLeft <= 7);
  if (exam) return { type: "exam-revision" };

  const inProgress = ctx.topics.find((t) => t.progressPercent > 0 && t.progressPercent < 100);
  if (inProgress) return { type: "resume-topic" };

  const next = ctx.topics.find((t) => t.progressPercent < 100);
  if (next) return { type: "next-topic" };

  return { type: "all-caught-up" };
}

function computeContentStatus(contents, hasOverview) {
  const typesPresent = new Set(contents.filter((c) => c.count > 0).map((c) => c.contentType));
  const mandatory = ["notes", "practice_question", "model_answer"];
  const mandatoryFilled = mandatory.filter((t) => typesPresent.has(t)).length;
  const hasAny = typesPresent.size > 0 || hasOverview;
  if (!hasAny) return "missing";
  if (mandatoryFilled >= mandatory.length && hasOverview) return "complete";
  return "in_progress";
}

const baseCtx = {
  homework: [],
  exams: [],
  topics: [{ progressPercent: 0 }],
};

assert.equal(
  resolveContinueLearning({
    ...baseCtx,
    homework: [{ status: "overdue" }],
    exams: [{ daysLeft: 3 }],
    topics: [{ progressPercent: 50 }],
  }).type,
  "overdue-homework",
);

assert.equal(
  resolveContinueLearning({
    ...baseCtx,
    exams: [{ daysLeft: 5 }],
    topics: [{ progressPercent: 50 }],
  }).type,
  "exam-revision",
);

assert.equal(
  resolveContinueLearning({ ...baseCtx, topics: [{ progressPercent: 40 }] }).type,
  "resume-topic",
);

assert.equal(resolveContinueLearning(baseCtx).type, "next-topic");

assert.equal(
  resolveContinueLearning({
    ...baseCtx,
    topics: [{ progressPercent: 100 }, { progressPercent: 100 }],
  }).type,
  "all-caught-up",
);

assert.equal(
  computeContentStatus(
    [
      { contentType: "notes", count: 1 },
      { contentType: "practice_question", count: 1 },
      { contentType: "model_answer", count: 1 },
    ],
    true,
  ),
  "complete",
);

console.log("All Seniors logic tests passed.");
