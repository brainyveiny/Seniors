import { getPrismaClient } from "@/infrastructure/database/prisma";
import { getActiveAcademicYearId } from "@/infrastructure/seniors/seniors-repository";
import {
  completeSeniorsChat,
  isSeniorsLlmConfigured,
  type LlmChatMessage,
} from "@/infrastructure/ai/seniors-llm";

const MAX_CONTEXT_CHARS = 14000;
const MAX_QUESTION_CHARS = 2000;
const HISTORY_LIMIT = 8;

export type SeniorsAiSource = {
  topicTitle: string;
  label: string;
};

export type SeniorsAiChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: SeniorsAiSource[];
  createdAt: string;
};

export type SeniorsAiThreadSummary = {
  id: string;
  title: string;
  topicId: string | null;
  topicTitle: string | null;
  updatedAt: string;
};

export type AskSeniorsDoubtInput = {
  tenantId: string;
  studentId: string;
  question: string;
  topicId?: string;
  topicSlug?: string;
  threadId?: string;
};

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trim()}…`;
}

function tokenize(query: string) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9\u0900-\u097f]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);
}

type LoadedTopicContext = {
  topicId: string;
  topicTitle: string;
  subjectName: string;
  chapterName: string;
  className: string;
  schoolName: string;
  text: string;
  sources: SeniorsAiSource[];
  hasNotes: boolean;
};

async function loadStudentClassId(tenantId: string, studentId: string) {
  const prisma = getPrismaClient();
  const profile = await prisma.seniorsStudentProfile.findFirst({
    where: { tenantId, studentId },
    select: { classId: true },
  });
  return profile?.classId ?? null;
}

async function loadSchoolName(tenantId: string) {
  const prisma = getPrismaClient();
  const [settings, tenant] = await Promise.all([
    prisma.seniorsSchoolSettings.findUnique({
      where: { tenantId },
      select: { schoolName: true, markingScheme: true, answerFormat: true },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { platformName: true },
    }),
  ]);
  return {
    schoolName: settings?.schoolName?.trim() || tenant?.platformName || "your school",
    schoolMarkingScheme: settings?.markingScheme?.trim() || "",
    schoolAnswerFormat: settings?.answerFormat?.trim() || "",
  };
}

function buildTopicText(input: {
  schoolName: string;
  className: string;
  subjectName: string;
  chapterName: string;
  title: string;
  learningObjective: string;
  teacherExplanation: string;
  keywords: string[];
  markingScheme: string;
  answerFormat: string;
  revisionChecklist: string[];
  schoolMarkingScheme: string;
  schoolAnswerFormat: string;
  contents: { contentType: string; title: string; body: string }[];
}): { text: string; sources: SeniorsAiSource[]; hasNotes: boolean } {
  const sources: SeniorsAiSource[] = [];
  const parts: string[] = [];

  parts.push(`School: ${input.schoolName}`);
  parts.push(`Class: ${input.className}`);
  parts.push(`Subject: ${input.subjectName}`);
  parts.push(`Chapter: ${input.chapterName}`);
  parts.push(`Topic: ${input.title}`);

  if (input.learningObjective.trim()) {
    parts.push(`Learning objective:\n${stripHtml(input.learningObjective)}`);
  }
  if (input.teacherExplanation.trim()) {
    parts.push(`Teacher explanation (how this school teaches it):\n${stripHtml(input.teacherExplanation)}`);
    sources.push({ topicTitle: input.title, label: "Teacher explanation" });
  }
  if (input.keywords.length) {
    parts.push(`Keywords: ${input.keywords.join(", ")}`);
  }

  const marking = input.markingScheme.trim() || input.schoolMarkingScheme;
  const answerFormat = input.answerFormat.trim() || input.schoolAnswerFormat;
  if (marking) {
    parts.push(`Marking scheme:\n${stripHtml(marking)}`);
    sources.push({ topicTitle: input.title, label: "Marking scheme" });
  }
  if (answerFormat) {
    parts.push(`Answer format:\n${stripHtml(answerFormat)}`);
    sources.push({ topicTitle: input.title, label: "Answer format" });
  }
  if (input.revisionChecklist.length) {
    parts.push(`Revision checklist:\n- ${input.revisionChecklist.map((item) => stripHtml(item)).join("\n- ")}`);
    sources.push({ topicTitle: input.title, label: "Revision checklist" });
  }

  let hasNotes = Boolean(input.teacherExplanation.trim());
  for (const content of input.contents) {
    const body = stripHtml(content.body);
    if (!body) continue;
    hasNotes = true;
    const label = content.title.trim() || content.contentType.replace(/_/g, " ");
    parts.push(`Teacher ${content.contentType.replace(/_/g, " ")} -${label}:\n${body}`);
    sources.push({ topicTitle: input.title, label });
  }

  return { text: parts.join("\n\n"), sources, hasNotes };
}

async function loadTopicContextForStudent(input: {
  tenantId: string;
  studentId: string;
  topicId?: string;
  topicSlug?: string;
}): Promise<LoadedTopicContext | null> {
  const prisma = getPrismaClient();
  const academicYearId = await getActiveAcademicYearId(input.tenantId);
  if (!academicYearId) return null;
  const classId = await loadStudentClassId(input.tenantId, input.studentId);
  if (!classId) return null;
  const school = await loadSchoolName(input.tenantId);

  const topic = await prisma.seniorsTopic.findFirst({
    where: {
      tenantId: input.tenantId,
      academicYearId,
      ...(input.topicId ? { id: input.topicId } : {}),
      ...(input.topicSlug ? { slug: input.topicSlug } : {}),
    },
    include: {
      chapter: { include: { subject: { include: { class: true } } } },
      contents: {
        where: { status: "published" },
        orderBy: { sortOrder: "asc" },
        select: { contentType: true, title: true, body: true },
      },
    },
  });
  if (!topic) return null;
  if (topic.chapter.subject.classId !== classId) return null;

  const built = buildTopicText({
    schoolName: school.schoolName,
    className: topic.chapter.subject.class.name,
    subjectName: topic.chapter.subject.name,
    chapterName: topic.chapter.name,
    title: topic.title,
    learningObjective: topic.learningObjective,
    teacherExplanation: topic.teacherExplanation,
    keywords: topic.keywords,
    markingScheme: topic.markingScheme,
    answerFormat: topic.answerFormat,
    revisionChecklist: topic.revisionChecklist,
    schoolMarkingScheme: school.schoolMarkingScheme,
    schoolAnswerFormat: school.schoolAnswerFormat,
    contents: topic.contents,
  });

  return {
    topicId: topic.id,
    topicTitle: topic.title,
    subjectName: topic.chapter.subject.name,
    chapterName: topic.chapter.name,
    className: topic.chapter.subject.class.name,
    schoolName: school.schoolName,
    text: built.text,
    sources: built.sources,
    hasNotes: built.hasNotes,
  };
}

async function searchClassTopicContexts(input: {
  tenantId: string;
  studentId: string;
  question: string;
  limit?: number;
}): Promise<LoadedTopicContext[]> {
  const prisma = getPrismaClient();
  const academicYearId = await getActiveAcademicYearId(input.tenantId);
  if (!academicYearId) return [];
  const classId = await loadStudentClassId(input.tenantId, input.studentId);
  if (!classId) return [];
  const school = await loadSchoolName(input.tenantId);
  const tokens = tokenize(input.question);

  const topics = await prisma.seniorsTopic.findMany({
    where: {
      tenantId: input.tenantId,
      academicYearId,
      chapter: { subject: { classId } },
    },
    include: {
      chapter: { include: { subject: { include: { class: true } } } },
      contents: {
        where: { status: "published" },
        orderBy: { sortOrder: "asc" },
        select: { contentType: true, title: true, body: true },
      },
    },
  });

  const ranked = topics
    .map((topic) => {
      const built = buildTopicText({
        schoolName: school.schoolName,
        className: topic.chapter.subject.class.name,
        subjectName: topic.chapter.subject.name,
        chapterName: topic.chapter.name,
        title: topic.title,
        learningObjective: topic.learningObjective,
        teacherExplanation: topic.teacherExplanation,
        keywords: topic.keywords,
        markingScheme: topic.markingScheme,
        answerFormat: topic.answerFormat,
        revisionChecklist: topic.revisionChecklist,
        schoolMarkingScheme: school.schoolMarkingScheme,
        schoolAnswerFormat: school.schoolAnswerFormat,
        contents: topic.contents,
      });
      if (!built.hasNotes) return null;
      const hay = built.text.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (topic.title.toLowerCase().includes(token)) score += 6;
        if (topic.keywords.some((k) => k.toLowerCase().includes(token))) score += 4;
        if (hay.includes(token)) score += 2;
      }
      return {
        score,
        context: {
          topicId: topic.id,
          topicTitle: topic.title,
          subjectName: topic.chapter.subject.name,
          chapterName: topic.chapter.name,
          className: topic.chapter.subject.class.name,
          schoolName: school.schoolName,
          text: built.text,
          sources: built.sources,
          hasNotes: built.hasNotes,
        } satisfies LoadedTopicContext,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => b.score - a.score);

  const withHits = ranked.filter((row) => row.score > 0).slice(0, input.limit ?? 3);
  return withHits.map((row) => row.context);
}

function systemPrompt(schoolName: string, scopedTopic?: string) {
  return [
    `You are Ask a Doubt for ${schoolName} -a school-grounded academic tutor on Seniors.`,
    "CRITICAL: Use ONLY the teacher materials below (Topic Studio explanation, notes, keywords, marking scheme, answer format, revision checklist).",
    "NEVER use the internet, NCERT, YouTube, Wikipedia, general textbooks, or your own outside knowledge. If the materials do not contain the answer, you must say so -do not fill gaps from anywhere else.",
    "Exam scoring: mirror the teacher's wording, definitions, steps, examples, and answer format exactly as written in the materials. If the school method differs from a generic method, always follow the school.",
    "Language: write in English only. Use the same terminology and phrasing as the teacher materials.",
    "Pedagogy: be a tutor, not an answer dump. Teach the school method, then let the student try. For full homework dumps, explain one worked pattern from the notes -do not complete the entire assignment.",
    "Structure every answer with these exact headings on their own line. Do not use --- or *** dividers.",
    "## In brief",
    "## As your school teaches it",
    "## How to write it   (omit if marking scheme / answer format is not in the notes)",
    "## Check",
    "If the question, sub-topic, or question type is NOT covered in the materials, respond under ## In brief with a clear line such as: \"This topic is not covered in your school's published notes.\" Name the closest topic from the materials if helpful, then under ## What to do next direct them to Notes, Revision, or their teacher. Do not guess or invent content.",
    "Tone: calm, precise, exam-serious -like a good school teacher. No emojis, no slang, no filler.",
    "Student-friendly markdown only: short paragraphs, '- ' bullets (not *), '1. ' numbered steps, **bold** for key terms.",
    "Formulas: simple molecules as CO₂, H₂O, O₂, C₆H₁₂O₆. One equation per $$...$$ block using KaTeX, e.g. $$6CO_2 + 6H_2O \\rightarrow C_6H_{12}O_6 + 6O_2$$. Inline math as $CO_2$. Do not wrap every symbol in \\text{}. Do not dump raw LaTeX outside $...$.",
    "Keep each section short enough to read on a phone.",
    scopedTopic
      ? `The student is on topic: ${scopedTopic}. Answer only from this topic's materials. If their doubt is outside this topic's notes, say that sub-topic is not present in these notes and point them to the right topic or their teacher.`
      : "If no published topic in the materials covers this doubt, say clearly that the topic is not present in the school's notes.",
  ]
    .filter(Boolean)
    .join(" ");
}

function noNotesAnswer(topicTitle?: string) {
  if (topicTitle) {
    return [
      `## In brief`,
      `Your teacher has not published Topic Studio notes for “${topicTitle}” yet.`,
      ``,
      `## What to do next`,
      `Open **Notes** or **Revision** after they publish, or ask them in class.`,
      ``,
      `Ask a Doubt only uses your school's published teaching materials -it will not invent a generic syllabus.`,
    ].join("\n");
  }
  return [
    `## In brief`,
    `This doubt is not covered in your school's published teacher notes yet.`,
    ``,
    `## What to do next`,
    `Open the topic in **Learn** after your teacher publishes notes, or ask them in class.`,
  ].join("\n");
}

function topicNotInNotesAnswer(question: string) {
  const clipped = clip(question, 120);
  return [
    `## In brief`,
    `The topic related to “${clipped}” is not covered in your school's published teacher notes.`,
    ``,
    `## What to do next`,
    `- Check the related subject or chapter in **Learn** -the notes may be published under a different topic name.`,
    `- If the topic is not in your notes, ask your teacher.`,
    `- Ask a Doubt does not search the internet -it answers only from your teacher's published notes.`,
  ].join("\n");
}

type AiThreadRow = {
  id: string;
  title: string;
  topicId: string | null;
  updatedAt: Date;
  topicTitle?: string | null;
};

type AiMessageRow = {
  id: string;
  role: string;
  content: string;
  sources: unknown;
  createdAt: Date;
};

function newAiId() {
  return crypto.randomUUID();
}

function parseSources(value: unknown): SeniorsAiSource[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is SeniorsAiSource =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as SeniorsAiSource).topicTitle === "string" &&
      typeof (item as SeniorsAiSource).label === "string",
  );
}

async function insertAiMessage(input: {
  threadId: string;
  role: "user" | "assistant";
  content: string;
  sources?: SeniorsAiSource[];
}) {
  const prisma = getPrismaClient();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "SeniorsAiMessage" (id, "threadId", role, content, sources, "createdAt")
     VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
    newAiId(),
    input.threadId,
    input.role,
    input.content,
    JSON.stringify(input.sources ?? []),
  );
}

async function touchAiThread(threadId: string, topicId?: string | null) {
  const prisma = getPrismaClient();
  if (topicId) {
    await prisma.$executeRaw`
      UPDATE "SeniorsAiThread"
      SET "updatedAt" = NOW(), "topicId" = ${topicId}
      WHERE id = ${threadId}
    `;
    return;
  }
  await prisma.$executeRaw`
    UPDATE "SeniorsAiThread" SET "updatedAt" = NOW() WHERE id = ${threadId}
  `;
}

export async function listSeniorsAiThreads(
  tenantId: string,
  studentId: string,
): Promise<SeniorsAiThreadSummary[]> {
  const prisma = getPrismaClient();
  const threads = await prisma.$queryRaw<AiThreadRow[]>`
    SELECT
      t.id,
      t.title,
      t."topicId",
      t."updatedAt",
      tp.title AS "topicTitle"
    FROM "SeniorsAiThread" t
    LEFT JOIN "SeniorsTopic" tp ON tp.id = t."topicId"
    WHERE t."tenantId" = ${tenantId}
      AND t."studentId" = ${studentId}
    ORDER BY t."updatedAt" DESC
    LIMIT 30
  `;
  return threads.map((thread) => ({
    id: thread.id,
    title: thread.title || "New doubt",
    topicId: thread.topicId,
    topicTitle: thread.topicTitle ?? null,
    updatedAt: new Date(thread.updatedAt).toISOString(),
  }));
}

export async function deleteSeniorsAiThread(
  tenantId: string,
  studentId: string,
  threadId: string,
): Promise<boolean> {
  const prisma = getPrismaClient();
  const result = await prisma.seniorsAiThread.deleteMany({
    where: { id: threadId, tenantId, studentId },
  });
  return result.count > 0;
}

export async function loadSeniorsAiThread(
  tenantId: string,
  studentId: string,
  input: { threadId?: string; topicId?: string },
): Promise<{ threadId: string; title: string; topicId: string | null; messages: SeniorsAiChatTurn[] } | null> {
  if (!input.threadId && !input.topicId) return null;
  const prisma = getPrismaClient();
  const threads = input.threadId
    ? await prisma.$queryRaw<AiThreadRow[]>`
        SELECT id, title, "topicId", "updatedAt"
        FROM "SeniorsAiThread"
        WHERE id = ${input.threadId}
          AND "tenantId" = ${tenantId}
          AND "studentId" = ${studentId}
        LIMIT 1
      `
    : await prisma.$queryRaw<AiThreadRow[]>`
        SELECT id, title, "topicId", "updatedAt"
        FROM "SeniorsAiThread"
        WHERE "tenantId" = ${tenantId}
          AND "studentId" = ${studentId}
          AND "topicId" = ${input.topicId!}
        ORDER BY "updatedAt" DESC
        LIMIT 1
      `;
  const thread = threads[0];
  if (!thread) return null;
  const messages = await prisma.$queryRaw<AiMessageRow[]>`
    SELECT id, role, content, sources, "createdAt"
    FROM "SeniorsAiMessage"
    WHERE "threadId" = ${thread.id}
    ORDER BY "createdAt" ASC
  `;
  return {
    threadId: thread.id,
    title: thread.title,
    topicId: thread.topicId,
    messages: messages.map((message) => ({
      id: message.id,
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
      sources: parseSources(message.sources),
      createdAt: new Date(message.createdAt).toISOString(),
    })),
  };
}

export async function askSeniorsDoubt(input: AskSeniorsDoubtInput) {
  const question = input.question.trim().slice(0, MAX_QUESTION_CHARS);
  if (question.length < 3) {
    throw new Error("Ask a clearer doubt -at least a few words.");
  }

  const prisma = getPrismaClient();
  let scoped: LoadedTopicContext | null = null;
  if (input.topicId || input.topicSlug) {
    scoped = await loadTopicContextForStudent({
      tenantId: input.tenantId,
      studentId: input.studentId,
      topicId: input.topicId,
      topicSlug: input.topicSlug,
    });
    if (!scoped) {
      throw new Error("Topic not found for your class.");
    }
  }

  const searched = scoped ? [] : await searchClassTopicContexts(input);
  const contexts = scoped ? [scoped] : searched;
  const hasNotes = contexts.some((ctx) => ctx.hasNotes);
  const topicFoundInNotes = Boolean(scoped || searched.length > 0);

  const existing = await loadSeniorsAiThread(input.tenantId, input.studentId, {
    threadId: input.threadId,
    topicId: input.threadId ? undefined : scoped?.topicId,
  });

  let threadId = existing?.threadId ?? "";
  let history = existing?.messages ?? [];
  if (!threadId) {
    threadId = newAiId();
    await prisma.$executeRaw`
      INSERT INTO "SeniorsAiThread" (id, "tenantId", "studentId", "topicId", title, "createdAt", "updatedAt")
      VALUES (
        ${threadId},
        ${input.tenantId},
        ${input.studentId},
        ${scoped?.topicId ?? null},
        ${clip(question, 72)},
        NOW(),
        NOW()
      )
    `;
  }

  const fallback = !topicFoundInNotes
    ? topicNotInNotesAnswer(question)
    : noNotesAnswer(scoped?.topicTitle);
  if (!hasNotes || !topicFoundInNotes || !isSeniorsLlmConfigured()) {
    const answer = !isSeniorsLlmConfigured() && hasNotes && topicFoundInNotes
      ? "Ask a Doubt is being enabled for your school. Try again shortly, or ask your teacher in class."
      : fallback;
    const sources = contexts.flatMap((ctx) => ctx.sources).slice(0, 6);
    await insertAiMessage({ threadId, role: "user", content: question });
    await insertAiMessage({ threadId, role: "assistant", content: answer, sources });
    await touchAiThread(threadId, scoped?.topicId ?? existing?.topicId ?? null);
    return {
      threadId,
      answer,
      sources,
      usedTeacherNotes: hasNotes && topicFoundInNotes,
      configured: isSeniorsLlmConfigured(),
    };
  }

  const contextBlock = clip(
    contexts.map((ctx) => ctx.text).join("\n\n-----\n\n"),
    MAX_CONTEXT_CHARS,
  );
  const historyMessages: LlmChatMessage[] = history.slice(-HISTORY_LIMIT).map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
  }));

  const messages: LlmChatMessage[] = [
    { role: "system", content: `${systemPrompt(contexts[0]?.schoolName || "the school", scoped?.topicTitle)}\n\nSCHOOL MATERIALS:\n${contextBlock}` },
    ...historyMessages,
    { role: "user", content: question },
  ];

  const answer = await completeSeniorsChat(messages);
  const sources = dedupeSources(contexts.flatMap((ctx) => ctx.sources)).slice(0, 8);

  await insertAiMessage({ threadId, role: "user", content: question });
  await insertAiMessage({ threadId, role: "assistant", content: answer, sources });
  await touchAiThread(threadId, scoped?.topicId ?? existing?.topicId ?? null);

  return {
    threadId,
    answer,
    sources,
    usedTeacherNotes: true,
    configured: true,
  };
}

function dedupeSources(sources: SeniorsAiSource[]) {
  const seen = new Set<string>();
  const out: SeniorsAiSource[] = [];
  for (const source of sources) {
    const key = `${source.topicTitle}::${source.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(source);
  }
  return out;
}
