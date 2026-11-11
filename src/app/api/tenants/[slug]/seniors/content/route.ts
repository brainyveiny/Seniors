import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireTeacherApi } from "@/infrastructure/seniors/seniors-api-auth";
import {
  createTopicContent,
  deleteTopicContent,
  updateTopicContent,
} from "@/infrastructure/seniors/seniors-mutations";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { getActiveAcademicYearId } from "@/infrastructure/seniors/seniors-repository";
import { trackSeniorsEvent } from "@/infrastructure/seniors/seniors-repository";
import { revalidateSeniorsDashboards } from "@/infrastructure/seniors/seniors-dashboard-cache";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireTeacherApi(request, slug);
  if (isApiError(auth)) return auth;

  const prisma = getPrismaClient();
  const yearId = await getActiveAcademicYearId(auth.tenantId);
  const contents = await prisma.seniorsTopicContent.findMany({
    where: { tenantId: auth.tenantId, ...(yearId ? { academicYearId: yearId } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: { topic: { include: { chapter: { include: { subject: true } } } } },
  });

  return NextResponse.json({
    contents: contents.map((c) => ({
      id: c.id,
      title: c.title,
      contentType: c.contentType,
      topicTitle: c.topic.title,
      subjectName: c.topic.chapter.subject.name,
      chapterName: c.topic.chapter.name,
      uploadedByName: c.uploadedByName,
      updatedAt: c.updatedAt,
    })),
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireTeacherApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const body = (await request.json()) as {
      topicId?: string;
      contentType?: string;
      title?: string;
      body?: string;
      fileUrl?: string;
      bodyFormat?: string;
      learningObjective?: string;
      markingScheme?: string;
      answerFormat?: string;
      keywords?: string[];
      revisionChecklist?: string[];
      teacherExplanation?: string;
      diagramUrl?: string;
      diagrams?: { url: string; caption: string }[];
      contentStatus?: string;
      status?: string;
    };

    if (!body.topicId || !body.contentType || !body.title?.trim()) {
      return NextResponse.json(
        { error: "topicId, contentType and title are required" },
        { status: 400 },
      );
    }

    const status =
      body.status === "draft" || body.status === "published" ? body.status : undefined;

    const content = await createTopicContent(auth.tenantId, {
      topicId: body.topicId,
      contentType: body.contentType,
      title: body.title,
      body: body.body,
      fileUrl: body.fileUrl,
      bodyFormat: body.bodyFormat,
      status,
      uploadedById: auth.session.userId,
      uploadedByName: auth.session.fullName,
      learningObjective: body.learningObjective,
      markingScheme: body.markingScheme,
      answerFormat: body.answerFormat,
      keywords: body.keywords,
      revisionChecklist: body.revisionChecklist,
      teacherExplanation: body.teacherExplanation,
      diagramUrl: body.diagramUrl,
      diagrams: body.diagrams,
      contentStatus: body.contentStatus,
    });

    revalidateSeniorsDashboards(auth.tenantId);
    void trackSeniorsEvent(auth.tenantId, "content_upload", auth.session.userId, "teacher", {
      contentId: content.id,
      topicId: body.topicId,
    }).catch(() => {});

    return NextResponse.json({ ok: true, content }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireTeacherApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const body = (await request.json()) as {
      contentId?: string;
      title?: string;
      body?: string;
      contentType?: string;
      fileUrl?: string;
      sortOrder?: number;
    };

    if (!body.contentId) {
      return NextResponse.json({ error: "contentId is required" }, { status: 400 });
    }

    const content = await updateTopicContent(auth.tenantId, {
      contentId: body.contentId,
      title: body.title,
      body: body.body,
      contentType: body.contentType,
      fileUrl: body.fileUrl,
      sortOrder: body.sortOrder,
    });

    revalidateSeniorsDashboards(auth.tenantId);
    return NextResponse.json({ ok: true, content });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireTeacherApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const contentId = request.nextUrl.searchParams.get("contentId");
    if (!contentId) {
      return NextResponse.json({ error: "contentId is required" }, { status: 400 });
    }
    await deleteTopicContent(auth.tenantId, contentId);
    revalidateSeniorsDashboards(auth.tenantId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
