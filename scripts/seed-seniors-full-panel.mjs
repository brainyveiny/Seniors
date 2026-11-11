/**
 * Full Seniors panel demo -school, teachers, students, classes, curriculum,
 * notes, quizzes, homework, exams, progress, gamification.
 *
 * Run: node scripts/seed-seniors-full-panel.mjs [tenant-slug]
 * Default slug: riverside-demo
 * Password for all users: demo1234
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const slug = process.argv[2] || "riverside-demo";
const PASSWORD = "demo1234";
const SCHOOL_NAME = "Riverside International School";

const TEACHERS = [
  { key: "sharma", name: "Priya Sharma", email: "sharma", subject: "Science" },
  { key: "kumar", name: "Amit Kumar", email: "kumar", subject: "Mathematics" },
  { key: "kapoor", name: "Neha Kapoor", email: "kapoor", subject: "English" },
  { key: "patel", name: "Rajesh Patel", email: "patel", subject: "Physics" },
  { key: "reddy", name: "Sunita Reddy", email: "reddy", subject: "Chemistry" },
];

const FIRST = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan",
  "Krishna", "Ishaan", "Shaurya", "Atharv", "Advik", "Pranav", "Kabir",
  "Ananya", "Diya", "Aadhya", "Saanvi", "Myra", "Kiara", "Pari", "Navya",
  "Ira", "Avni", "Riya", "Sara", "Zara", "Meera", "Kavya", "Tara", "Nisha",
  "Priya", "Sneha", "Pooja", "Neha", "Ritu",
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

const QUIZ_TEMPLATE = (topicTitle) => [
  {
    id: "q1",
    prompt: `Which statement best describes ${topicTitle}?`,
    options: ["Option A -incorrect", "Option B -correct concept", "Option C -unrelated", "Option D -partially wrong"],
    correctIndex: 1,
  },
  {
    id: "q2",
    prompt: `In ${topicTitle}, the key term students must remember is:`,
    options: ["Term A", "Term B", "Core concept", "Term D"],
    correctIndex: 2,
  },
  {
    id: "q3",
    prompt: `A 3-mark board question on ${topicTitle} should include:`,
    options: ["Only a diagram", "Definition + example + conclusion", "One word answer", "Unrelated formula"],
    correctIndex: 1,
  },
  {
    id: "q4",
    prompt: `Which factor is most important when studying ${topicTitle}?`,
    options: ["Memorisation only", "Conceptual understanding", "Skipping practice", "Ignoring keywords"],
    correctIndex: 1,
  },
];

const CURRICULUM = {
  Science: [
    {
      num: 4,
      name: "Carbon and its Compounds",
      topics: [
        { num: "4.1", slug: "4-1-bonding", title: "Covalent Bonding in Carbon", status: "complete" },
        { num: "4.2", slug: "4-2-allotropes", title: "Allotropes of Carbon", status: "complete" },
        { num: "4.3", slug: "4-3-compounds", title: "Carbon Compounds", status: "complete" },
        { num: "4.4", slug: "4-4-hydrocarbons", title: "Hydrocarbons", status: "in_progress" },
        { num: "4.5", slug: "4-5-functional", title: "Functional Groups", status: "missing" },
      ],
    },
    {
      num: 5,
      name: "Periodic Classification of Elements",
      topics: [
        { num: "5.1", slug: "5-1-mendeleev", title: "Mendeleev's Periodic Table", status: "complete" },
        { num: "5.2", slug: "5-2-modern", title: "Modern Periodic Table", status: "complete" },
        { num: "5.3", slug: "5-3-trends", title: "Periodic Trends", status: "in_progress" },
      ],
    },
    {
      num: 6,
      name: "Life Processes",
      topics: [
        { num: "6.1", slug: "6-1-nutrition", title: "Nutrition in Plants and Animals", status: "complete" },
        { num: "6.2", slug: "6-2-photosynthesis", title: "Photosynthesis in Higher Plants", status: "complete", diagram: "/assets/seniors/photosynthesis.svg" },
        { num: "6.3", slug: "6-3-respiration", title: "Respiration", status: "in_progress" },
        { num: "6.4", slug: "6-4-transport", title: "Transport in Plants and Animals", status: "missing" },
      ],
    },
  ],
  Mathematics: [
    {
      num: 1,
      name: "Real Numbers",
      topics: [
        { num: "1.1", slug: "1-1-euclid", title: "Euclid's Division Lemma", status: "complete" },
        { num: "1.2", slug: "1-2-irrational", title: "Irrational Numbers", status: "complete" },
        { num: "1.3", slug: "1-3-decimals", title: "Decimal Expansions", status: "in_progress" },
      ],
    },
    {
      num: 6,
      name: "Triangles",
      topics: [
        { num: "6.1", slug: "6-1-congruence", title: "Congruence of Triangles", status: "complete" },
        { num: "6.2", slug: "6-2-similarity", title: "Similar Triangles", status: "complete" },
        { num: "6.3", slug: "6-3-pythagoras", title: "Pythagoras Theorem", status: "complete" },
      ],
    },
    {
      num: 8,
      name: "Introduction to Trigonometry",
      topics: [
        { num: "8.1", slug: "8-1-ratios", title: "Trigonometric Ratios", status: "complete" },
        { num: "8.2", slug: "8-2-identities", title: "Trigonometric Identities", status: "in_progress" },
        { num: "8.3", slug: "8-3-heights", title: "Heights and Distances", status: "missing" },
      ],
    },
  ],
  English: [
    {
      num: 1,
      name: "Reading Skills",
      topics: [
        { num: "1.1", slug: "1-1-comprehension", title: "Unseen Passage Comprehension", status: "complete" },
        { num: "1.2", slug: "1-2-inference", title: "Inference and Analysis", status: "complete" },
      ],
    },
    {
      num: 2,
      name: "Writing Skills",
      topics: [
        { num: "2.1", slug: "2-1-letter", title: "Formal Letter Writing", status: "complete" },
        { num: "2.2", slug: "2-2-article", title: "Article Writing", status: "in_progress" },
        { num: "2.3", slug: "2-3-report", title: "Report Writing", status: "missing" },
      ],
    },
    {
      num: 3,
      name: "Literature -First Flight",
      topics: [
        { num: "3.1", slug: "3-1-dust", title: "Dust of Snow", status: "complete" },
        { num: "3.2", slug: "3-2-tiger", title: "A Tiger in the Zoo", status: "complete" },
      ],
    },
  ],
  Physics: [
    {
      num: 1,
      name: "Physical World and Measurement",
      topics: [
        { num: "1.1", slug: "11-1-units", title: "Units and Dimensions", status: "complete" },
        { num: "1.2", slug: "11-1-errors", title: "Errors in Measurement", status: "complete" },
      ],
    },
    {
      num: 2,
      name: "Kinematics",
      topics: [
        { num: "2.1", slug: "11-2-motion", title: "Motion in a Straight Line", status: "complete" },
        { num: "2.2", slug: "11-2-projectile", title: "Projectile Motion", status: "in_progress" },
      ],
    },
  ],
  Chemistry: [
    {
      num: 1,
      name: "Some Basic Concepts",
      topics: [
        { num: "1.1", slug: "11-ch-mole", title: "Mole Concept", status: "complete" },
        { num: "1.2", slug: "11-ch-stoichiometry", title: "Stoichiometry", status: "complete" },
      ],
    },
    {
      num: 2,
      name: "Structure of Atom",
      topics: [
        { num: "2.1", slug: "11-ch-atomic", title: "Atomic Models", status: "complete" },
        { num: "2.2", slug: "11-ch-quantum", title: "Quantum Numbers", status: "in_progress" },
      ],
    },
  ],
};

async function seedTopicContent(prisma, { tenantId, yearId, topic, teacherName, schoolName }) {
  const { id: topicId, title, contentStatus: status } = topic;
  if (status === "missing") return;

  const prefix = topicId;
  const blocks =
    status === "complete"
      ? [
          {
            id: `${prefix}-notes`,
            contentType: "notes",
            title: `School Notes -${title}`,
            body: `**${title}** -Class notes (${schoolName})\n\n1. Core definition and importance\n2. Key formulas and diagrams to remember\n3. Board exam keywords: define, explain, differentiate\n4. Common mistakes students make\n5. Quick recap points for revision\n\nTeacher tip: Write answers in point form with underlined keywords for full marks.`,
          },
          {
            id: `${prefix}-practice`,
            contentType: "practice_question",
            title: `Practice Questions -${title}`,
            body: `Q1. Define ${title} in 2–3 lines.\nQ2. Explain with a labelled diagram (where applicable).\nQ3. Give two real-life examples.\nQ4. Differentiate related concepts (3 marks).\nQ5. Solve a numerical / application-based problem.`,
          },
          {
            id: `${prefix}-model`,
            contentType: "model_answer",
            title: `Model Answer -${title}`,
            body: `Sample 5-mark answer structure:\n• Opening definition (1 mark)\n• Detailed explanation with keywords (2 marks)\n• Diagram or example (1 mark)\n• Conclusion / significance (1 mark)\n\nAlways align with CBSE marking scheme used at ${schoolName}.`,
          },
          {
            id: `${prefix}-revision`,
            contentType: "revision_note",
            title: `Revision Checklist -${title}`,
            body: `□ Read school notes once\n□ Attempt all practice questions\n□ Revise keywords aloud\n□ Solve previous-year style question\n□ Self-check with model answer`,
          },
        ]
      : [
          {
            id: `${prefix}-notes`,
            contentType: "notes",
            title: `Draft Notes -${title}`,
            body: `Draft notes for ${title}. Teacher is still adding practice questions and model answers.`,
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
        uploadedByName: teacherName,
        status: "published",
      },
      update: { body: b.body, title: b.title, uploadedByName: teacherName },
    });
  }

  if (status === "complete") {
    await prisma.seniorsQuiz.upsert({
      where: { id: `${prefix}-quiz` },
      create: {
        id: `${prefix}-quiz`,
        tenantId,
        topicId,
        title: `${title} -Quick Quiz`,
        questions: QUIZ_TEMPLATE(title),
        status: "published",
        publishedAt: new Date(),
      },
      update: {
        title: `${title} -Quick Quiz`,
        questions: QUIZ_TEMPLATE(title),
      },
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
      data: {
        slug,
        platformName: SCHOOL_NAME,
        ownerName: "Riverside Admin",
        activeTemplateId: "seniors-platform",
        initialized: true,
        isPublished: true,
        enabledProducts: ["seniors"],
      },
    });
    console.log(`Created tenant: ${slug}`);
  } else {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { activeTemplateId: "seniors-platform", platformName: SCHOOL_NAME, initialized: true },
    });
    console.log(`Updating tenant: ${slug}`);
  }

  const tenantId = tenant.id;
  const uid = (part) => `${slug}-${part}`;

  await prisma.seniorsSchoolSettings.upsert({
    where: { tenantId },
    create: {
      tenantId,
      schoolName: SCHOOL_NAME,
      primaryColor: "#2563EB",
      markingScheme: "CBSE step-wise marking with keywords highlighted",
      answerFormat: "Point-wise answers; diagrams where required",
    },
    update: { schoolName: SCHOOL_NAME },
  });

  const year = await prisma.seniorsAcademicYear.upsert({
    where: { tenantId_label: { tenantId, label: "2025-26" } },
    create: { tenantId, label: "2025-26", isActive: true, startDate: new Date("2025-04-01"), endDate: new Date("2026-03-31") },
    update: { isActive: true },
  });

  // Admin
  await prisma.platformUser.upsert({
    where: { id: uid("admin") },
    create: {
      id: uid("admin"),
      tenantId,
      email: `admin@${slug}.edu`,
      fullName: "Riverside Admin",
      userType: "school-admin",
      passwordHash,
      joinedAt: now,
      emailVerified: true,
    },
    update: { passwordHash, fullName: "Riverside Admin" },
  });

  // Teachers
  for (const t of TEACHERS) {
    await prisma.platformUser.upsert({
      where: { id: uid(`teacher-${t.key}`) },
      create: {
        id: uid(`teacher-${t.key}`),
        tenantId,
        email: `${t.email}@${slug}.edu`,
        fullName: t.name,
        userType: "teacher",
        passwordHash,
        joinedAt: now,
        emailVerified: true,
      },
      update: { passwordHash, fullName: t.name },
    });
  }

  // Classes
  const classDefs = [
    { key: "9a", name: "Class 9", section: "A", sort: 1, studentCount: 12, subjects: ["Science", "Mathematics", "English"] },
    { key: "10a", name: "Class 10", section: "A", sort: 2, studentCount: 13, subjects: ["Science", "Mathematics", "English"] },
    { key: "11a", name: "Class 11", section: "A", sort: 3, studentCount: 12, subjects: ["Physics", "Chemistry", "Mathematics", "English"] },
  ];

  const classes = {};
  for (const c of classDefs) {
    classes[c.key] = await prisma.seniorsClass.upsert({
      where: { id: uid(`class-${c.key}`) },
      create: {
        id: uid(`class-${c.key}`),
        tenantId,
        name: c.name,
        section: c.section,
        board: "CBSE",
        sortOrder: c.sort,
      },
      update: { name: c.name, section: c.section },
    });
  }

  // Students (37 total)
  const studentIds = [];
  let studentIdx = 0;
  for (const c of classDefs) {
    for (let i = 0; i < c.studentCount; i++) {
      const id = uid(`student-${studentIdx}`);
      const name = pickName(studentIdx);
      const roll = `${c.name.replace("Class ", "")}${c.section}-${String(i + 1).padStart(3, "0")}`;
      studentIds.push({ id, name, classKey: c.key, roll, classId: classes[c.key].id });
      await prisma.platformUser.upsert({
        where: { id },
        create: {
          id,
          tenantId,
          email: `student${studentIdx + 1}@${slug}.edu`,
          fullName: name,
          userType: "student",
          passwordHash,
          joinedAt: now,
          emailVerified: true,
        },
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

  // Parents (first 15 students)
  for (let i = 0; i < 15; i++) {
    const parentId = uid(`parent-${i}`);
    const child = studentIds[i];
    const parentName = `${child.name.split(" ")[1] || "Parent"} Parent`;
    await prisma.platformUser.upsert({
      where: { id: parentId },
      create: {
        id: parentId,
        tenantId,
        email: `parent${i + 1}@${slug}.edu`,
        fullName: parentName,
        userType: "parent",
        passwordHash,
        joinedAt: now,
        emailVerified: true,
      },
      update: { fullName: parentName, passwordHash },
    });
    await prisma.seniorsParentChild.upsert({
      where: { parentId_studentId: { parentId, studentId: child.id } },
      create: { tenantId, parentId, studentId: child.id },
      update: {},
    });
  }

  // Subjects + curriculum per class
  const subjectMap = {};
  const allTopics = [];

  for (const c of classDefs) {
    for (let si = 0; si < c.subjects.length; si++) {
      const subjName = c.subjects[si];
      const subjId = uid(`subj-${c.key}-${subjName.toLowerCase()}`);
      const subject = await prisma.seniorsSubject.upsert({
        where: { id: subjId },
        create: { id: subjId, tenantId, classId: classes[c.key].id, name: subjName, sortOrder: si + 1 },
        update: { name: subjName },
      });
      subjectMap[`${c.key}:${subjName}`] = subject;

      const chapters = CURRICULUM[subjName] || [];
      for (const ch of chapters) {
        const chId = uid(`ch-${c.key}-${subjName.toLowerCase()}-${ch.num}`);
        const chapter = await prisma.seniorsChapter.upsert({
          where: { id: chId },
          create: {
            id: chId,
            tenantId,
            subjectId: subject.id,
            number: ch.num,
            name: ch.name,
            sortOrder: ch.num,
          },
          update: { name: ch.name },
        });

        for (let ti = 0; ti < ch.topics.length; ti++) {
          const t = ch.topics[ti];
          const topicSlug = `${c.key}-${t.slug}`;
          const teacher = TEACHERS.find((x) => x.subject === subjName) || TEACHERS[0];
          const topic = await prisma.seniorsTopic.upsert({
            where: { tenantId_slug_academicYearId: { tenantId, slug: topicSlug, academicYearId: year.id } },
            create: {
              tenantId,
              chapterId: chapter.id,
              academicYearId: year.id,
              slug: topicSlug,
              number: t.num,
              title: t.title,
              contentStatus: t.status,
              sortOrder: ti + 1,
              learningObjective: `Understand ${t.title} as per CBSE ${c.name} syllabus.`,
              teacherExplanation: `${t.title}: This topic is taught using ${SCHOOL_NAME}'s structured approach -concept introduction, worked examples, board-style questions, and revision checklist.\n\nStudents should focus on definitions, diagrams, and keyword-based answers for full marks.`,
              keywords: [subjName, c.name, ...t.title.split(" ").slice(0, 3)],
              diagramUrl: t.diagram || "",
              publishedAt: t.status === "complete" ? now : null,
            },
            update: {
              title: t.title,
              contentStatus: t.status,
              learningObjective: `Understand ${t.title} as per CBSE ${c.name} syllabus.`,
              diagramUrl: t.diagram || "",
            },
          });
          allTopics.push({ ...topic, classKey: c.key, teacherName: teacher.name, status: t.status });
          await seedTopicContent(prisma, {
            tenantId,
            yearId: year.id,
            topic,
            teacherName: teacher.name,
            schoolName: SCHOOL_NAME,
          });
        }
      }
    }
  }

  // Teacher assignments
  const assignmentPairs = [
    { teacher: "sharma", classKey: "9a", subject: "Science" },
    { teacher: "sharma", classKey: "10a", subject: "Science" },
    { teacher: "kumar", classKey: "9a", subject: "Mathematics" },
    { teacher: "kumar", classKey: "10a", subject: "Mathematics" },
    { teacher: "kumar", classKey: "11a", subject: "Mathematics" },
    { teacher: "kapoor", classKey: "9a", subject: "English" },
    { teacher: "kapoor", classKey: "10a", subject: "English" },
    { teacher: "kapoor", classKey: "11a", subject: "English" },
    { teacher: "patel", classKey: "11a", subject: "Physics" },
    { teacher: "reddy", classKey: "11a", subject: "Chemistry" },
  ];

  for (const a of assignmentPairs) {
    const teacherId = uid(`teacher-${a.teacher}`);
    const subject = subjectMap[`${a.classKey}:${a.subject}`];
    if (!subject) continue;
    const id = uid(`ta-${a.teacher}-${a.classKey}-${a.subject.toLowerCase()}`);
    await prisma.seniorsTeacherAssignment.upsert({
      where: { teacherId_classId_subjectId: { teacherId, classId: classes[a.classKey].id, subjectId: subject.id } },
      create: { id, tenantId, teacherId, classId: classes[a.classKey].id, subjectId: subject.id },
      update: {},
    });
  }

  // Homework
  const homework = [
    { id: "hw-overdue", title: "Periodic Classification -Worksheet", subject: "Science", chapter: "Chapter 5", classKey: "10a", days: -3, teacher: "Priya Sharma", questions: 5 },
    { id: "hw-tomorrow", title: "Triangles -Exercise 6.2", subject: "Mathematics", chapter: "Chapter 6", classKey: "10a", days: 1, teacher: "Amit Kumar", questions: 8 },
    { id: "hw-week", title: "Formal Letter Writing", subject: "English", chapter: "Writing Skills", classKey: "10a", days: 4, teacher: "Neha Kapoor", questions: 3 },
    { id: "hw-9-sci", title: "Nutrition in Plants", subject: "Science", chapter: "Chapter 6", classKey: "9a", days: 2, teacher: "Priya Sharma", questions: 4 },
    { id: "hw-11-phy", title: "Kinematics Numericals", subject: "Physics", chapter: "Chapter 2", classKey: "11a", days: 5, teacher: "Rajesh Patel", questions: 6 },
    { id: "hw-11-chem", title: "Mole Concept Problems", subject: "Chemistry", chapter: "Chapter 1", classKey: "11a", days: 3, teacher: "Sunita Reddy", questions: 7 },
  ];

  for (const hw of homework) {
    await prisma.seniorsAssignment.upsert({
      where: { id: uid(hw.id) },
      create: {
        id: uid(hw.id),
        tenantId,
        academicYearId: year.id,
        title: hw.title,
        description: `Complete all questions. Submit before deadline. Follow ${SCHOOL_NAME} answer format.`,
        subjectName: hw.subject,
        chapterName: hw.chapter,
        targetClassId: classes[hw.classKey].id,
        dueAt: daysFromNow(hw.days),
        questionCount: hw.questions,
        createdByName: hw.teacher,
      },
      update: {
        title: hw.title,
        dueAt: daysFromNow(hw.days),
        targetClassId: classes[hw.classKey].id,
      },
    });
  }

  // Submissions for Class 10 homework
  const class10Students = studentIds.filter((s) => s.classKey === "10a");
  const hwOverdue = uid("hw-overdue");
  const hwTomorrow = uid("hw-tomorrow");
  for (let i = 0; i < class10Students.length; i++) {
    const s = class10Students[i];
    if (i < 5) {
      await prisma.seniorsAssignmentSubmission.upsert({
        where: { assignmentId_studentId: { assignmentId: hwOverdue, studentId: s.id } },
        create: {
          tenantId,
          assignmentId: hwOverdue,
          studentId: s.id,
          status: i < 3 ? "graded" : "submitted",
          answerText: `Submitted answers for ${s.name}`,
          score: i < 3 ? 7 + (i % 3) : null,
          feedback: i < 3 ? "Good attempt. Revise periodic trends." : "",
          gradedAt: i < 3 ? now : null,
          gradedByName: i < 3 ? "Priya Sharma" : "",
          submittedAt: daysFromNow(-5 + i),
        },
        update: { status: i < 3 ? "graded" : "submitted", score: i < 3 ? 7 + (i % 3) : null },
      });
    }
    if (i < 8) {
      await prisma.seniorsAssignmentSubmission.upsert({
        where: { assignmentId_studentId: { assignmentId: hwTomorrow, studentId: s.id } },
        create: {
          tenantId,
          assignmentId: hwTomorrow,
          studentId: s.id,
          status: "submitted",
          answerText: `Triangle congruence solutions -${s.name}`,
          submittedAt: daysFromNow(-1),
        },
        update: { status: "submitted" },
      });
    }
  }

  // Exams
  const exams = [
    { id: "exam-10-sci", title: "Science Unit Test -Life Processes", subject: "Science", classKey: "10a", days: 6 },
    { id: "exam-10-math", title: "Mathematics Unit Test -Triangles", subject: "Mathematics", classKey: "10a", days: 12 },
    { id: "exam-10-eng", title: "English Reading & Writing Test", subject: "English", classKey: "10a", days: 18 },
    { id: "exam-9-sci", title: "Class 9 Science Monthly Test", subject: "Science", classKey: "9a", days: 8 },
    { id: "exam-11-phy", title: "Physics Unit Test -Kinematics", subject: "Physics", classKey: "11a", days: 10 },
  ];

  for (const ex of exams) {
    const cls = classes[ex.classKey];
    await prisma.seniorsExam.upsert({
      where: { id: uid(ex.id) },
      create: {
        id: uid(ex.id),
        tenantId,
        title: ex.title,
        subjectName: ex.subject,
        examAt: daysFromNow(ex.days),
        targetClassId: cls.id,
        className: `${cls.name}-${cls.section}`,
      },
      update: { examAt: daysFromNow(ex.days), title: ex.title },
    });
  }

  // Announcements
  const announcements = [
    {
      id: "ann-ptm",
      title: "Parent Teacher Meeting -March 2026",
      body: "PTM on Saturday, 10:00 AM – 1:00 PM. Parents are requested to collect progress reports from class teachers.",
      source: "school",
      createdByName: "School Office",
    },
    {
      id: "ann-holiday",
      title: "Holi Holiday Notice",
      body: "School will remain closed on Monday for Holi celebrations. Regular classes resume Tuesday.",
      source: "school",
      createdByName: "School Office",
    },
    {
      id: "ann-exam",
      title: "Unit Test Schedule Released",
      body: "Class 10 unit test timetable is now available. Check Exam Prep section for dates and syllabus.",
      source: "school",
      createdByName: "Academic Coordinator",
    },
    {
      id: "ann-lab",
      title: "Science Lab Session -Class 10",
      body: "Mandatory practical session on Photosynthesis this Friday. Bring lab coat and notebook.",
      source: "teacher",
      createdByName: "Priya Sharma",
    },
  ];

  for (const a of announcements) {
    await prisma.seniorsAnnouncement.upsert({
      where: { id: uid(a.id) },
      create: {
        id: uid(a.id),
        tenantId,
        title: a.title,
        body: a.body,
        icon: "megaphone",
        source: a.source,
        createdByName: a.createdByName,
        publishedAt: daysFromNow(-Math.floor(Math.random() * 5)),
      },
      update: { title: a.title, body: a.body },
    });
  }

  // Teacher updates
  const updates = [
    { teacher: "Priya Sharma", message: "posted notes for Ch 6: Photosynthesis in Higher Plants" },
    { teacher: "Amit Kumar", message: "uploaded practice questions for Triangles -Congruence" },
    { teacher: "Neha Kapoor", message: "shared formal letter writing format and sample answers" },
    { teacher: "Rajesh Patel", message: "added kinematics numericals for Class 11 Physics" },
    { teacher: "Sunita Reddy", message: "published mole concept revision notes for Class 11" },
  ];

  for (let i = 0; i < updates.length; i++) {
    const u = updates[i];
    await prisma.seniorsTeacherUpdate.upsert({
      where: { id: uid(`tu-${i}`) },
      create: {
        id: uid(`tu-${i}`),
        tenantId,
        teacherName: u.teacher,
        message: u.message,
        publishedAt: new Date(now.getTime() - (i + 1) * 3 * 60 * 60 * 1000),
      },
      update: { message: u.message },
    });
  }

  // Topic progress + quiz attempts + gamification
  const completeTopics = allTopics.filter((t) => t.status === "complete");
  const day = todayStr();

  for (let si = 0; si < studentIds.length; si++) {
    const student = studentIds[si];
    const classTopics = allTopics.filter((t) => t.classKey === student.classKey);
    const completionRate = 0.35 + (si % 10) * 0.06;

    for (let ti = 0; ti < classTopics.length; ti++) {
      const topic = classTopics[ti];
      const threshold = completionRate * classTopics.length;
      const isCompleted = ti < threshold;
      const progress = isCompleted ? 100 : ti === Math.floor(threshold) ? 40 + (si % 4) * 10 : 0;
      if (progress === 0 && ti > threshold + 2) continue;

      await prisma.seniorsTopicProgress.upsert({
        where: { topicId_studentId: { topicId: topic.id, studentId: student.id } },
        create: {
          tenantId,
          topicId: topic.id,
          studentId: student.id,
          progressPercent: progress,
          isCompleted: progress >= 100,
          lastVisitedAt: new Date(now.getTime() - (ti + si) * 3600000),
        },
        update: { progressPercent: progress, isCompleted: progress >= 100 },
      });
    }

    // Quiz attempts on first complete topic of their class
    const firstComplete = classTopics.find((t) => t.status === "complete");
    if (firstComplete) {
      const quiz = await prisma.seniorsQuiz.findFirst({ where: { topicId: firstComplete.id } });
      if (quiz) {
        const score = 2 + (si % 3);
        await prisma.seniorsQuizAttempt.deleteMany({
          where: { tenantId, quizId: quiz.id, studentId: student.id },
        });
        await prisma.seniorsQuizAttempt.create({
          data: {
            tenantId,
            quizId: quiz.id,
            studentId: student.id,
            score,
            maxScore: 4,
            answers: { q1: 1, q2: 2, q3: si % 2, q4: 1 },
            submittedAt: daysFromNow(-(si % 7)),
          },
        });
      }
    }

    // Gamification for leaderboard
    const streak = 1 + (si % 14);
    const coins = 20 + si * 8 + (si % 5) * 12;
    await prisma.seniorsStudentGamification.upsert({
      where: { tenantId_studentId: { tenantId, studentId: student.id } },
      create: {
        tenantId,
        studentId: student.id,
        currentStreak: streak,
        longestStreak: streak + (si % 5),
        lastActiveDate: day,
        coins: coins % 500,
        totalCoins: coins,
      },
      update: {
        currentStreak: streak,
        longestStreak: streak + (si % 5),
        lastActiveDate: day,
        coins: coins % 500,
        totalCoins: coins,
      },
    });
  }

  // Summary
  console.log("\n══════════════════════════════════════════════════");
  console.log(`  ${SCHOOL_NAME}`);
  console.log(`  School code: ${slug}`);
  console.log(`  Password:    ${PASSWORD}`);
  console.log("══════════════════════════════════════════════════");
  console.log(`\n  Classes:     3 (9-A, 10-A, 11-A)`);
  console.log(`  Teachers:    ${TEACHERS.length}`);
  console.log(`  Students:    ${studentIds.length}`);
  console.log(`  Parents:     15`);
  console.log(`  Topics:      ${allTopics.length} (with notes/quizzes)`);
  console.log(`  Homework:    ${homework.length}`);
  console.log(`  Exams:       ${exams.length}`);
  console.log(`  Announcements: ${announcements.length}`);

  console.log("\n── Logins ──");
  console.log(`  Admin:   admin@${slug}.edu`);
  for (const t of TEACHERS) console.log(`  Teacher: ${t.email}@${slug}.edu  (${t.name})`);
  console.log(`  Student: student1@${slug}.edu … student${studentIds.length}@${slug}.edu`);
  console.log(`  Parent:  parent1@${slug}.edu … parent15@${slug}.edu`);

  console.log("\n── URLs ──");
  console.log(`  School site:  /${slug}/student/home`);
  console.log(`  Login:        /${slug}/login/student`);
  console.log(`  Leaderboard:  /${slug}/student/leaderboard`);
  console.log("══════════════════════════════════════════════════\n");

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
