import { hashPassword } from "@/infrastructure/auth/password";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { resolveSchoolBrandHex } from "@/shared/lib/seniors-brand";

export function slugifySchoolCode(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function createSeniorsSchool(input: {
  schoolName: string;
  schoolCode?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  phone?: string;
  primaryColor?: string;
  city?: string;
  contactPhone?: string;
}) {
  const schoolName = input.schoolName.trim();
  const adminEmail = input.adminEmail.trim().toLowerCase();
  const adminPassword = input.adminPassword.trim();
  const adminName = input.adminName.trim() || "School Admin";
  let schoolCode =
    input.schoolCode?.trim().toLowerCase() || slugifySchoolCode(schoolName);

  if (!schoolName || !adminEmail || !adminPassword || !schoolCode) {
    throw new Error("schoolName, schoolCode, adminEmail and password are required");
  }

  const prisma = getPrismaClient();
  const existing = await prisma.tenant.findUnique({ where: { slug: schoolCode } });
  if (existing) {
    throw new Error("School code already taken. Try a different code.");
  }

  const tenant = await prisma.tenant.create({
    data: {
      slug: schoolCode,
      platformName: schoolName,
      ownerName: adminName,
      activeTemplateId: "seniors-platform",
      initialized: true,
      isPublished: true,
      contactName: adminName,
      contactEmail: adminEmail,
      contactPhone: input.contactPhone?.trim() ?? input.phone?.trim() ?? "",
      city: input.city?.trim() ?? "",
    },
  });

  await prisma.seniorsSchoolSettings.create({
    data: {
      tenantId: tenant.id,
      schoolName,
      primaryColor: resolveSchoolBrandHex(input.primaryColor),
    },
  });

  const year = new Date().getFullYear();
  await prisma.seniorsAcademicYear.create({
    data: {
      tenantId: tenant.id,
      label: `${year}-${String(year + 1).slice(-2)}`,
      isActive: true,
    },
  });

  await prisma.seniorsClass.create({
    data: {
      tenantId: tenant.id,
      name: "Class 10",
      section: "A",
    },
  });

  const adminId = `sca_${Date.now().toString(36)}`;
  const admin = await prisma.platformUser.create({
    data: {
      id: adminId,
      tenantId: tenant.id,
      fullName: adminName,
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      phone: input.phone?.trim() ?? "",
      userType: "school-admin",
      source: "self-signup",
      emailVerified: true,
      joinedAt: new Date(),
    },
  });

  return {
    tenantId: tenant.id,
    slug: tenant.slug,
    schoolName,
    admin,
  };
}
