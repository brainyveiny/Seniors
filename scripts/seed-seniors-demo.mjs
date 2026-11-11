/**
 * Seeds Greenwood High School demo data for Seniors tenants.
 * Run: node scripts/seed-seniors-demo.mjs [tenant-slug]
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const slug = process.argv[2] || "greenwood";

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  let tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        slug,
        platformName: "Greenwood High School",
        ownerName: "School Admin",
        activeTemplateId: "seniors-platform",
        initialized: true,
        isPublished: true,
      },
    });
    console.log(`Created tenant: ${slug}`);
  } else {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { activeTemplateId: "seniors-platform", platformName: "Greenwood High School" },
    });
  }

  const tenantId = tenant.id;
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const now = new Date();

  const upsertUser = async (id, email, fullName, userType) => {
    await prisma.platformUser.upsert({
      where: { id },
      create: {
        id,
        tenantId,
        email,
        fullName,
        userType,
        passwordHash,
        joinedAt: now,
        emailVerified: true,
      },
      update: { fullName, userType, passwordHash },
    });
  };

  await upsertUser("seniors-student-ananya", "ananya@greenwood.edu", "Ananya Sharma", "student");
  await upsertUser("seniors-parent-rahul", "rahul@greenwood.edu", "Rahul Verma", "parent");
  await upsertUser("seniors-teacher-sharma", "sharma@greenwood.edu", "Mrs. Sharma", "teacher");
  await upsertUser("seniors-admin", "admin@greenwood.edu", "School Admin", "school-admin");

  await prisma.seniorsSchoolSettings.upsert({
    where: { tenantId },
    create: {
      tenantId,
      schoolName: "Greenwood High School",
      primaryColor: "#2563EB",
      markingScheme: "CBSE pattern with step-wise marking",
      answerFormat: "Point-wise answers with keywords highlighted",
    },
    update: { schoolName: "Greenwood High School" },
  });

  const year = await prisma.seniorsAcademicYear.upsert({
    where: { tenantId_label: { tenantId, label: "2025-26" } },
    create: { tenantId, label: "2025-26", isActive: true },
    update: { isActive: true },
  });

  const schoolClass = await prisma.seniorsClass.upsert({
    where: { id: `${tenantId}-class-10` },
    create: {
      id: `${tenantId}-class-10`,
      tenantId,
      name: "Class 10",
      section: "A",
      board: "CBSE",
      sortOrder: 1,
    },
    update: {},
  });

  await prisma.seniorsStudentProfile.upsert({
    where: { tenantId_studentId: { tenantId, studentId: "seniors-student-ananya" } },
    create: {
      tenantId,
      classId: schoolClass.id,
      studentId: "seniors-student-ananya",
      rollNumber: "10A-042",
    },
    update: { classId: schoolClass.id },
  });

  await prisma.seniorsParentChild.upsert({
    where: {
      parentId_studentId: {
        parentId: "seniors-parent-rahul",
        studentId: "seniors-student-ananya",
      },
    },
    create: {
      tenantId,
      parentId: "seniors-parent-rahul",
      studentId: "seniors-student-ananya",
    },
    update: {},
  });

  const science = await prisma.seniorsSubject.upsert({
    where: { id: `${tenantId}-science` },
    create: { id: `${tenantId}-science`, tenantId, classId: schoolClass.id, name: "Science", sortOrder: 1 },
    update: {},
  });

  const math = await prisma.seniorsSubject.upsert({
    where: { id: `${tenantId}-math` },
    create: { id: `${tenantId}-math`, tenantId, classId: schoolClass.id, name: "Mathematics", sortOrder: 2 },
    update: {},
  });

  const english = await prisma.seniorsSubject.upsert({
    where: { id: `${tenantId}-english` },
    create: { id: `${tenantId}-english`, tenantId, classId: schoolClass.id, name: "English", sortOrder: 3 },
    update: {},
  });

  const ch4 = await prisma.seniorsChapter.upsert({
    where: { id: `${tenantId}-ch4` },
    create: { id: `${tenantId}-ch4`, tenantId, subjectId: science.id, number: 4, name: "Carbon and its Compounds", sortOrder: 4 },
    update: {},
  });

  const ch5 = await prisma.seniorsChapter.upsert({
    where: { id: `${tenantId}-ch5` },
    create: { id: `${tenantId}-ch5`, tenantId, subjectId: science.id, number: 5, name: "Periodic Classification of Elements", sortOrder: 5 },
    update: {},
  });

  const ch6 = await prisma.seniorsChapter.upsert({
    where: { id: `${tenantId}-ch6` },
    create: { id: `${tenantId}-ch6`, tenantId, subjectId: science.id, number: 6, name: "Life Processes", sortOrder: 6 },
    update: {},
  });

  const topics = [
    { slug: "4-1-bonding", number: "4.1", title: "Covalent Bonding in Carbon", chapterId: ch4.id, status: "complete", sort: 1 },
    { slug: "4-2-allotropes", number: "4.2", title: "Allotropes of Carbon", chapterId: ch4.id, status: "complete", sort: 2 },
    { slug: "4-3-compounds", number: "4.3", title: "Carbon Compounds", chapterId: ch4.id, status: "complete", sort: 3 },
    { slug: "4-4-hydrocarbons", number: "4.4", title: "Hydrocarbons", chapterId: ch4.id, status: "in_progress", sort: 4 },
    { slug: "4-5-functional", number: "4.5", title: "Functional Groups", chapterId: ch4.id, status: "missing", sort: 5 },
    { slug: "6-2-photosynthesis", number: "6.2", title: "Photosynthesis in Higher Plants", chapterId: ch6.id, status: "complete", sort: 2 },
  ];

  for (const t of topics) {
    const topic = await prisma.seniorsTopic.upsert({
      where: { tenantId_slug_academicYearId: { tenantId, slug: t.slug, academicYearId: year.id } },
      create: {
        tenantId,
        chapterId: t.chapterId,
        academicYearId: year.id,
        slug: t.slug,
        number: t.number,
        title: t.title,
        contentStatus: t.status,
        sortOrder: t.sort,
        learningObjective:
          t.slug === "6-2-photosynthesis"
            ? "Understand the process of photosynthesis, the role of chlorophyll, and the factors affecting it."
            : `Learning objectives for ${t.title}`,
        teacherExplanation:
          t.slug === "6-2-photosynthesis"
            ? "Photosynthesis is the process by which green plants prepare their own food using sunlight, carbon dioxide, and water. Chlorophyll present in the chloroplast absorbs light energy and drives the reaction inside leaf cells.\n\nThe overall reaction is 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂. Glucose produced is stored as carbohydrate, while oxygen is released through stomata. Factors affecting the rate include light intensity, CO₂ concentration, temperature, and water availability."
            : `Teacher explanation for ${t.title} aligned to Greenwood High School methodology.`,
        keywords:
          t.slug === "6-2-photosynthesis"
            ? [
                "Photosynthesis",
                "Chlorophyll",
                "Chloroplast",
                "Stomata",
                "Glucose",
                "Sunlight",
                "Carbohydrate",
                "Oxygen",
              ]
            : ["CBSE", "Science", t.title.split(" ")[0] ?? "Topic"],
        diagramUrl: t.slug === "6-2-photosynthesis" ? "/assets/seniors/photosynthesis.svg" : "",
      },
      update: {
        contentStatus: t.status,
        title: t.title,
        learningObjective:
          t.slug === "6-2-photosynthesis"
            ? "Understand the process of photosynthesis, the role of chlorophyll, and the factors affecting it."
            : `Learning objectives for ${t.title}`,
        teacherExplanation:
          t.slug === "6-2-photosynthesis"
            ? "Photosynthesis is the process by which green plants prepare their own food using sunlight, carbon dioxide, and water. Chlorophyll present in the chloroplast absorbs light energy and drives the reaction inside leaf cells.\n\nThe overall reaction is 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂. Glucose produced is stored as carbohydrate, while oxygen is released through stomata. Factors affecting the rate include light intensity, CO₂ concentration, temperature, and water availability."
            : `Teacher explanation for ${t.title} aligned to Greenwood High School methodology.`,
        keywords:
          t.slug === "6-2-photosynthesis"
            ? [
                "Photosynthesis",
                "Chlorophyll",
                "Chloroplast",
                "Stomata",
                "Glucose",
                "Sunlight",
                "Carbohydrate",
                "Oxygen",
              ]
            : ["CBSE", "Science", t.title.split(" ")[0] ?? "Topic"],
        diagramUrl: t.slug === "6-2-photosynthesis" ? "/assets/seniors/photosynthesis.svg" : "",
      },
    });

    if (t.status !== "missing") {
      await prisma.seniorsTopicContent.upsert({
        where: { id: `${topic.id}-notes` },
        create: {
          id: `${topic.id}-notes`,
          tenantId,
          topicId: topic.id,
          academicYearId: year.id,
          contentType: "notes",
          title: "School Notes",
          body: `Notes for ${t.title}`,
          uploadedByName: "Mrs. Sharma",
        },
        update: {},
      });
    }

    if (t.slug === "4-4-hydrocarbons") {
      await prisma.seniorsTopicProgress.upsert({
        where: { topicId_studentId: { topicId: topic.id, studentId: "seniors-student-ananya" } },
        create: {
          tenantId,
          topicId: topic.id,
          studentId: "seniors-student-ananya",
          progressPercent: 40,
          lastVisitedAt: now,
        },
        update: { progressPercent: 40 },
      });
    }
  }

  const overdueDate = new Date(now);
  overdueDate.setDate(overdueDate.getDate() - 4);

  await prisma.seniorsAssignment.upsert({
    where: { id: `${tenantId}-hw-overdue` },
    create: {
      id: `${tenantId}-hw-overdue`,
      tenantId,
      academicYearId: year.id,
      title: "Periodic Classification of Elements",
      subjectName: "Science",
      chapterName: "Chapter 5",
      dueAt: overdueDate,
      questionCount: 2,
      createdByName: "Mrs. Sharma",
    },
    update: {
      title: "Periodic Classification of Elements",
      subjectName: "Science",
      chapterName: "Chapter 5",
      dueAt: overdueDate,
      questionCount: 2,
    },
  });

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  await prisma.seniorsAssignment.upsert({
    where: { id: `${tenantId}-hw-math` },
    create: {
      id: `${tenantId}-hw-math`,
      tenantId,
      academicYearId: year.id,
      title: "Triangles",
      subjectName: "Maths",
      chapterName: "Ch 6",
      dueAt: tomorrow,
      questionCount: 5,
      createdByName: "Mr. Kumar",
    },
    update: {
      title: "Triangles",
      subjectName: "Maths",
      chapterName: "Ch 6",
      dueAt: tomorrow,
      questionCount: 5,
    },
  });

  const inTwoDays = new Date(now);
  inTwoDays.setDate(inTwoDays.getDate() + 2);
  await prisma.seniorsAssignment.upsert({
    where: { id: `${tenantId}-hw-english` },
    create: {
      id: `${tenantId}-hw-english`,
      tenantId,
      academicYearId: year.id,
      title: "Letter Writing",
      subjectName: "English",
      chapterName: "Writing Skills",
      dueAt: inTwoDays,
      questionCount: 3,
      createdByName: "Ms. Kapoor",
    },
    update: {
      title: "Letter Writing",
      subjectName: "English",
      chapterName: "Writing Skills",
      dueAt: inTwoDays,
      questionCount: 3,
    },
  });

  const examDate = new Date(now);
  examDate.setDate(examDate.getDate() + 5);
  await prisma.seniorsExam.upsert({
    where: { id: `${tenantId}-exam-science` },
    create: {
      id: `${tenantId}-exam-science`,
      tenantId,
      title: "Science Unit Test",
      subjectName: "Science",
      examAt: examDate,
      className: "Class 10",
    },
    update: { examAt: examDate, title: "Science Unit Test" },
  });

  const examDateMath = new Date(now);
  examDateMath.setDate(examDateMath.getDate() + 12);
  await prisma.seniorsExam.upsert({
    where: { id: `${tenantId}-exam-math` },
    create: {
      id: `${tenantId}-exam-math`,
      tenantId,
      title: "Mathematics Unit Test",
      subjectName: "Mathematics",
      examAt: examDateMath,
      className: "Class 10",
    },
    update: { examAt: examDateMath, title: "Mathematics Unit Test" },
  });

  await prisma.seniorsAnnouncement.upsert({
    where: { id: `${tenantId}-ann-ptm` },
    create: {
      id: `${tenantId}-ann-ptm`,
      tenantId,
      title: "Parent Teacher Meeting",
      body: "PTM is scheduled on 17 May 2025 (Saturday). Timings: 11:00 AM - 1:00 PM",
      icon: "megaphone",
      createdByName: "School Office",
    },
    update: {
      body: "PTM is scheduled on 17 May 2025 (Saturday). Timings: 11:00 AM - 1:00 PM",
    },
  });

  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  await prisma.seniorsTeacherUpdate.upsert({
    where: { id: `${tenantId}-tu-notes` },
    create: {
      id: `${tenantId}-tu-notes`,
      tenantId,
      teacherName: "Mrs. Sharma",
      message: "posted notes for Ch 6: Triangles",
      publishedAt: twoHoursAgo,
    },
    update: {
      message: "posted notes for Ch 6: Triangles",
      publishedAt: twoHoursAgo,
    },
  });

  // Demo progress summary closer to mockup (topics + quiz average)
  const allSeedTopics = await prisma.seniorsTopic.findMany({ where: { tenantId } });
  for (let i = 0; i < allSeedTopics.length; i++) {
    const topic = allSeedTopics[i];
    const isCompleted = i < Math.max(1, Math.floor(allSeedTopics.length * 0.78));
    await prisma.seniorsTopicProgress.upsert({
      where: {
        topicId_studentId: {
          topicId: topic.id,
          studentId: "seniors-student-ananya",
        },
      },
      create: {
        tenantId,
        topicId: topic.id,
        studentId: "seniors-student-ananya",
        progressPercent: isCompleted ? 100 : 40,
        isCompleted,
        lastVisitedAt: now,
      },
      update: {
        progressPercent: isCompleted ? 100 : 40,
        isCompleted,
      },
    });
  }

  if (allSeedTopics[0]) {
    const quiz = await prisma.seniorsQuiz.upsert({
      where: { topicId: allSeedTopics[0].id },
      create: {
        tenantId,
        topicId: allSeedTopics[0].id,
        title: "Chapter Quiz",
        questions: [
          {
            id: "q1",
            prompt: "Which of the following is a saturated hydrocarbon?",
            options: ["Ethene", "Ethyne", "Ethane", "Benzene"],
            correctIndex: 2,
          },
          {
            id: "q2",
            prompt: "The functional group in alcohols is:",
            options: ["–CHO", "–OH", "–COOH", "–NH2"],
            correctIndex: 1,
          },
          {
            id: "q3",
            prompt: "Covalent compounds generally have:",
            options: [
              "High melting points",
              "Low melting points",
              "Ionic bonds",
              "Free electrons",
            ],
            correctIndex: 1,
          },
        ],
      },
      update: {
        title: "Chapter Quiz",
        questions: [
          {
            id: "q1",
            prompt: "Which of the following is a saturated hydrocarbon?",
            options: ["Ethene", "Ethyne", "Ethane", "Benzene"],
            correctIndex: 2,
          },
          {
            id: "q2",
            prompt: "The functional group in alcohols is:",
            options: ["–CHO", "–OH", "–COOH", "–NH2"],
            correctIndex: 1,
          },
          {
            id: "q3",
            prompt: "Covalent compounds generally have:",
            options: [
              "High melting points",
              "Low melting points",
              "Ionic bonds",
              "Free electrons",
            ],
            correctIndex: 1,
          },
        ],
      },
    });
    await prisma.seniorsQuizAttempt.deleteMany({
      where: { tenantId, studentId: "seniors-student-ananya", quizId: quiz.id },
    });
    await prisma.seniorsQuizAttempt.create({
      data: {
        tenantId,
        quizId: quiz.id,
        studentId: "seniors-student-ananya",
        score: 2,
        maxScore: 3,
        answers: { q1: 2, q2: 1, q3: 0 },
        submittedAt: now,
      },
    });
  }

  console.log(`Seniors demo seeded for tenant: ${slug}`);
  console.log("Demo logins (password: demo1234):");
  console.log("  Student: ananya@greenwood.edu");
  console.log("  Parent:  rahul@greenwood.edu");
  console.log("  Teacher: sharma@greenwood.edu");
  console.log("  Admin:   admin@greenwood.edu");

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
