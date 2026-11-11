import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listPlatformBroadcasts, listSeniorsSchools } from "@/application/seniors/seniors-product-admin";
import { requireSuperAdminApi } from "@/infrastructure/auth/super-admin-guard";
import { logPlatformAction } from "@/infrastructure/seniors/platform-audit";
import { broadcastAnnouncement } from "@/infrastructure/seniors/seniors-platform-mutations";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ broadcasts: await listPlatformBroadcasts() });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as {
      title?: string;
      body?: string;
      schools?: "all" | string[];
      audienceRoles?: string[];
    };
    const tenantIds =
      body.schools === "all" || !Array.isArray(body.schools)
        ? (await listSeniorsSchools()).filter((s) => s.status === "active").map((s) => s.id)
        : body.schools;

    const result = await broadcastAnnouncement({
      tenantIds,
      title: body.title ?? "",
      body: body.body ?? "",
      audienceRoles: body.audienceRoles ?? ["student", "teacher", "parent"],
    });

    await logPlatformAction(auth, "broadcast.send", {
      summary: body.title?.trim() ?? "",
      metadata: {
        title: body.title?.trim() ?? "",
        body: body.body?.trim() ?? "",
        schoolCount: result.schoolCount,
        audienceRoles: result.roles,
      },
    });
    return NextResponse.json({ ok: true, ...result, broadcasts: await listPlatformBroadcasts() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
