import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireStudentApi } from "@/infrastructure/seniors/seniors-api-auth";
import {
  getSchoolLeaderboard,
  getStudentGamification,
  pingStudentGamification,
} from "@/application/seniors/gamification";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireStudentApi(request, slug);
  if (isApiError(auth)) return auth;

  const view = request.nextUrl.searchParams.get("view") || "me";
  try {
    if (view === "leaderboard") {
      const board = await getSchoolLeaderboard({
        tenantId: auth.tenantId,
        studentId: auth.session.userId,
      });
      return NextResponse.json({ ok: true, ...board });
    }
    const snapshot = await getStudentGamification(auth.tenantId, auth.session.userId);
    return NextResponse.json({ ok: true, ...snapshot });
  } catch (error) {
    console.error("[seniors/gamification GET]", error);
    return NextResponse.json({ error: "Could not load streak" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireStudentApi(request, slug);
  if (isApiError(auth)) return auth;

  let kind = "visit";
  try {
    const body = (await request.json()) as { kind?: string };
    kind = body.kind?.trim() || "visit";
  } catch {
    kind = "visit";
  }

  try {
    const result = await pingStudentGamification({
      tenantId: auth.tenantId,
      studentId: auth.session.userId,
      kind,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[seniors/gamification POST]", error);
    const message = error instanceof Error ? error.message : "Could not update streak";
    const status = message.includes("Unknown") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
