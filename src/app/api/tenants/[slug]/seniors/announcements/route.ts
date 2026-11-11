import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isApiError,
  requireSchoolAdminApi,
  requireTeacherApi,
} from "@/infrastructure/seniors/seniors-api-auth";
import { createAnnouncement } from "@/infrastructure/seniors/seniors-mutations";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import type { AuthSession } from "@/infrastructure/auth/session";
import { revalidateSeniorsDashboards } from "@/infrastructure/seniors/seniors-dashboard-cache";

type RouteContext = { params: Promise<{ slug: string }> };

async function requireAnnouncementPublisher(
  request: NextRequest,
  slug: string,
): Promise<
  | { session: AuthSession; tenantId: string; source: "school" | "teacher" }
  | NextResponse
> {
  const teacher = await requireTeacherApi(request, slug);
  if (!isApiError(teacher)) {
    return { ...teacher, source: "teacher" };
  }
  const admin = await requireSchoolAdminApi(request, slug);
  if (!isApiError(admin)) {
    return { ...admin, source: "school" };
  }
  return admin;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireAnnouncementPublisher(request, slug);
  if (auth instanceof NextResponse) return auth;

  const prisma = getPrismaClient();
  const announcements = await prisma.seniorsAnnouncement.findMany({
    where: { tenantId: auth.tenantId, source: auth.source },
    orderBy: { publishedAt: "desc" },
  });
  return NextResponse.json({ announcements });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireAnnouncementPublisher(request, slug);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as {
      title?: string;
      body?: string;
      audienceType?: "all" | "roles" | "people";
      audienceRoles?: string[];
      targetClassIds?: string[];
      targetUserIds?: string[];
    };
    if (!body.title?.trim() || !body.body?.trim()) {
      return NextResponse.json({ error: "title and body are required" }, { status: 400 });
    }
    const announcement = await createAnnouncement(auth.tenantId, {
      title: body.title,
      body: body.body,
      createdByName: auth.session.fullName,
      source: auth.source,
      ...(auth.source === "school"
        ? {
            audienceType: body.audienceType,
            audienceRoles: body.audienceRoles,
            targetClassIds: body.targetClassIds,
            targetUserIds: body.targetUserIds,
          }
        : {
            audienceType: body.audienceType === "people" ? "people" : "roles",
            audienceRoles: ["student"],
            targetClassIds:
              body.audienceType === "people" ? [] : body.targetClassIds ?? [],
            targetUserIds:
              body.audienceType === "people" ? body.targetUserIds ?? [] : [],
          }),
    });
    revalidateSeniorsDashboards(auth.tenantId);
    return NextResponse.json({ ok: true, announcement }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to publish announcement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
