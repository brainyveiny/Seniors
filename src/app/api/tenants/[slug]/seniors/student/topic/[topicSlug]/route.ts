import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireStudentApi } from "@/infrastructure/seniors/seniors-api-auth";
import { loadStudentTopicPageData } from "@/application/seniors/student-server";

type RouteContext = { params: Promise<{ slug: string; topicSlug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug, topicSlug } = await context.params;
  const auth = await requireStudentApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const data = await loadStudentTopicPageData(
      auth.tenantId,
      topicSlug,
      auth.session.userId,
    );
    if (!data) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load topic";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
