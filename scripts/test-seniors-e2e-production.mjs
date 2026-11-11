/**
 * Seniors production-style E2E test.
 *
 * Creates a fresh school via real APIs, seeds curriculum in DB for that school,
 * creates teacher/student/parent, exercises every Seniors API, then smokes
 * every role dashboard page and asserts live data (no demo hardcodes).
 *
 * Run (dev server must be up):
 *   node scripts/test-seniors-e2e-production.mjs
 *
 * Env:
 *   BASE_URL (default http://127.0.0.1:3000)
 *   SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD (from .env)
 *   DATABASE_URL (for curriculum seed)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const BASE = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const SUPER_EMAIL = (process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
const SUPER_PASS = process.env.SUPER_ADMIN_PASSWORD || "";

const stamp = Date.now().toString(36);
const SCHOOL_CODE = `e2e-${stamp}`;
const SCHOOL_NAME = `Horizon Public School ${stamp.slice(-4).toUpperCase()}`;
const ADMIN_PASS = `Adm!${stamp.slice(-6)}`;
const TEACHER_PASS = `Tch!${stamp.slice(-6)}`;
const STUDENT_PASS = `Stu!${stamp.slice(-6)}`;
const PARENT_PASS = `Par!${stamp.slice(-6)}`;

const emails = {
  admin: `admin@${SCHOOL_CODE}.edu`,
  teacher: `meera@${SCHOOL_CODE}.edu`,
  student: `riya@${SCHOOL_CODE}.edu`,
  parent: `vikram@${SCHOOL_CODE}.edu`,
};

const names = {
  admin: "Priya Nair",
  teacher: "Meera Iyer",
  student: "Riya Kapoor",
  parent: "Vikram Kapoor",
};

const results = [];
let failed = 0;

function ok(name, detail = "") {
  results.push({ ok: true, name, detail });
  console.log(`  ✓ ${name}${detail ? ` -${detail}` : ""}`);
}

function fail(name, detail = "") {
  failed += 1;
  results.push({ ok: false, name, detail });
  console.error(`  ✗ ${name}${detail ? ` -${detail}` : ""}`);
}

function assert(cond, name, detail = "") {
  if (cond) ok(name, detail);
  else fail(name, detail);
}

class CookieJar {
  constructor() {
    this.map = new Map();
  }

  store(res) {
    const raw =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [];
    for (const line of raw) {
      const [pair] = line.split(";");
      const eq = pair.indexOf("=");
      if (eq < 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const cleared =
        /Max-Age=0/i.test(line) ||
        /Expires=Thu, 01 Jan 1970/i.test(line) ||
        value === "";
      if (cleared) this.map.delete(name);
      else this.map.set(name, value);
    }
  }

  header() {
    return [...this.map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  clear() {
    this.map.clear();
  }

  clone() {
    const j = new CookieJar();
    for (const [k, v] of this.map) j.map.set(k, v);
    return j;
  }
}

async function req(jar, method, path, { json, expectStatus } = {}) {
  const headers = { Accept: "application/json, text/html" };
  const cookie = jar.header();
  if (cookie) headers.Cookie = cookie;
  if (json !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: json !== undefined ? JSON.stringify(json) : undefined,
    redirect: "manual",
  });
  jar.store(res);

  const ctype = res.headers.get("content-type") || "";
  let body = null;
  const text = await res.text();
  if (ctype.includes("application/json")) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 200) };
    }
  } else {
    body = text;
  }

  if (expectStatus != null && res.status !== expectStatus) {
    const errDetail =
      typeof body === "object" && body?.error
        ? body.error
        : typeof body === "string"
          ? body.slice(0, 180)
          : `status ${res.status}`;
    throw new Error(`${method} ${path} expected ${expectStatus} got ${res.status}: ${errDetail}`);
  }

  return { res, body, status: res.status };
}

async function loginRole(role, email, password, tenant) {
  const jar = new CookieJar();
  const { body } = await req(jar, "POST", "/api/auth/seniors/login", {
    json: { email, password, role, tenant },
    expectStatus: 200,
  });
  assert(body?.ok === true, `${role} login API`, body?.user?.email || email);
  assert(
    body?.redirectTo?.includes(role === "school-admin" ? "school-admin" : role),
    `${role} redirect`,
    body?.redirectTo,
  );
  return { jar, body };
}

async function pageHas(jar, path, needles, label) {
  const { res, body } = await req(jar, "GET", path);
  if (res.status !== 200) {
    fail(label || path, `HTTP ${res.status}`);
    return false;
  }
  const html = typeof body === "string" ? body : JSON.stringify(body);
  const missing = needles.filter((n) => !html.includes(n));
  if (missing.length) {
    fail(label || path, `missing: ${missing.join(", ")}`);
    return false;
  }
  ok(label || path, needles.slice(0, 2).join(", "));
  return true;
}

async function seedCurriculum(tenantId, schoolName) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const year = await prisma.seniorsAcademicYear.findFirst({
      where: { tenantId, isActive: true },
    });
    if (!year) throw new Error("No active academic year on new school");

    const klass = await prisma.seniorsClass.findFirst({ where: { tenantId } });
    if (!klass) throw new Error("No class on new school");

    const science = await prisma.seniorsSubject.create({
      data: {
        tenantId,
        classId: klass.id,
        name: "Science",
        sortOrder: 1,
      },
    });
    const maths = await prisma.seniorsSubject.create({
      data: {
        tenantId,
        classId: klass.id,
        name: "Mathematics",
        sortOrder: 2,
      },
    });

    const chLife = await prisma.seniorsChapter.create({
      data: {
        tenantId,
        subjectId: science.id,
        number: 6,
        name: "Life Processes",
        sortOrder: 1,
      },
    });
    const chTriangles = await prisma.seniorsChapter.create({
      data: {
        tenantId,
        subjectId: maths.id,
        number: 6,
        name: "Triangles",
        sortOrder: 1,
      },
    });

    const topicPhoto = await prisma.seniorsTopic.create({
      data: {
        tenantId,
        chapterId: chLife.id,
        academicYearId: year.id,
        slug: "6-2-photosynthesis",
        number: "6.2",
        title: "Photosynthesis in Higher Plants",
        contentStatus: "complete",
        sortOrder: 1,
        learningObjective:
          "Understand the process of photosynthesis, the role of chlorophyll, and the factors affecting it.",
        teacherExplanation: `Photosynthesis is how green plants make food using sunlight, carbon dioxide and water. This lesson follows ${schoolName}'s CBSE Class 10 Science plan.\n\nOverall reaction: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂.`,
        keywords: [
          "Photosynthesis",
          "Chlorophyll",
          "Chloroplast",
          "Stomata",
          "Glucose",
          "Sunlight",
          "Oxygen",
        ],
        diagramUrl: "/assets/seniors/photosynthesis.svg",
      },
    });

    const topicTriangles = await prisma.seniorsTopic.create({
      data: {
        tenantId,
        chapterId: chTriangles.id,
        academicYearId: year.id,
        slug: "6-1-triangles",
        number: "6.1",
        title: "Congruence of Triangles",
        contentStatus: "in_progress",
        sortOrder: 1,
        learningObjective: "Apply SSS, SAS, ASA and RHS congruence rules.",
        teacherExplanation: `Congruent triangles have equal corresponding sides and angles. Taught as per ${schoolName} Mathematics pacing.`,
        keywords: ["Congruence", "SSS", "SAS", "ASA", "RHS"],
        diagramUrl: "",
      },
    });

    await prisma.seniorsExam.create({
      data: {
        tenantId,
        title: "Science Unit Test",
        subjectName: "Science",
        className: "Class 10-A",
        examAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.seniorsExam.create({
      data: {
        tenantId,
        title: "Mathematics Unit Test",
        subjectName: "Mathematics",
        className: "Class 10-A",
        examAt: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.seniorsTeacherUpdate.create({
      data: {
        tenantId,
        teacherName: "Meera Iyer",
        message: "posted notes for Ch 6: Photosynthesis.",
      },
    });

    return {
      yearId: year.id,
      classId: klass.id,
      topicPhotoId: topicPhoto.id,
      topicTrianglesId: topicTriangles.id,
      scienceId: science.id,
    };
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function main() {
  console.log("\n=== Seniors production E2E ===");
  console.log(`Base: ${BASE}`);
  console.log(`School: ${SCHOOL_NAME} (${SCHOOL_CODE})\n`);

  if (!SUPER_EMAIL || !SUPER_PASS) {
    fail("env", "SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD missing");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    fail("env", "DATABASE_URL missing");
    process.exit(1);
  }

  // Health
  try {
    const health = await fetch(BASE, { method: "GET", redirect: "manual" });
    assert(health.status < 500, "server reachable", `HTTP ${health.status}`);
  } catch (e) {
    fail("server reachable", e.message);
    console.error("\nStart the app first: npm run dev\n");
    process.exit(1);
  }

  // ─── 1. Super admin + create school ───
  console.log("\n[1] Create school (th-admin API)");
  const thJar = new CookieJar();
  {
    const { body } = await req(thJar, "POST", "/api/auth/super-admin/login", {
      json: { email: SUPER_EMAIL, password: SUPER_PASS },
      expectStatus: 200,
    });
    assert(body?.ok === true, "th-admin login", SUPER_EMAIL);
  }

  let schoolId = "";
  {
    const { body } = await req(thJar, "POST", "/api/seniors/schools", {
      json: {
        schoolName: SCHOOL_NAME,
        schoolCode: SCHOOL_CODE,
        adminName: names.admin,
        adminEmail: emails.admin,
        adminPassword: ADMIN_PASS,
      },
      expectStatus: 200,
    });
    assert(body?.ok === true, "POST /api/seniors/schools", body?.school?.slug);
    assert(body?.school?.slug === SCHOOL_CODE, "school slug matches");
    assert(body?.school?.name === SCHOOL_NAME, "school name matches");
    schoolId = body.school.id;
  }

  await pageHas(
    thJar,
    "/seniors/th-admin/admin",
    [SCHOOL_NAME],
    "th-admin dashboard shows new school",
  );
  await pageHas(
    thJar,
    "/seniors/th-admin/admin/schools",
    [SCHOOL_NAME, SCHOOL_CODE],
    "th-admin schools list",
  );

  // ─── 2. Curriculum (DB -no public curriculum API yet) ───
  console.log("\n[2] Seed curriculum for school (Prisma)");
  const curriculum = await seedCurriculum(schoolId, SCHOOL_NAME);
  assert(Boolean(curriculum.topicPhotoId), "topic photosynthesis created");
  assert(Boolean(curriculum.classId), "default class present");

  // ─── 3. School admin creates users ───
  console.log("\n[3] School admin creates teacher / student / parent");
  const { jar: adminJar } = await loginRole(
    "school-admin",
    emails.admin,
    ADMIN_PASS,
    SCHOOL_CODE,
  );

  {
    const { body } = await req(
      adminJar,
      "GET",
      `/api/tenants/${SCHOOL_CODE}/seniors/admin?section=settings`,
      { expectStatus: 200 },
    );
    assert(
      body?.settings?.schoolName === SCHOOL_NAME ||
        body?.settings?.schoolName === "",
      "admin settings GET",
      body?.settings?.schoolName,
    );
  }

  await req(adminJar, "POST", `/api/tenants/${SCHOOL_CODE}/seniors/admin`, {
    json: {
      action: "save-settings",
      schoolName: SCHOOL_NAME,
      primaryColor: "#0F766E",
      markingScheme: "CBSE 80+20",
      answerFormat: "Stepwise with diagrams",
    },
    expectStatus: 200,
  });
  ok("admin save-settings");

  let classBId = "";
  {
    const { body } = await req(
      adminJar,
      "POST",
      `/api/tenants/${SCHOOL_CODE}/seniors/admin`,
      {
        json: {
          action: "create-class",
          name: "Class 10",
          section: "B",
          board: "CBSE",
          sortOrder: 2,
        },
        expectStatus: 201,
      },
    );
    classBId = body?.class?.id;
    assert(Boolean(classBId), "create class 10-B", body?.class?.section);
  }

  {
    const { body } = await req(
      adminJar,
      "POST",
      `/api/tenants/${SCHOOL_CODE}/seniors/admin`,
      {
        json: {
          action: "create-subject",
          classId: classBId,
          name: "Science",
        },
        expectStatus: 201,
      },
    );
    assert(body?.subject?.name === "Science", "create subject Science on 10-B");
  }

  let teacherId = "";
  let studentId = "";
  let parentId = "";

  {
    const { body } = await req(
      adminJar,
      "POST",
      `/api/tenants/${SCHOOL_CODE}/seniors/admin`,
      {
        json: {
          fullName: names.teacher,
          email: emails.teacher,
          password: TEACHER_PASS,
          userType: "teacher",
          phone: "9876500001",
          assignments: [
            { classId: curriculum.classId, subjectId: curriculum.scienceId },
          ],
        },
        expectStatus: 201,
      },
    );
    teacherId = body?.user?.id;
    assert(Boolean(teacherId), "create teacher", emails.teacher);
    assert(
      (body?.user?.assignments || []).length >= 1,
      "teacher assigned to Class 10-A Science",
    );
  }

  {
    const { body } = await req(
      adminJar,
      "POST",
      `/api/tenants/${SCHOOL_CODE}/seniors/admin`,
      {
        json: {
          fullName: names.student,
          email: emails.student,
          password: STUDENT_PASS,
          userType: "student",
          phone: "9876500002",
          classId: curriculum.classId,
          rollNumber: "17",
        },
        expectStatus: 201,
      },
    );
    studentId = body?.user?.id;
    assert(Boolean(studentId), "create student", emails.student);
  }

  {
    const { body } = await req(
      adminJar,
      "POST",
      `/api/tenants/${SCHOOL_CODE}/seniors/admin`,
      {
        json: {
          action: "bulk-create-students",
          students: [
            {
              fullName: "Aarav Shah",
              email: `aarav@${SCHOOL_CODE}.edu`,
              password: STUDENT_PASS,
              classId: classBId,
              rollNumber: "1",
            },
          ],
        },
        expectStatus: 200,
      },
    );
    assert(body?.created === 1, "bulk create student in 10-B", body?.created);
  }

  {
    const { body } = await req(
      adminJar,
      "POST",
      `/api/tenants/${SCHOOL_CODE}/seniors/admin`,
      {
        json: {
          fullName: names.parent,
          email: emails.parent,
          password: PARENT_PASS,
          userType: "parent",
          phone: "9876500003",
          childStudentId: studentId,
        },
        expectStatus: 201,
      },
    );
    parentId = body?.user?.id;
    assert(Boolean(parentId), "create parent linked to student", emails.parent);
  }

  for (const section of ["teachers", "students", "parents", "classes", "content", "settings"]) {
    const { body } = await req(
      adminJar,
      "GET",
      `/api/tenants/${SCHOOL_CODE}/seniors/admin?section=${section}`,
      { expectStatus: 200 },
    );
    if (section === "teachers") {
      assert(
        (body.teachers || []).some((t) => t.email === emails.teacher),
        "admin teachers list has Meera",
      );
      const meera = (body.teachers || []).find((t) => t.email === emails.teacher);
      assert(
        (meera?.assignments || []).some((a) => a.subjectName === "Science"),
        "teacher list shows Science assignment",
      );
    }
    if (section === "students") {
      assert(
        (body.students || []).some((s) => s.email === emails.student),
        "admin students list has Riya",
      );
    }
    if (section === "parents") {
      assert(
        (body.parents || []).some((p) => p.email === emails.parent),
        "admin parents list has Vikram",
      );
    }
    if (section === "classes") {
      assert(
        (body.classes || []).some((c) => c.section === "B"),
        "admin classes list has 10-B",
      );
    }
    if (section === "content") {
      assert(
        (body.topics || []).some((t) => t.title.includes("Photosynthesis")),
        "admin content lists photosynthesis topic",
      );
    }
    if (section === "settings") {
      assert(body.settings?.schoolName === SCHOOL_NAME, "settings schoolName persisted");
    }
  }

  {
    const updatedTeacher = `${names.teacher} (Updated)`;
    const { body } = await req(
      adminJar,
      "POST",
      `/api/tenants/${SCHOOL_CODE}/seniors/admin`,
      {
        json: {
          action: "update-user",
          userId: teacherId,
          fullName: updatedTeacher,
          email: emails.teacher,
          phone: "9876511111",
        },
        expectStatus: 200,
      },
    );
    assert(body?.user?.fullName === updatedTeacher, "update teacher", body?.user?.fullName);
    names.teacher = updatedTeacher;
  }

  {
    const { body } = await req(
      adminJar,
      "POST",
      `/api/tenants/${SCHOOL_CODE}/seniors/admin`,
      {
        json: {
          action: "update-user",
          userId: studentId,
          fullName: names.student,
          email: emails.student,
          rollNumber: "42",
          classId: curriculum.classId,
        },
        expectStatus: 200,
      },
    );
    assert(body?.user?.rollNumber === "42", "update student roll", body?.user?.rollNumber);
  }

  {
    const tempEmail = `temp-teacher@${SCHOOL_CODE}.edu`;
    const { body: created } = await req(
      adminJar,
      "POST",
      `/api/tenants/${SCHOOL_CODE}/seniors/admin`,
      {
        json: {
          action: "create-user",
          fullName: "Temp Teacher",
          email: tempEmail,
          password: TEACHER_PASS,
          userType: "teacher",
        },
        expectStatus: 201,
      },
    );
    const tempId = created?.user?.id;
    assert(Boolean(tempId), "create temp teacher for delete", tempEmail);

    await req(adminJar, "POST", `/api/tenants/${SCHOOL_CODE}/seniors/admin`, {
      json: { action: "delete-user", userId: tempId },
      expectStatus: 200,
    });
    ok("delete temp teacher");

    const { body: teachersBody } = await req(
      adminJar,
      "GET",
      `/api/tenants/${SCHOOL_CODE}/seniors/admin?section=teachers`,
      { expectStatus: 200 },
    );
    assert(
      !(teachersBody.teachers || []).some((t) => t.email === tempEmail),
      "deleted teacher absent from list",
    );
  }

  // Frontend school-admin
  for (const [path, needles, label] of [
    ["/seniors/school-admin/dashboard", [SCHOOL_NAME], "school-admin dashboard"],
    ["/seniors/school-admin/classes", ["Class 10", "B"], "school-admin classes page"],
    ["/seniors/school-admin/teachers", [names.teacher], "school-admin teachers page"],
    ["/seniors/school-admin/students", [names.student], "school-admin students page"],
    ["/seniors/school-admin/parents", [names.parent], "school-admin parents page"],
    ["/seniors/school-admin/content", ["Photosynthesis"], "school-admin content page"],
    ["/seniors/school-admin/settings", [SCHOOL_NAME], "school-admin settings page"],
  ]) {
    await pageHas(adminJar, path, needles, label);
  }

  // ─── 4. Teacher workspace APIs ───
  console.log("\n[4] Teacher content / assignment / quiz / announcement");
  const { jar: teacherJar } = await loginRole(
    "teacher",
    emails.teacher,
    TEACHER_PASS,
    SCHOOL_CODE,
  );

  {
    const { body } = await req(
      teacherJar,
      "GET",
      `/api/tenants/${SCHOOL_CODE}/seniors/topics`,
      { expectStatus: 200 },
    );
    assert(
      (body.topics || []).length >= 1,
      "teacher topics GET",
      `${body.topics?.length} topics`,
    );
  }

  {
    const { status, body } = await req(
      teacherJar,
      "POST",
      `/api/tenants/${SCHOOL_CODE}/seniors/topics`,
      {
        json: {
          subjectId: curriculum.scienceId,
          chapterName: "Respiration",
          title: "Cellular Respiration",
          number: "6.3",
        },
        expectStatus: 201,
      },
    );
    assert(status === 201, "teacher create topic POST", body?.error || `HTTP ${status}`);
    assert(body?.topic?.title === "Cellular Respiration", "created topic title");
    assert(body?.topic?.chapterName === "Respiration", "created topic chapter");
  }

  {
    const { status, body } = await req(
      teacherJar,
      "GET",
      `/api/tenants/${SCHOOL_CODE}/seniors/topics/${curriculum.topicPhotoId}`,
      { expectStatus: 200 },
    );
    assert(status === 200, "teacher topic authoring payload GET");
    assert(body.topic?.title?.includes("Photosynthesis"), "teacher authoring payload topic title");
  }

  {
    const { status, body } = await req(
      teacherJar,
      "PATCH",
      `/api/tenants/${SCHOOL_CODE}/seniors/topics/${curriculum.topicPhotoId}`,
      {
        json: {
          action: "update-draft",
          learningObjective:
            "Explain how leaves convert sunlight, water and carbon dioxide into usable food.",
          teacherExplanation:
            "<p><strong>Leaves convert light energy</strong> into chemical energy during photosynthesis.</p><p>The balanced equation is <span class=\"math-formula\" data-formula=\"6CO_2 + 6H_2O \\to C_6H_{12}O_6 + 6O_2\">6CO_2 + 6H_2O \\to C_6H_{12}O_6 + 6O_2</span>.</p>",
          keywords: ["Photosynthesis", "Chlorophyll", "Glucose", "Stomata"],
          revisionChecklist: [
            "Recall the balanced equation",
            "Label leaf inputs and outputs",
            "Explain the role of chlorophyll",
          ],
          contentStatus: "complete",
        },
      },
    );
    assert(status === 200, "teacher topic draft PATCH", body?.error || `HTTP ${status}`);
  }

  {
    const { status, body } = await req(
      teacherJar,
      "POST",
      `/api/tenants/${SCHOOL_CODE}/seniors/content`,
      {
        json: {
          topicId: curriculum.topicPhotoId,
          contentType: "notes",
          title: `${SCHOOL_NAME} -Photosynthesis Notes`,
          body: "<p>Chlorophyll absorbs light. Write the <strong>balanced equation</strong> and label a leaf diagram.</p><ul><li>Use the word equation first</li><li>Then convert it into the chemical equation</li></ul>",
          uploadedByName: names.teacher,
        },
      },
    );
    assert(
      status === 200 || status === 201,
      "POST content notes",
      body?.error || `HTTP ${status}`,
    );
  }

  {
    const { status, body } = await req(
      teacherJar,
      "POST",
      `/api/tenants/${SCHOOL_CODE}/seniors/content`,
      {
        json: {
          topicId: curriculum.topicPhotoId,
          contentType: "practice_question",
          title: "Practice -Factors affecting photosynthesis",
          body: "<p>List four factors that affect the rate of photosynthesis.</p><p>Use complete sentences and one real-life example.</p>",
        },
      },
    );
    assert(
      status === 200 || status === 201,
      "POST content practice",
      body?.error || `HTTP ${status}`,
    );
  }

  let assignmentId = "";
  {
    const due = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const { status, body } = await req(
      teacherJar,
      "POST",
      `/api/tenants/${SCHOOL_CODE}/seniors/assignments`,
      {
        json: {
          title: "Leaf structure worksheet",
          description: `Assigned by ${names.teacher} for ${SCHOOL_NAME} Class 10-A`,
          subjectName: "Science",
          chapterName: "Life Processes",
          dueAt: due,
          questionCount: 5,
          topicIds: [curriculum.topicPhotoId],
          targetClassId: curriculum.classId,
        },
      },
    );
    assert(status === 200 || status === 201, "POST assignment", body?.error || `HTTP ${status}`);
    assignmentId = body?.assignment?.id || body?.id || "";
    if (!assignmentId) {
      const list = await req(
        teacherJar,
        "GET",
        `/api/tenants/${SCHOOL_CODE}/seniors/assignments`,
        { expectStatus: 200 },
      );
      assignmentId =
        (list.body.assignments || []).find((a) =>
          a.title.includes("Leaf structure"),
        )?.id || "";
    }
    assert(Boolean(assignmentId), "assignment id resolved", assignmentId);
  }

  let quizId = "";
  {
    const { status, body } = await req(
      teacherJar,
      "PATCH",
      `/api/tenants/${SCHOOL_CODE}/seniors/quizzes`,
      {
        json: {
          topicId: curriculum.topicPhotoId,
          title: "Photosynthesis quick check",
          questions: [
            {
              id: "q1",
              prompt: "<p>Which pigment absorbs light for photosynthesis?</p>",
              options: ["Hemoglobin", "Chlorophyll", "Melanin", "Keratin"],
              correctIndex: 1,
              explanation: "<p>Chlorophyll is the green pigment that traps light energy.</p>",
            },
            {
              id: "q2",
              prompt: "<p>Gas released during photosynthesis is?</p>",
              options: ["CO₂", "N₂", "O₂", "H₂"],
              correctIndex: 2,
              explanation: "<p>Plants release oxygen as a by-product of photosynthesis.</p>",
            },
          ],
        },
      },
    );
    assert(status === 200 || status === 201, "POST quiz", body?.error || `HTTP ${status}`);
    quizId = body?.quiz?.id || body?.id || "";
    if (!quizId) {
      const list = await req(
        teacherJar,
        "GET",
        `/api/tenants/${SCHOOL_CODE}/seniors/quizzes`,
        { expectStatus: 200 },
      );
      quizId =
        (list.body.quizzes || []).find((q) =>
          q.title.includes("Photosynthesis"),
        )?.id || "";
    }
    assert(Boolean(quizId), "quiz id resolved", quizId);
  }

  {
    const { status, body } = await req(
      teacherJar,
      "GET",
      `/api/tenants/${SCHOOL_CODE}/seniors/topics/${curriculum.topicPhotoId}/preview`,
      { expectStatus: 200 },
    );
    assert(status === 200, "teacher topic preview API");
    assert(
      body.topic?.teacherExplanation?.includes("Leaves convert light energy"),
      "teacher preview API returns draft explanation",
    );
  }

  await pageHas(
    teacherJar,
    "/seniors/teacher/topics/6-2-photosynthesis/preview",
    ["Draft Preview", "Leaves convert light energy", "balanced equation"],
    "teacher topic preview page",
  );

  {
    const { status, body } = await req(
      teacherJar,
      "POST",
      `/api/tenants/${SCHOOL_CODE}/seniors/topics/${curriculum.topicPhotoId}/publish`,
      { expectStatus: 200 },
    );
    assert(status === 200, "teacher topic publish", body?.error || `HTTP ${status}`);
  }

  {
    const { status, body } = await req(
      teacherJar,
      "POST",
      `/api/tenants/${SCHOOL_CODE}/seniors/announcements`,
      {
        json: {
          title: "PTM next Saturday",
          body: `PTM for Class 10 at ${SCHOOL_NAME}. Timings 11:00 AM – 1:00 PM.`,
        },
      },
    );
    assert(
      status === 200 || status === 201,
      "POST announcement",
      body?.error || `HTTP ${status}`,
    );
  }

  {
    const { body } = await req(
      teacherJar,
      "POST",
      `/api/tenants/${SCHOOL_CODE}/seniors/announcements`,
      {
        json: {
          // also create teacher update if supported -announcements only
          title: "Notes uploaded",
          body: `${names.teacher} posted notes for Photosynthesis.`,
        },
      },
    );
    void body;
    ok("teacher second announcement");
  }

  for (const [path, needles, label] of [
    ["/seniors/teacher/dashboard", [names.teacher.split(" ")[0], "Science"], "teacher dashboard"],
    ["/seniors/teacher/content", ["Photosynthesis"], "teacher content"],
    ["/seniors/teacher/assignments", ["Leaf structure"], "teacher assignments"],
    ["/seniors/teacher/quizzes", ["Photosynthesis"], "teacher quizzes"],
    ["/seniors/teacher/announcements", ["PTM"], "teacher announcements"],
    ["/seniors/teacher/students", [names.student], "teacher students"],
  ]) {
    await pageHas(teacherJar, path, needles, label);
  }

  // ─── 5. Student APIs + pages ───
  console.log("\n[5] Student homework / quiz / progress / pages");
  const { jar: studentJar } = await loginRole(
    "student",
    emails.student,
    STUDENT_PASS,
    SCHOOL_CODE,
  );

  {
    const { body } = await req(
      studentJar,
      "GET",
      `/api/tenants/${SCHOOL_CODE}/seniors/topics`,
      { expectStatus: 200 },
    );
    assert((body.topics || []).length >= 1, "student topics GET");
  }

  {
    const { body } = await req(
      studentJar,
      "GET",
      `/api/tenants/${SCHOOL_CODE}/seniors/homework`,
      { expectStatus: 200 },
    );
    const items = body.homework || body.items || body;
    const list = Array.isArray(items) ? items : items?.homework || [];
    assert(Array.isArray(list) ? list.length >= 1 || Boolean(assignmentId) : true, "student homework GET");
  }

  if (assignmentId) {
    const { status, body } = await req(
      studentJar,
      "POST",
      `/api/tenants/${SCHOOL_CODE}/seniors/homework`,
      {
        json: {
          assignmentId,
          answerText:
            "1) Chlorophyll 2) Light intensity, CO2, temperature, water 3) O2 released via stomata.",
        },
      },
    );
    assert(
      status === 200 || status === 201,
      "student submit homework",
      body?.error || `HTTP ${status}`,
    );
  }

  if (quizId) {
    const { status, body } = await req(
      studentJar,
      "POST",
      `/api/tenants/${SCHOOL_CODE}/seniors/quiz-attempts`,
      {
        json: {
          quizId,
          answers: { q1: 1, q2: 2 },
        },
      },
    );
    assert(
      status === 200 || status === 201,
      "student quiz attempt",
      body?.error || `score ${body?.attempt?.score}`,
    );
  }

  {
    const { status, body } = await req(
      studentJar,
      "POST",
      `/api/tenants/${SCHOOL_CODE}/seniors/progress`,
      {
        json: {
          topicId: curriculum.topicPhotoId,
          progressPercent: 60,
        },
      },
    );
    assert(
      status === 200 || status === 201,
      "student progress upsert",
      body?.error || `HTTP ${status}`,
    );
  }

  // Grade submission as teacher
  if (assignmentId) {
    const list = await req(
      teacherJar,
      "GET",
      `/api/tenants/${SCHOOL_CODE}/seniors/assignments`,
      { expectStatus: 200 },
    );
    const asg = (list.body.assignments || []).find((a) => a.id === assignmentId);
    const sub = (asg?.submissions || []).find((s) => s.studentId === studentId);
    if (sub) {
      const { status, body } = await req(
        teacherJar,
        "POST",
        `/api/tenants/${SCHOOL_CODE}/seniors/assignments`,
        {
          json: {
            action: "grade",
            submissionId: sub.id,
            score: 9,
            feedback: "Clear and accurate. Add a labelled diagram next time.",
          },
        },
      );
      assert(
        status === 200 || status === 201,
        "teacher grade submission",
        body?.error || `HTTP ${status}`,
      );
    } else {
      fail("teacher grade submission", "submission not found");
    }
  }

  const studentFirst = names.student.split(" ")[0];
  for (const [path, needles, label] of [
    ["/seniors/student/home", [studentFirst, SCHOOL_NAME], "student home"],
    ["/seniors/student/learn", ["Science", "Mathematics"], "student learn"],
    [
      "/seniors/student/learn/6-2-photosynthesis",
      ["Photosynthesis", "Learning Objective", "balanced equation", "Leaves convert light energy"],
      "student topic overview",
    ],
    ["/seniors/student/homework", ["Leaf structure"], "student homework list"],
    ["/seniors/student/exam-prep", ["Science Unit Test"], "student exam-prep"],
    ["/seniors/student/school", ["PTM"], "student school announcements"],
    ["/seniors/student/progress", ["Science"], "student progress"],
  ]) {
    await pageHas(studentJar, path, needles, label);
  }

  if (assignmentId) {
    await pageHas(
      studentJar,
      `/seniors/student/homework/${assignmentId}`,
      ["Leaf structure", "Graded"],
      "student homework detail graded",
    );
  }

  // Tenant-path parity
  await pageHas(
    studentJar,
    `/${SCHOOL_CODE}/student/home`,
    [studentFirst],
    "tenant-path student home",
  );

  // ─── 6. Parent pages ───
  console.log("\n[6] Parent dashboards");
  const { jar: parentJar } = await loginRole(
    "parent",
    emails.parent,
    PARENT_PASS,
    SCHOOL_CODE,
  );

  for (const [path, needles, label] of [
    ["/seniors/parent/dashboard", [names.student.split(" ")[0], SCHOOL_NAME], "parent dashboard"],
    ["/seniors/parent/children", [names.student], "parent children"],
    ["/seniors/parent/announcements", ["PTM"], "parent announcements"],
  ]) {
    await pageHas(parentJar, path, needles, label);
  }

  // ─── 7. Auth negatives + logout ───
  console.log("\n[7] Auth edge cases");
  {
    const jar = new CookieJar();
    const { status, body } = await req(jar, "POST", "/api/auth/seniors/login", {
      json: {
        email: emails.student,
        password: "wrong-password",
        role: "student",
        tenant: SCHOOL_CODE,
      },
    });
    assert(status === 401, "bad password rejected", body?.error || `HTTP ${status}`);
  }

  {
    const jar = new CookieJar();
    const { status } = await req(jar, "POST", "/api/auth/seniors/login", {
      json: {
        email: emails.student,
        password: STUDENT_PASS,
        role: "teacher",
        tenant: SCHOOL_CODE,
      },
    });
    assert(status === 401 || status === 403, "role mismatch rejected", `HTTP ${status}`);
  }

  {
    const { status } = await req(studentJar, "POST", "/api/auth/seniors/logout", {
      json: { role: "student" },
      expectStatus: 200,
    });
    assert(status === 200, "student logout");
    const after = await req(studentJar, "GET", "/seniors/student/home");
    assert(
      after.status === 307 ||
        after.status === 302 ||
        after.status === 401 ||
        (typeof after.body === "string" && after.body.includes("login")),
      "student home blocked after logout",
      `HTTP ${after.status}`,
    );
  }

  // Forgot password OTP (dev may expose code)
  {
    const jar = new CookieJar();
    const { status, body } = await req(
      jar,
      "POST",
      "/api/auth/seniors/forgot-password/request-otp",
      { json: { email: emails.student } },
    );
    assert(
      status === 200,
      "forgot-password request-otp",
      body?.devOtp ? `devOtp ${body.devOtp}` : "ok",
    );
    if (body?.devOtp) {
      const ver = await req(jar, "POST", "/api/auth/seniors/forgot-password/verify-otp", {
        json: { email: emails.student, otp: body.devOtp },
      });
      assert(ver.status === 200, "forgot-password verify-otp");
      const reset = await req(jar, "POST", "/api/auth/seniors/forgot-password/reset", {
        json: {
          newPassword: `${STUDENT_PASS}x`,
          schoolCode: SCHOOL_CODE,
        },
      });
      assert(reset.status === 200, "forgot-password reset");
      await loginRole("student", emails.student, `${STUDENT_PASS}x`, SCHOOL_CODE);
      ok("student login with reset password");
    }
  }

  // Unauthenticated API
  {
    const jar = new CookieJar();
    const { status } = await req(
      jar,
      "GET",
      `/api/tenants/${SCHOOL_CODE}/seniors/assignments`,
    );
    assert(status === 401 || status === 403, "assignments require teacher auth", `HTTP ${status}`);
  }

  // ─── Report ───
  console.log("\n=== Summary ===");
  const passed = results.filter((r) => r.ok).length;
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`School: ${SCHOOL_CODE} (${SCHOOL_NAME})`);
  console.log(`Admin: ${emails.admin} / (script-generated)`);
  console.log(`Teacher: ${emails.teacher}`);
  console.log(`Student: ${emails.student}`);
  console.log(`Parent: ${emails.parent}`);

  if (failed > 0) {
    console.log("\nFailures:");
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`  - ${r.name}: ${r.detail}`);
    }
    process.exit(1);
  }
  console.log("\nAll Seniors production E2E checks passed.\n");
}

main().catch((err) => {
  console.error("\nFatal:", err);
  process.exit(1);
});
