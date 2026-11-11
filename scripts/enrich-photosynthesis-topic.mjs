/**
 * Enrich photosynthesis topic with full Notes / Practice / Revision / Quiz
 * for greenwood + latest e2e-* schools. Safe to re-run (upsert by fixed ids).
 *
 *   node scripts/enrich-photosynthesis-topic.mjs
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DIAGRAM = "/assets/seniors/photosynthesis.svg";

const NOTES_BODY = `Key points for Class 10 Science:

1. Photosynthesis converts light energy into chemical energy (glucose).
2. Chlorophyll in chloroplasts absorbs sunlight.
3. Raw materials: CO₂ (via stomata) and H₂O (via roots/xylem).
4. Products: glucose (stored as starch) and O₂ (released).
5. Overall equation: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ (in presence of light & chlorophyll).

Factors affecting rate: light intensity, CO₂ concentration, temperature, water availability.`;

const PRACTICE_BODY = `Answer in your notebook:

Q1. What is the role of chlorophyll in photosynthesis?
Q2. Write the balanced chemical equation for photosynthesis.
Q3. Name four factors that affect the rate of photosynthesis.
Q4. How do stomata help in gaseous exchange during photosynthesis?
Q5. Differentiate between light-dependent and light-independent reactions (brief).`;

const REVISION_BODY = `Quick revision checklist:
□ Define photosynthesis in one line
□ Label a leaf diagram (sunlight, CO₂, H₂O, O₂, glucose)
□ Write the overall equation from memory
□ List limiting factors with examples
□ Explain why plants appear green

Model answer tip: Always mention chlorophyll, chloroplast, and the balanced equation in 3–5 mark answers.`;

const PREV_PAPER_BODY = `Sample board-style questions (previous papers pattern):

1. (2 marks) Name the pigment and organelle involved in photosynthesis.
2. (3 marks) Explain how temperature and CO₂ concentration affect the rate.
3. (5 marks) Draw a neat labelled diagram showing inputs and outputs of photosynthesis in a leaf.`;

const QUIZ_QUESTIONS = [
  {
    id: "q1",
    prompt: "Which pigment absorbs light for photosynthesis?",
    options: ["Hemoglobin", "Chlorophyll", "Melanin", "Keratin"],
    correctIndex: 1,
  },
  {
    id: "q2",
    prompt: "Gas released during photosynthesis is?",
    options: ["CO₂", "N₂", "O₂", "H₂"],
    correctIndex: 2,
  },
  {
    id: "q3",
    prompt: "Where do the light reactions mainly occur?",
    options: ["Mitochondria", "Cytoplasm", "Thylakoid membranes", "Nucleus"],
    correctIndex: 2,
  },
  {
    id: "q4",
    prompt: "Which is NOT a raw material for photosynthesis?",
    options: ["Carbon dioxide", "Water", "Sunlight", "Oxygen"],
    correctIndex: 3,
  },
  {
    id: "q5",
    prompt: "Stomata primarily help in?",
    options: ["Food storage", "Gaseous exchange", "Protein synthesis", "Cell division"],
    correctIndex: 1,
  },
];

async function enrichTopic(prisma, topic, schoolName) {
  const yearId = topic.academicYearId;
  const tenantId = topic.tenantId;
  const topicId = topic.id;
  const prefix = `${topicId}`;

  await prisma.seniorsTopic.update({
    where: { id: topicId },
    data: {
      diagramUrl: DIAGRAM,
      contentStatus: "complete",
      learningObjective:
        "Understand the process of photosynthesis, the role of chlorophyll, and the factors affecting it.",
      teacherExplanation: `Photosynthesis is how green plants make food using sunlight, carbon dioxide and water. This lesson follows ${schoolName}'s CBSE Class 10 Science plan.\n\nChlorophyll in the chloroplast absorbs light energy. The overall reaction is 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂. Glucose is stored as carbohydrate; oxygen is released through stomata.`,
      keywords: [
        "Photosynthesis",
        "Chlorophyll",
        "Chloroplast",
        "Stomata",
        "Glucose",
        "Sunlight",
        "Carbohydrate",
        "Oxygen",
      ],
    },
  });

  const blocks = [
    {
      id: `${prefix}-notes-full`,
      contentType: "notes",
      title: "School Notes -Photosynthesis",
      body: NOTES_BODY,
    },
    {
      id: `${prefix}-practice-full`,
      contentType: "practice_question",
      title: "Practice Questions -Photosynthesis",
      body: PRACTICE_BODY,
    },
    {
      id: `${prefix}-revision-full`,
      contentType: "revision_note",
      title: "Revision Checklist",
      body: REVISION_BODY,
    },
    {
      id: `${prefix}-model-full`,
      contentType: "model_answer",
      title: "Model Answer Tips",
      body: "For a 5-mark answer: define the process, mention chlorophyll/chloroplast, write the equation, list 2–3 factors, and conclude with the importance for life on Earth.",
    },
    {
      id: `${prefix}-paper-full`,
      contentType: "previous_paper",
      title: "Previous Paper Style Questions",
      body: PREV_PAPER_BODY,
    },
  ];

  for (const b of blocks) {
    await prisma.seniorsTopicContent.upsert({
      where: { id: b.id },
      create: {
        id: b.id,
        tenantId,
        topicId,
        academicYearId: yearId,
        contentType: b.contentType,
        title: b.title,
        body: b.body,
        uploadedByName: "Science Faculty",
      },
      update: {
        title: b.title,
        body: b.body,
        contentType: b.contentType,
        uploadedByName: "Science Faculty",
      },
    });
  }

  await prisma.seniorsQuiz.upsert({
    where: { topicId },
    create: {
      tenantId,
      topicId,
      title: "Photosynthesis quick check",
      questions: QUIZ_QUESTIONS,
    },
    update: {
      title: "Photosynthesis quick check",
      questions: QUIZ_QUESTIONS,
    },
  });

  console.log(`  enriched topic ${topic.slug} @ ${tenantId}`);
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const tenants = await prisma.tenant.findMany({
      where: {
        activeTemplateId: "seniors-platform",
        OR: [{ slug: "greenwood" }, { slug: { startsWith: "e2e-" } }],
      },
      include: { seniorsSchoolSettings: true },
    });

    for (const t of tenants) {
      const topic = await prisma.seniorsTopic.findFirst({
        where: { tenantId: t.id, slug: "6-2-photosynthesis" },
      });
      if (!topic) {
        console.log(`skip ${t.slug}: no photosynthesis topic`);
        continue;
      }
      const schoolName =
        t.seniorsSchoolSettings?.schoolName || t.platformName || t.slug;
      console.log(`school ${t.slug}`);
      await enrichTopic(prisma, topic, schoolName);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
