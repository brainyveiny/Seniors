import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { isApiError, requireStudentApi } from "@/infrastructure/seniors/seniors-api-auth";
import { upsertTopicProgress } from "@/infrastructure/seniors/seniors-mutations";
import { revalidateSeniorsDashboards } from "@/infrastructure/seniors/seniors-dashboard-cache";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireStudentApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const body = (await request.json()) as {
      topicId?: string;
      progressPercent?: number;
      isCompleted?: boolean;
    };
    if (!body.topicId) {
      return NextResponse.json({ error: "topicId is required" }, { status: 400 });
    }

    const row = await upsertTopicProgress(
      auth.tenantId,
      body.topicId,
      auth.session.userId,
      {
        progressPercent: body.progressPercent,
        isCompleted: body.isCompleted,
      },
    );

    revalidateTag(`student-subjects-${auth.tenantId}-${auth.session.userId}`, { expire: 0 });
    revalidateSeniorsDashboards(auth.tenantId);

    return NextResponse.json({
      ok: true,
      progress: {
        topicId: row.topicId,
        progressPercent: row.progressPercent,
        isCompleted: row.isCompleted,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save progress";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
