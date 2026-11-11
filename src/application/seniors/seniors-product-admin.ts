import { getPrismaClient } from "@/infrastructure/database/prisma";
import { contentStatusPercentages } from "@/application/seniors/content-status";
/** Real Seniors schools only -must have school settings. */
export async function listSeniorsSchools() {
  const prisma = getPrismaClient();
  const tenants = await prisma.tenant.findMany({
    where: {
      activeTemplateId: "seniors-platform",
      seniorsSchoolSettings: { isNot: null },
    },
    select: {
      id: true,
      slug: true,
      platformName: true,
      seniorsSchoolSettings: { select: { schoolName: true } },
    },
    orderBy: { platformName: "asc" },
  });

  return Promise.all(
    tenants.map(async (t) => {
      const [students, teachers, parents, topics] = await Promise.all([
        prisma.platformUser.count({ where: { tenantId: t.id, userType: "student" } }),
        prisma.platformUser.count({ where: { tenantId: t.id, userType: "teacher" } }),
        prisma.platformUser.count({ where: { tenantId: t.id, userType: "parent" } }),
        prisma.seniorsTopic.findMany({
          where: { tenantId: t.id },
          select: { contentStatus: true },
        }),
      ]);
      const coverage = contentStatusPercentages(
        topics.map((row) => ({
          contentStatus: row.contentStatus as "complete" | "in_progress" | "missing",
        })),
      );
      return {
        id: t.id,
        slug: t.slug,
        name: t.seniorsSchoolSettings?.schoolName || t.platformName || t.slug,
        students,
        teachers,
        parents,
        coverage,
      };
    }),
  );
}
