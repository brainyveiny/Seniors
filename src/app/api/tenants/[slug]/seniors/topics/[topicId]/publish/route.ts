import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireTeacherApi } from "@/infrastructure/seniors/seniors-api-auth";
import { publishTopicDraft } from "@/infrastructure/seniors/seniors-mutations";
import { trackSeniorsEvent } from "@/infrastructure/seniors/seniors-repository";
import { revalidateSeniorsDashboards } from "@/infrastructure/seniors/seniors-dashboard-cache";

type RouteContext = { params: Promise<{ slug: string; topicId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug, topicId } = await context.params;
  const auth = await requireTeacherApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    await publishTopicDraft(auth.tenantId, topicId);
    revalidateSeniorsDashboards(auth.tenantId);
    void trackSeniorsEvent(auth.tenantId, "topic_publish", auth.session.userId, "teacher", {
      topicId,
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to publish topic";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
