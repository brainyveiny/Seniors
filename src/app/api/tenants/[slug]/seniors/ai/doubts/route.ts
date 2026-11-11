import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireStudentApi } from "@/infrastructure/seniors/seniors-api-auth";
import {
  askSeniorsDoubt,
  deleteSeniorsAiThread,
  listSeniorsAiThreads,
  loadSeniorsAiThread,
} from "@/application/seniors/ai-doubt-solver";
import { isSeniorsLlmConfigured, SeniorsLlmError } from "@/infrastructure/ai/seniors-llm";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireStudentApi(request, slug);
  if (isApiError(auth)) return auth;

  const threadId = request.nextUrl.searchParams.get("threadId")?.trim() || undefined;
  const topicId = request.nextUrl.searchParams.get("topicId")?.trim() || undefined;
  const list = request.nextUrl.searchParams.get("list") === "1";

  try {
    if (list) {
      const threads = await listSeniorsAiThreads(auth.tenantId, auth.session.userId);
      return NextResponse.json({ ok: true, threads, configured: isSeniorsLlmConfigured() });
    }
    const thread = await loadSeniorsAiThread(auth.tenantId, auth.session.userId, { threadId, topicId });
    return NextResponse.json({
      ok: true,
      thread,
      configured: isSeniorsLlmConfigured(),
    });
  } catch (error) {
    console.error("[seniors/ai/doubts GET]", error);
    const message = error instanceof Error ? error.message : "Failed to load doubts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireStudentApi(request, slug);
  if (isApiError(auth)) return auth;

  let body: {
    question?: string;
    topicId?: string;
    topicSlug?: string;
    threadId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await askSeniorsDoubt({
      tenantId: auth.tenantId,
      studentId: auth.session.userId,
      question: body.question ?? "",
      topicId: body.topicId?.trim() || undefined,
      topicSlug: body.topicSlug?.trim() || undefined,
      threadId: body.threadId?.trim() || undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[seniors/ai/doubts POST]", error);
    if (error instanceof SeniorsLlmError) {
      return NextResponse.json(
        { error: error.message, retryable: error.retryable },
        { status: error.statusCode },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to answer doubt";
    const status = message.includes("not found") || message.includes("clearer doubt") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireStudentApi(request, slug);
  if (isApiError(auth)) return auth;

  const threadId = request.nextUrl.searchParams.get("threadId")?.trim();
  if (!threadId) {
    return NextResponse.json({ error: "threadId is required" }, { status: 400 });
  }

  try {
    const deleted = await deleteSeniorsAiThread(auth.tenantId, auth.session.userId, threadId);
    if (!deleted) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[seniors/ai/doubts DELETE]", error);
    const message = error instanceof Error ? error.message : "Failed to delete conversation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
