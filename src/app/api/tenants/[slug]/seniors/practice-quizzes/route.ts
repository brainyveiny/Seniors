import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireStudentApi } from "@/infrastructure/seniors/seniors-api-auth";
import { loadStudentPracticeQuizzes } from "@/application/seniors/student-server";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireStudentApi(request, slug);
  if (isApiError(auth)) return auth;

  const raw = request.nextUrl.searchParams.get("topicIds")?.trim() || "";
  const topicIds = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 20);

  if (topicIds.length === 0) {
    return NextResponse.json({ error: "topicIds is required" }, { status: 400 });
  }

  try {
    const items = await loadStudentPracticeQuizzes(slug, topicIds, {
      tenantId: auth.tenantId,
      studentId: auth.session.userId,
    });
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load practice quizzes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
