/**
 * Full test school for Seniors QA — 5 classes, 5 teachers, rich curriculum,
 * students, quizzes, assignments, exams, progress.
 *
 * Run: npm run db:seed-test-school
 *      node scripts/seed-seniors-test-school.mjs [slug]
 *
 * Default slug: greenfield
 * Password for all users: demo1234
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const slug = process.argv[2] || "greenfield";
const PASSWORD = "demo1234";
const SCHOOL_NAME = "Greenfield Public School";

const TEACHERS = [
  { key: "mehta", name: "Kavita Mehta", email: "mehta", subject: "EVS", classKey: "6a" },
  { key: "sharma", name: "Priya Sharma", email: "sharma", subject: "Science", classKey: "8a" },
  { key: "kumar", name: "Amit Kumar", email: "kumar", subject: "Mathematics", classKey: "9a" },
  { key: "kapoor", name: "Neha Kapoor", email: "kapoor", subject: "English", classKey: "10a" },
  { key: "reddy", name: "Sunita Reddy", email: "reddy", subject: "Physics", classKey: "11a" },
];

const FIRST = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan",
  "Krishna", "Ishaan", "Shaurya", "Atharv", "Advik", "Pranav", "Kabir",
  "Ananya", "Diya", "Aadhya", "Saanvi", "Myra", "Kiara", "Pari", "Navya",
  "Ira", "Avni", "Riya", "Sara", "Zara", "Meera", "Kavya", "Tara", "Nisha",
  "Priya", "Sneha", "Pooja", "Neha", "Ritu", "Rohan", "Dev", "Karan", "Nikhil",
  "Simran", "Jaspreet", "Harleen", "Manpreet", "Gurleen", "Tanvi", "Ishita",
  "Akash", "Rahul", "Vikram",
];
const LAST = [
  "Sharma", "Verma", "Gupta", "Singh", "Patel", "Reddy", "Kapoor", "Iyer",
  "Nair", "Menon", "Joshi", "Malhotra", "Chopra", "Bansal", "Agarwal",
];

function pickName(i) {
  return `${FIRST[i % FIRST.length]} ${LAST[(i * 3 + 7) % LAST.length]}`;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(10, 0, 0, 0);
  return d;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function topicStatus(i) {
  if (i % 5 === 4) return "missing";
  if (i % 3 === 2) return "in_progress";
  return "complete";
}

function makeTopics(chapterNum, chapterName, titles) {
  return titles.map((title, i) => ({
    num: `${chapterNum}.${i + 1}`,
    slug: `${chapterNum}-${i + 1}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}`,
    title,
    status: topicStatus(i),
  }));
}

const QUIZ_TEMPLATE = (topicTitle) => [
  {
    id: "q1",
    prompt: `Which statement best describes ${topicTitle}?`,
    options: ["Incorrect definition", "Correct core concept", "Unrelated idea", "Partially wrong"],
    correctIndex: 1,
  },
  {
    id: "q2",
    prompt: `The most important keyword in ${topicTitle} is:`,
    options: ["Keyword A", "Core term", "Keyword C", "Keyword D"],
    correctIndex: 1,
  },
  {
    id: "q3",
    prompt: `A board-style answer on ${topicTitle} should include:`,
    options: ["Only a diagram", "Definition + explanation + example", "One word", "Unrelated formula"],
    correctIndex: 1,
  },
  {
    id: "q4",
    prompt: `Best way to revise ${topicTitle}:`,
    options: ["Skip practice", "Read notes + solve questions", "Memorise blindly", "Ignore keywords"],
    correctIndex: 1,
  },
  {
    id: "q5",
    prompt: `Common mistake in ${topicTitle} exams:`,
    options: ["Writing keywords", "Missing units/labels", "Using diagrams", "Showing steps"],
    correctIndex: 1,
  },
];

const CURRICULUM = {
  EVS: [
    { num: 1, name: "Our Environment", topics: makeTopics(1, "Environment", [
      "Components of Environment", "Ecosystem and Food Chain", "Producers and Consumers",
      "Decomposers", "Biotic and Abiotic Factors", "Environmental Balance",
      "Pollution Types", "Waste Management",
    ]) },
    { num: 2, name: "Natural Resources", topics: makeTopics(2, "Resources", [
      "Renewable Resources", "Non-renewable Resources", "Water Conservation",
      "Forest Conservation", "Wildlife Protection", "Sustainable Development",
    ]) },
    { num: 3, name: "India and the World", topics: makeTopics(3, "India", [
      "Physical Features of India", "Climate of India", "Agriculture in India",
      "Industries in India", "Transport and Communication", "Cultural Diversity",
    ]) },
  ],
  Hindi: [
    { num: 1, name: "व्याकरण", topics: makeTopics(1, "Vyakaran", [
      "संज्ञा और सर्वनाम", "क्रिया और विशेषण", "वचन और लिंग", "कारक", "वाक्य रचना", "अलंकार परिचय",
    ]) },
    { num: 2, name: "पठन कौशल", topics: makeTopics(2, "Reading", [
      "अपठित गद्यांश", "काव्यांश अर्थ", "मुहावरे और लोकोक्तियाँ", "शब्द भंडार", "वाक्य प्रयोग",
    ]) },
  ],
  English: [
    { num: 1, name: "Reading Skills", topics: makeTopics(1, "Reading", [
      "Unseen Passage Comprehension", "Inference and Analysis", "Vocabulary in Context",
      "Tone and Mood", "Fact vs Opinion", "Summary Writing",
    ]) },
    { num: 2, name: "Writing Skills", topics: makeTopics(2, "Writing", [
      "Formal Letter Writing", "Informal Letter Writing", "Article Writing",
      "Report Writing", "Story Writing", "Notice Writing",
    ]) },
    { num: 3, name: "Grammar", topics: makeTopics(3, "Grammar", [
      "Tenses", "Active and Passive Voice", "Direct and Indirect Speech",
      "Clauses", "Modals", "Subject-Verb Agreement",
    ]) },
    { num: 4, name: "Literature", topics: makeTopics(4, "Literature", [
      "Dust of Snow", "A Tiger in the Zoo", "The Ball Poem", "Amanda", "The Tale of Custard the Dragon",
    ]) },
  ],
  Science: [
    { num: 1, name: "Chemical Reactions and Equations", topics: makeTopics(1, "Chemical", [
      "Chemical Equations", "Balanced Equations", "Types of Chemical Reactions",
      "Combination Reactions", "Decomposition Reactions", "Displacement Reactions",
      "Double Displacement", "Effects of Oxidation",
    ]) },
    { num: 2, name: "Acids, Bases and Salts", topics: makeTopics(2, "Acids", [
      "Properties of Acids and Bases", "pH Scale", "Indicators",
      "Neutralisation", "Salts in Daily Life", "Bleaching Powder", "Washing Soda and Baking Soda",
    ]) },
    { num: 3, name: "Metals and Non-metals", topics: makeTopics(3, "Metals", [
      "Physical Properties of Metals", "Chemical Properties of Metals", "Reactivity Series",
      "Ionic Compounds", "Occurrence of Metals", "Corrosion and Prevention",
    ]) },
    { num: 4, name: "Carbon and its Compounds", topics: makeTopics(4, "Carbon", [
      "Covalent Bonding in Carbon", "Allotropes of Carbon", "Homologous Series",
      "Functional Groups", "Nomenclature", "Ethanol and Ethanoic Acid", "Soaps and Detergents",
    ]) },
    { num: 5, name: "Periodic Classification", topics: makeTopics(5, "Periodic", [
      "Early Attempts at Classification", "Mendeleev's Periodic Table", "Modern Periodic Table",
      "Periodic Trends", "Valency Trends", "Metallic Character Trends",
    ]) },
    { num: 6, name: "Life Processes", topics: makeTopics(6, "Life", [
      "Nutrition in Plants", "Nutrition in Animals", "Photosynthesis in Higher Plants",
      "Respiration", "Transport in Plants", "Transport in Animals", "Excretion in Humans",
    ]) },
    { num: 7, name: "Control and Coordination", topics: makeTopics(7, "Control", [
      "Nervous System in Animals", "Reflex Action", "Human Brain",
      "Coordination in Plants", "Hormones in Animals", "Endocrine Glands",
    ]) },
    { num: 8, name: "How do Organisms Reproduce", topics: makeTopics(8, "Reproduction", [
      "Asexual Reproduction", "Sexual Reproduction in Plants", "Sexual Reproduction in Humans",
      "Reproductive Health", "Contraception", "STD Awareness",
    ]) },
  ],
  Mathematics: [
    { num: 1, name: "Real Numbers", topics: makeTopics(1, "Real", [
      "Euclid's Division Lemma", "Fundamental Theorem of Arithmetic", "Irrational Numbers",
      "Decimal Expansions", "HCF and LCM Applications",
    ]) },
    { num: 2, name: "Polynomials", topics: makeTopics(2, "Polynomials", [
      "Zeros of Polynomial", "Relationship between Zeros and Coefficients",
      "Division Algorithm", "Graphical Representation",
    ]) },
    { num: 3, name: "Linear Equations", topics: makeTopics(3, "Linear", [
      "Pair of Linear Equations", "Graphical Method", "Substitution Method",
      "Elimination Method", "Cross Multiplication", "Applications",
    ]) },
    { num: 4, name: "Quadratic Equations", topics: makeTopics(4, "Quadratic", [
      "Standard Form", "Factorisation Method", "Quadratic Formula",
      "Nature of Roots", "Word Problems",
    ]) },
    { num: 5, name: "Triangles", topics: makeTopics(5, "Triangles", [
      "Similarity of Triangles", "Criteria for Similarity", "Areas of Similar Triangles",
      "Pythagoras Theorem", "Converse of Pythagoras", "Basic Proportionality Theorem",
    ]) },
    { num: 6, name: "Trigonometry", topics: makeTopics(6, "Trig", [
      "Trigonometric Ratios", "Trigonometric Identities", "Heights and Distances",
      "Angles of Elevation and Depression", "Applications in Navigation",
    ]) },
    { num: 7, name: "Statistics", topics: makeTopics(7, "Stats", [
      "Mean of Grouped Data", "Median of Grouped Data", "Mode of Grouped Data",
      "Cumulative Frequency", "Ogives",
    ]) },
  ],
  "Social Science": [
    { num: 1, name: "Indian National Movement", topics: makeTopics(1, "Freedom", [
      "Revolt of 1857", "Formation of Congress", "Partition of Bengal",
      "Non-Cooperation Movement", "Civil Disobedience", "Quit India Movement", "Independence",
    ]) },
    { num: 2, name: "Indian Constitution", topics: makeTopics(2, "Constitution", [
      "Making of Constitution", "Fundamental Rights", "Directive Principles",
      "Parliament", "Judiciary", "Federalism",
    ]) },
    { num: 3, name: "Resources and Development", topics: makeTopics(3, "Resources", [
      "Types of Resources", "Land Resources", "Agriculture in India",
      "Mineral Resources", "Power Resources", "Industries",
    ]) },
  ],
  Physics: [
    { num: 1, name: "Physical World and Measurement", topics: makeTopics(1, "Measurement", [
      "Units and Dimensions", "Errors in Measurement", "Significant Figures", "Dimensional Analysis",
    ]) },
    { num: 2, name: "Kinematics", topics: makeTopics(2, "Kinematics", [
      "Motion in a Straight Line", "Equations of Motion", "Projectile Motion",
      "Relative Velocity", "Graphical Analysis",
    ]) },
    { num: 3, name: "Laws of Motion", topics: makeTopics(3, "Motion", [
      "Newton's First Law", "Newton's Second Law", "Newton's Third Law",
      "Friction", "Circular Motion Basics",
    ]) },
    { num: 4, name: "Work, Energy and Power", topics: makeTopics(4, "Energy", [
      "Work Done", "Kinetic Energy", "Potential Energy", "Conservation of Energy", "Power",
    ]) },
  ],
  Chemistry: [
    { num: 1, name: "Some Basic Concepts", topics: makeTopics(1, "Basic", [
      "Matter and its Nature", "Laws of Chemical Combination", "Mole Concept",
      "Stoichiometry", "Percentage Composition",
    ]) },
    { num: 2, name: "Structure of Atom", topics: makeTopics(2, "Atom", [
      "Discovery of Subatomic Particles", "Atomic Models", "Bohr Model",
      "Quantum Numbers", "Electronic Configuration",
    ]) },
    { num: 3, name: "Chemical Bonding", topics: makeTopics(3, "Bonding", [
      "Ionic Bond", "Covalent Bond", "Lewis Structures", "VSEPR Theory", "Hydrogen Bonding",
    ]) },
  ],
};

/** Per-class subject → curriculum key (avoids duplicating full syllabus 3× for Science). */
const CLASS_DEFS = [
  { key: "6a", name: "Class 6", section: "A", sort: 1, studentCount: 10, subjects: [{ name: "EVS", curriculum: "EVS" }, { name: "Hindi", curriculum: "Hindi" }, { name: "English", curriculum: "English" }], primaryTeacher: "mehta" },
  { key: "8a", name: "Class 8", section: "A", sort: 2, studentCount: 10, subjects: [{ name: "Science", curriculum: "Science8" }, { name: "Mathematics", curriculum: "Mathematics8" }, { name: "Social Science", curriculum: "Social Science" }], primaryTeacher: "sharma" },
  { key: "9a", name: "Class 9", section: "A", sort: 3, studentCount: 10, subjects: [{ name: "Science", curriculum: "Science9" }, { name: "Mathematics", curriculum: "Mathematics9" }, { name: "English", curriculum: "English" }], primaryTeacher: "kumar" },
  { key: "10a", name: "Class 10", section: "A", sort: 4, studentCount: 10, subjects: [{ name: "Science", curriculum: "Science" }, { name: "Mathematics", curriculum: "Mathematics" }, { name: "English", curriculum: "English" }], primaryTeacher: "kapoor" },
  { key: "11a", name: "Class 11", section: "A", sort: 5, studentCount: 10, subjects: [{ name: "Physics", curriculum: "Physics" }, { name: "Chemistry", curriculum: "Chemistry" }, { name: "Mathematics", curriculum: "Mathematics11" }], primaryTeacher: "reddy" },
];

function sliceCurriculum(key, chapters) {
  const all = CURRICULUM[key] || [];
  return chapters === "all" ? all : all.slice(0, chapters);
}

CURRICULUM.Science8 = sliceCurriculum("Science", 4);
CURRICULUM.Science9 = sliceCurriculum("Science", 5);
CURRICULUM.Mathematics8 = sliceCurriculum("Mathematics", 4);
CURRICULUM.Mathematics9 = sliceCurriculum("Mathematics", 5);
CURRICULUM.Mathematics11 = sliceCurriculum("Mathematics", 4);

async function seedTopicContent(prisma, { tenantId, yearId, topic, teacherName, schoolName }) {
  const { id: topicId, title, contentStatus: status } = topic;
  if (status === "missing") return;

  const prefix = topicId;
  const blocks =
    status === "complete"
      ? [
          { id: `${prefix}-notes`, contentType: "notes", title: `School Notes — ${title}`, body: `**${title}** (${schoolName})\n\n1. Definition and key concepts\n2. Important formulas and diagrams\n3. Board exam keywords\n4. Common mistakes\n5. Quick revision points` },
          { id: `${prefix}-practice`, contentType: "practice_question", title: `Practice — ${title}`, body: `Q1. Define ${title}.\nQ2. Explain with diagram.\nQ3. Give two examples.\nQ4. 3-mark board question.\nQ5. Application-based problem.` },
          { id: `${prefix}-model`, contentType: "model_answer", title: `Model Answer — ${title}`, body: `5-mark structure: Definition (1) + Explanation (2) + Example/Diagram (1) + Conclusion (1)` },
          { id: `${prefix}-revision`, contentType: "revision_note", title: `Revision — ${title}`, body: `□ Read notes\n□ Practice questions\n□ Revise keywords\n□ Self-check with model answer` },
        ]
      : [{ id: `${prefix}-notes`, contentType: "notes", title: `Draft — ${title}`, body: `Draft notes for ${title}. Teacher is adding more content.` }];

  for (const b of blocks) {
    await prisma.seniorsTopicContent.upsert({
      where: { id: b.id },
      create: { id: b.id, tenantId, topicId, academicYearId: yearId, contentType: b.contentType, title: b.title, body: b.body, uploadedByName: teacherName, status: "published" },
      update: { body: b.body, title: b.title, uploadedByName: teacherName },
    });
  }

  if (status === "complete") {
    await prisma.seniorsQuiz.upsert({
      where: { id: `${prefix}-quiz` },
      create: { id: `${prefix}-quiz`, tenantId, topicId, title: `${title} — Quiz`, questions: QUIZ_TEMPLATE(title), status: "published", publishedAt: new Date() },
      update: { title: `${title} — Quiz`, questions: QUIZ_TEMPLATE(title) },
    });
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing in .env");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();

  let tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { slug, platformName: SCHOOL_NAME, ownerName: "Greenfield Admin", activeTemplateId: "seniors-platform", initialized: true, isPublished: true, enabledProducts: ["seniors"] },
    });
    console.log(`Created tenant: ${slug}`);
  } else {
    await prisma.tenant.update({ where: { id: tenant.id }, data: { activeTemplateId: "seniors-platform", platformName: SCHOOL_NAME, initialized: true } });
    console.log(`Updating tenant: ${slug}`);
  }

  const tenantId = tenant.id;
  const uid = (part) => `${slug}-${part}`;

  await prisma.seniorsSchoolSettings.upsert({
    where: { tenantId },
    create: { tenantId, schoolName: SCHOOL_NAME, primaryColor: "#2563EB", markingScheme: "CBSE step-wise marking", answerFormat: "Point-wise answers with keywords" },
    update: { schoolName: SCHOOL_NAME },
  });

  const year = await prisma.seniorsAcademicYear.upsert({
    where: { tenantId_label: { tenantId, label: "2025-26" } },
    create: { tenantId, label: "2025-26", isActive: true, startDate: new Date("2025-04-01"), endDate: new Date("2026-03-31") },
    update: { isActive: true },
  });

  await prisma.platformUser.upsert({
    where: { id: uid("admin") },
    create: { id: uid("admin"), tenantId, email: `admin@${slug}.edu`, fullName: "Greenfield Admin", userType: "school-admin", passwordHash, joinedAt: now, emailVerified: true },
    update: { passwordHash },
  });

  for (const t of TEACHERS) {
    await prisma.platformUser.upsert({
      where: { id: uid(`teacher-${t.key}`) },
      create: { id: uid(`teacher-${t.key}`), tenantId, email: `${t.email}@${slug}.edu`, fullName: t.name, userType: "teacher", passwordHash, joinedAt: now, emailVerified: true },
      update: { passwordHash, fullName: t.name },
    });
  }

  const classes = {};
  for (const c of CLASS_DEFS) {
    classes[c.key] = await prisma.seniorsClass.upsert({
      where: { id: uid(`class-${c.key}`) },
      create: { id: uid(`class-${c.key}`), tenantId, name: c.name, section: c.section, board: "CBSE", sortOrder: c.sort },
      update: { name: c.name, section: c.section },
    });
  }

  const studentIds = [];
  let studentIdx = 0;
  for (const c of CLASS_DEFS) {
    for (let i = 0; i < c.studentCount; i++) {
      const id = uid(`student-${studentIdx}`);
      const name = pickName(studentIdx);
      const roll = `${c.name.replace("Class ", "")}${c.section}-${String(i + 1).padStart(3, "0")}`;
      studentIds.push({ id, name, classKey: c.key, roll, classId: classes[c.key].id });
      await prisma.platformUser.upsert({
        where: { id },
        create: { id, tenantId, email: `student${studentIdx + 1}@${slug}.edu`, fullName: name, userType: "student", passwordHash, joinedAt: now, emailVerified: true },
        update: { fullName: name, passwordHash },
      });
      await prisma.seniorsStudentProfile.upsert({
        where: { tenantId_studentId: { tenantId, studentId: id } },
        create: { tenantId, classId: classes[c.key].id, studentId: id, rollNumber: roll },
        update: { classId: classes[c.key].id, rollNumber: roll },
      });
      studentIdx++;
    }
  }

  for (let i = 0; i < 20; i++) {
    const parentId = uid(`parent-${i}`);
    const child = studentIds[i];
    const parentName = `Parent of ${child.name.split(" ")[0]}`;
    await prisma.platformUser.upsert({
      where: { id: parentId },
      create: { id: parentId, tenantId, email: `parent${i + 1}@${slug}.edu`, fullName: parentName, userType: "parent", passwordHash, joinedAt: now, emailVerified: true },
      update: { passwordHash },
    });
    await prisma.seniorsParentChild.upsert({
      where: { parentId_studentId: { parentId, studentId: child.id } },
      create: { tenantId, parentId, studentId: child.id },
      update: {},
    });
  }

  const subjectMap = {};
  const allTopics = [];

  for (const c of CLASS_DEFS) {
    const primaryTeacher = TEACHERS.find((t) => t.key === c.primaryTeacher);
    console.log(`Curriculum: ${c.name}-${c.section}…`);
    for (let si = 0; si < c.subjects.length; si++) {
      const subj = c.subjects[si];
      const subjName = subj.name;
      const subjId = uid(`subj-${c.key}-${subjName.toLowerCase().replace(/\s+/g, "-")}`);
      const subject = await prisma.seniorsSubject.upsert({
        where: { id: subjId },
        create: { id: subjId, tenantId, classId: classes[c.key].id, name: subjName, sortOrder: si + 1 },
        update: { name: subjName },
      });
      subjectMap[`${c.key}:${subjName}`] = subject;

      const chapters = CURRICULUM[subj.curriculum] || [];
      console.log(`  ${subjName}: ${chapters.length} chapters`);
      for (const ch of chapters) {
        const chId = uid(`ch-${c.key}-${subjName.toLowerCase().replace(/\s+/g, "-")}-${ch.num}`);
        const chapter = await prisma.seniorsChapter.upsert({
          where: { id: chId },
          create: { id: chId, tenantId, subjectId: subject.id, number: ch.num, name: ch.name, sortOrder: ch.num },
          update: { name: ch.name },
        });

        for (let ti = 0; ti < ch.topics.length; ti++) {
          const t = ch.topics[ti];
          const topicSlug = `${c.key}-${t.slug}`;
          const topic = await prisma.seniorsTopic.upsert({
            where: { tenantId_slug_academicYearId: { tenantId, slug: topicSlug, academicYearId: year.id } },
            create: {
              tenantId, chapterId: chapter.id, academicYearId: year.id, slug: topicSlug,
              number: t.num, title: t.title, contentStatus: t.status, sortOrder: ti + 1,
              learningObjective: `Master ${t.title} as per CBSE ${c.name} syllabus.`,
              teacherExplanation: `${t.title}: Taught using ${SCHOOL_NAME}'s structured approach.`,
              keywords: [subjName, c.name, ...t.title.split(" ").slice(0, 3)],
              publishedAt: t.status === "complete" ? now : null,
            },
            update: { title: t.title, contentStatus: t.status },
          });
          allTopics.push({ ...topic, classKey: c.key, status: t.status });
          await seedTopicContent(prisma, { tenantId, yearId: year.id, topic, teacherName: primaryTeacher?.name || "Teacher", schoolName: SCHOOL_NAME });
        }
      }
    }
  }

  for (const c of CLASS_DEFS) {
    const teacherId = uid(`teacher-${c.primaryTeacher}`);
    for (const subj of c.subjects) {
      const subjName = subj.name;
      const subject = subjectMap[`${c.key}:${subjName}`];
      if (!subject) continue;
      const taId = uid(`ta-${c.primaryTeacher}-${c.key}-${subjName.toLowerCase().replace(/\s+/g, "-")}`);
      await prisma.seniorsTeacherAssignment.upsert({
        where: { teacherId_classId_subjectId: { teacherId, classId: classes[c.key].id, subjectId: subject.id } },
        create: { id: taId, tenantId, teacherId, classId: classes[c.key].id, subjectId: subject.id },
        update: {},
      });
    }
  }

  const homework = [
    { id: "hw-6-evs", title: "Ecosystem Worksheet", subject: "EVS", chapter: "Ch 1", classKey: "6a", days: 2, teacher: "Kavita Mehta", questions: 5 },
    { id: "hw-8-sci", title: "Acids and Bases — Exercise", subject: "Science", chapter: "Ch 2", classKey: "8a", days: 1, teacher: "Priya Sharma", questions: 8 },
    { id: "hw-8-math", title: "Polynomials Practice", subject: "Mathematics", chapter: "Ch 2", classKey: "8a", days: 3, teacher: "Priya Sharma", questions: 6 },
    { id: "hw-9-sci", title: "Life Processes — Diagram Questions", subject: "Science", chapter: "Ch 6", classKey: "9a", days: -2, teacher: "Amit Kumar", questions: 5 },
    { id: "hw-9-math", title: "Triangles — Congruence", subject: "Mathematics", chapter: "Ch 5", classKey: "9a", days: 4, teacher: "Amit Kumar", questions: 7 },
    { id: "hw-10-sci", title: "Carbon Compounds Worksheet", subject: "Science", chapter: "Ch 4", classKey: "10a", days: 2, teacher: "Neha Kapoor", questions: 6 },
    { id: "hw-10-math", title: "Trigonometry Ratios", subject: "Mathematics", chapter: "Ch 6", classKey: "10a", days: 5, teacher: "Neha Kapoor", questions: 8 },
    { id: "hw-10-eng", title: "Formal Letter Writing", subject: "English", chapter: "Writing Skills", classKey: "10a", days: 3, teacher: "Neha Kapoor", questions: 3 },
    { id: "hw-11-phy", title: "Kinematics Numericals", subject: "Physics", chapter: "Ch 2", classKey: "11a", days: 4, teacher: "Sunita Reddy", questions: 6 },
    { id: "hw-11-chem", title: "Mole Concept Problems", subject: "Chemistry", chapter: "Ch 1", classKey: "11a", days: 1, teacher: "Sunita Reddy", questions: 7 },
    { id: "hw-11-math", title: "Quadratic Equations", subject: "Mathematics", chapter: "Ch 4", classKey: "11a", days: 6, teacher: "Sunita Reddy", questions: 9 },
  ];

  for (const hw of homework) {
    await prisma.seniorsAssignment.upsert({
      where: { id: uid(hw.id) },
      create: {
        id: uid(hw.id), tenantId, academicYearId: year.id, title: hw.title,
        description: `Complete all questions before deadline. Follow school answer format.`,
        subjectName: hw.subject, chapterName: hw.chapter, targetClassId: classes[hw.classKey].id,
        dueAt: daysFromNow(hw.days), questionCount: hw.questions, createdByName: hw.teacher,
      },
      update: { title: hw.title, dueAt: daysFromNow(hw.days), targetClassId: classes[hw.classKey].id },
    });
  }

  const class10Students = studentIds.filter((s) => s.classKey === "10a");
  const hwOverdue = uid("hw-9-sci");
  for (let i = 0; i < Math.min(6, class10Students.length); i++) {
    const s = studentIds.filter((x) => x.classKey === "9a")[i];
    if (!s) continue;
    await prisma.seniorsAssignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId: hwOverdue, studentId: s.id } },
      create: {
        tenantId, assignmentId: hwOverdue, studentId: s.id,
        status: i < 3 ? "graded" : "submitted",
        answerText: `Answers by ${s.name}`, score: i < 3 ? 6 + i : null,
        feedback: i < 3 ? "Good work. Add labelled diagram." : "",
        gradedAt: i < 3 ? now : null, gradedByName: i < 3 ? "Amit Kumar" : "",
        submittedAt: daysFromNow(-4 + i),
      },
      update: { status: i < 3 ? "graded" : "submitted" },
    });
  }

  const exams = [
    { id: "exam-6", title: "Class 6 EVS Unit Test", subject: "EVS", classKey: "6a", days: 10 },
    { id: "exam-8-sci", title: "Class 8 Science Monthly Test", subject: "Science", classKey: "8a", days: 8 },
    { id: "exam-9-math", title: "Class 9 Math Unit Test", subject: "Mathematics", classKey: "9a", days: 12 },
    { id: "exam-10-sci", title: "Class 10 Science Pre-Board", subject: "Science", classKey: "10a", days: 15 },
    { id: "exam-11-phy", title: "Class 11 Physics Unit Test", subject: "Physics", classKey: "11a", days: 7 },
  ];

  for (const ex of exams) {
    const cls = classes[ex.classKey];
    await prisma.seniorsExam.upsert({
      where: { id: uid(ex.id) },
      create: { id: uid(ex.id), tenantId, title: ex.title, subjectName: ex.subject, examAt: daysFromNow(ex.days), targetClassId: cls.id, className: `${cls.name}-${cls.section}` },
      update: { examAt: daysFromNow(ex.days), title: ex.title },
    });
  }

  const announcements = [
    { id: "ann-ptm", title: "Parent Teacher Meeting", body: "PTM on Saturday 10 AM–1 PM. Collect progress reports from class teachers.", source: "school", createdByName: "School Office" },
    { id: "ann-exam", title: "Unit Test Schedule Released", body: "Unit test timetable is now available in Exam Prep section.", source: "school", createdByName: "Academic Coordinator" },
    { id: "ann-lab", title: "Science Lab Session", body: "Mandatory practical on Photosynthesis this Friday. Bring lab coat.", source: "teacher", createdByName: "Priya Sharma" },
  ];

  for (const a of announcements) {
    await prisma.seniorsAnnouncement.upsert({
      where: { id: uid(a.id) },
      create: { id: uid(a.id), tenantId, title: a.title, body: a.body, icon: "megaphone", source: a.source, createdByName: a.createdByName, publishedAt: daysFromNow(-2) },
      update: { title: a.title, body: a.body },
    });
  }

  console.log("Seeding student progress & quiz attempts…");
  const day = todayStr();

  for (let si = 0; si < studentIds.length; si++) {
    const student = studentIds[si];
    const classTopics = allTopics.filter((t) => t.classKey === student.classKey);
    const completionRate = 0.3 + (si % 8) * 0.07;

    for (let ti = 0; ti < classTopics.length; ti++) {
      const topic = classTopics[ti];
      const threshold = completionRate * classTopics.length;
      const progress = ti < threshold ? 100 : ti === Math.floor(threshold) ? 50 : 0;
      if (progress === 0 && ti > threshold + 3) continue;

      await prisma.seniorsTopicProgress.upsert({
        where: { topicId_studentId: { topicId: topic.id, studentId: student.id } },
        create: { tenantId, topicId: topic.id, studentId: student.id, progressPercent: progress, isCompleted: progress >= 100, lastVisitedAt: new Date(now.getTime() - (ti + si) * 3600000) },
        update: { progressPercent: progress, isCompleted: progress >= 100 },
      });
    }

    const firstComplete = classTopics.find((t) => t.status === "complete");
    if (firstComplete) {
      const quiz = await prisma.seniorsQuiz.findFirst({ where: { topicId: firstComplete.id } });
      if (quiz) {
        await prisma.seniorsQuizAttempt.deleteMany({ where: { tenantId, quizId: quiz.id, studentId: student.id } });
        await prisma.seniorsQuizAttempt.create({
          data: { tenantId, quizId: quiz.id, studentId: student.id, score: 3 + (si % 3), maxScore: 5, answers: { q1: 1, q2: 1, q3: 1, q4: 1, q5: si % 2 }, submittedAt: daysFromNow(-(si % 5)) },
        });
      }
    }

    const streak = 1 + (si % 12);
    const coins = 30 + si * 10;
    await prisma.seniorsStudentGamification.upsert({
      where: { tenantId_studentId: { tenantId, studentId: student.id } },
      create: { tenantId, studentId: student.id, currentStreak: streak, longestStreak: streak + 3, lastActiveDate: day, coins: coins % 400, totalCoins: coins },
      update: { currentStreak: streak, lastActiveDate: day, coins: coins % 400, totalCoins: coins },
    });
  }

  const quizCount = await prisma.seniorsQuiz.count({ where: { tenantId } });

  console.log("\n══════════════════════════════════════════════════");
  console.log(`  ${SCHOOL_NAME}`);
  console.log(`  School code: ${slug}`);
  console.log(`  Password:    ${PASSWORD}`);
  console.log("══════════════════════════════════════════════════");
  console.log(`\n  Classes:      ${CLASS_DEFS.length} (6-A, 8-A, 9-A, 10-A, 11-A)`);
  console.log(`  Teachers:     ${TEACHERS.length}`);
  console.log(`  Students:     ${studentIds.length}`);
  console.log(`  Parents:      20`);
  console.log(`  Topics:       ${allTopics.length}`);
  console.log(`  Quizzes:      ${quizCount}`);
  console.log(`  Homework:     ${homework.length}`);
  console.log(`  Exams:        ${exams.length}`);

  console.log("\n── Logins (school code: greenfield) ──");
  console.log(`  Admin:    admin@${slug}.edu`);
  for (const t of TEACHERS) console.log(`  Teacher:  ${t.email}@${slug}.edu  (${t.name} → ${t.classKey})`);
  console.log(`  Student:  student1@${slug}.edu … student${studentIds.length}@${slug}.edu`);
  console.log(`  Parent:   parent1@${slug}.edu … parent20@${slug}.edu`);

  console.log("\n── Login URL ──");
  console.log(`  http://127.0.0.1:3001/seniors/login`);
  console.log(`  School code: ${slug}`);
  console.log("══════════════════════════════════════════════════\n");

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
