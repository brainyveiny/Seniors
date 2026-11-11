import { revalidateTag } from "next/cache";
import { seniorsTenantShellCacheTag } from "@/application/tenant/tenant-server";
import { hashPassword } from "@/infrastructure/auth/password";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { revalidateSeniorsDashboards } from "@/infrastructure/seniors/seniors-dashboard-cache";
import { createSchoolUser } from "@/infrastructure/seniors/seniors-mutations";
import { normalizeHex } from "@/shared/lib/seniors-brand";

const PROFILE_FIELDS = [
  "contactName",
  "contactEmail",
  "contactPhone",
  "city",
  "state",
  "address",
  "internalNotes",
] as const;

export type SchoolProfileInput = Partial<Record<(typeof PROFILE_FIELDS)[number], string>>;

export type SchoolBrandingInput = {
  schoolName?: string;
  logoUrl?: string;
  primaryColor?: string;
  tagline?: string;
};

async function findSchool(tenantId: string) {
  const tenant = await getPrismaClient().tenant.findFirst({
    where: { id: tenantId, activeTemplateId: "seniors-platform" },
    select: { id: true, slug: true, platformName: true, status: true },
  });
  if (!tenant) throw new Error("School not found");
  return tenant;
}

export function revalidateSchoolShell(slug: string, tenantId: string) {
  revalidateTag(seniorsTenantShellCacheTag(slug), { expire: 0 });
  revalidateSeniorsDashboards(tenantId);
}

export async function updateSchoolProfile(tenantId: string, input: SchoolProfileInput) {
  const school = await findSchool(tenantId);
  const data: Record<string, string> = {};
  for (const key of PROFILE_FIELDS) {
    const value = input[key];
    if (typeof value === "string") data[key] = value.trim().slice(0, key === "internalNotes" ? 5000 : 300);
  }
  if (data.contactEmail && !/^\S+@\S+\.\S+$/.test(data.contactEmail)) {
    throw new Error("Contact email looks invalid");
  }
  await getPrismaClient().tenant.update({ where: { id: tenantId }, data });
  return school;
}

export async function updateSchoolBranding(tenantId: string, input: SchoolBrandingInput) {
  const school = await findSchool(tenantId);
  const prisma = getPrismaClient();

  const schoolName = input.schoolName?.trim();
  if (input.schoolName !== undefined && !schoolName) throw new Error("School name is required");

  let primaryColor: string | undefined;
  if (input.primaryColor !== undefined) {
    const hex = normalizeHex(input.primaryColor);
    if (!hex) throw new Error("Primary colour must be a hex value like #2563EB");
    primaryColor = hex;
  }

  const logoUrl = input.logoUrl?.trim();
  if (logoUrl && !/^(https?:\/\/|\/api\/)/.test(logoUrl)) {
    throw new Error("Logo must be an uploaded image or an https:// URL");
  }

  const update = {
    ...(schoolName !== undefined ? { schoolName: schoolName.slice(0, 120) } : {}),
    ...(logoUrl !== undefined ? { logoUrl } : {}),
    ...(primaryColor !== undefined ? { primaryColor } : {}),
    ...(input.tagline !== undefined ? { tagline: input.tagline.trim().slice(0, 160) } : {}),
  };

  await prisma.seniorsSchoolSettings.upsert({
    where: { tenantId },
    create: { tenantId, schoolName: school.platformName, ...update },
    update,
  });
  if (schoolName) {
    await prisma.tenant.update({ where: { id: tenantId }, data: { platformName: schoolName.slice(0, 120) } });
  }

  revalidateSchoolShell(school.slug, tenantId);
  return school;
}

export async function setSchoolStatus(tenantId: string, status: "active" | "suspended", reason = "") {
  const school = await findSchool(tenantId);
  await getPrismaClient().tenant.update({
    where: { id: tenantId },
    data: { status, suspendedReason: status === "suspended" ? reason.trim().slice(0, 300) : "" },
  });
  revalidateSchoolShell(school.slug, tenantId);
  return school;
}

export async function deleteSchool(tenantId: string, confirmCode: string) {
  const school = await findSchool(tenantId);
  if (confirmCode.trim().toLowerCase() !== school.slug) {
    throw new Error("Type the school code exactly to confirm deletion");
  }
  const prisma = getPrismaClient();
  // Rows without a Tenant relation are not covered by onDelete: Cascade.
  await prisma.$transaction([
    prisma.seniorsGamificationEvent.deleteMany({ where: { tenantId } }),
    prisma.seniorsAssignmentSubmission.deleteMany({ where: { tenantId } }),
    prisma.seniorsQuizAttempt.deleteMany({ where: { tenantId } }),
    prisma.seniorsStudentProfile.deleteMany({ where: { tenantId } }),
    prisma.tenant.delete({ where: { id: tenantId } }),
  ]);
  revalidateTag(seniorsTenantShellCacheTag(school.slug), { expire: 0 });
  return school;
}

export async function createSchoolAdminAccount(
  tenantId: string,
  input: { fullName: string; email: string; password: string; phone?: string },
) {
  const school = await findSchool(tenantId);
  if (!input.fullName.trim() || !input.email.trim()) throw new Error("Name and email are required");
  if (input.password.trim().length < 6) throw new Error("Password must be at least 6 characters");
  const user = await createSchoolUser(tenantId, { ...input, userType: "school-admin" });
  return { school, user };
}

export async function updateSchoolAdminAccount(
  tenantId: string,
  userId: string,
  input: { fullName?: string; email?: string; phone?: string; password?: string },
) {
  const school = await findSchool(tenantId);
  const prisma = getPrismaClient();
  const admin = await prisma.platformUser.findFirst({
    where: { id: userId, tenantId, userType: "school-admin" },
  });
  if (!admin) throw new Error("School admin not found");

  const email = input.email?.trim().toLowerCase();
  if (email !== undefined) {
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Email looks invalid");
    const clash = await prisma.platformUser.findFirst({
      where: { tenantId, email, NOT: { id: userId } },
      select: { id: true },
    });
    if (clash) throw new Error("Another account in this school already uses that email");
  }
  if (input.password !== undefined && input.password.trim().length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const user = await prisma.platformUser.update({
    where: { id: userId },
    data: {
      ...(input.fullName?.trim() ? { fullName: input.fullName.trim() } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone.trim() } : {}),
      ...(input.password !== undefined ? { passwordHash: await hashPassword(input.password.trim()) } : {}),
    },
  });
  return { school, user };
}

export async function deleteSchoolAdminAccount(tenantId: string, userId: string) {
  const school = await findSchool(tenantId);
  const prisma = getPrismaClient();
  const admins = await prisma.platformUser.findMany({
    where: { tenantId, userType: "school-admin" },
    select: { id: true, email: true },
  });
  const target = admins.find((a) => a.id === userId);
  if (!target) throw new Error("School admin not found");
  if (admins.length <= 1) throw new Error("A school needs at least one admin. Add another admin first.");
  await prisma.platformUser.delete({ where: { id: userId } });
  return { school, email: target.email };
}

export async function broadcastAnnouncement(input: {
  tenantIds: string[];
  title: string;
  body: string;
  audienceRoles: string[];
}) {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) throw new Error("Title and message are required");

  const roles = [...new Set(input.audienceRoles)].filter(
    (r) => r === "student" || r === "teacher" || r === "parent",
  );
  if (roles.length === 0) throw new Error("Pick at least one audience");
  const everyone = roles.length === 3;

  const prisma = getPrismaClient();
  const schools = await prisma.tenant.findMany({
    where: {
      id: { in: input.tenantIds },
      activeTemplateId: "seniors-platform",
      seniorsSchoolSettings: { isNot: null },
    },
    select: { id: true, slug: true },
  });
  if (schools.length === 0) throw new Error("Pick at least one school");

  await prisma.seniorsAnnouncement.createMany({
    data: schools.map((s) => ({
      tenantId: s.id,
      title: title.slice(0, 200),
      body,
      icon: "megaphone",
      source: "school",
      createdByName: "Seniors Team",
      audienceType: everyone ? "all" : "roles",
      audienceRoles: roles,
    })),
  });
  for (const s of schools) revalidateSeniorsDashboards(s.id);
  return { schoolCount: schools.length, roles };
}
