import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireTenantAdmin } from "@/infrastructure/auth/guards";
import { getPrismaClient } from "@/infrastructure/database/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = await requireTenantAdmin(request, slug);
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.activeTemplateId !== "seniors-platform") {
    return NextResponse.json({ error: "Not a Seniors tenant" }, { status: 404 });
  }

  const topics = await prisma.seniorsTopic.findMany({
    where: { tenantId: tenant.id },
    select: { contentStatus: true },
  });

  return NextResponse.json({
    tenantId: tenant.id,
    topicCount: topics.length,
    contentStatus: topics.reduce(
      (acc, t) => {
        acc[t.contentStatus] = (acc[t.contentStatus] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  });
}
