import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SUPER_ADMIN_COOKIE } from "@/infrastructure/auth/auth-constants";
import { verifySuperAdminToken } from "@/infrastructure/auth/super-admin-session";
import { isDatabaseConfigured } from "@/infrastructure/database/prisma";
import { createSeniorsSchool } from "@/infrastructure/seniors/create-seniors-school";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SUPER_ADMIN_COOKIE)?.value;
  const session = token ? await verifySuperAdminToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      schoolName?: string;
      schoolCode?: string;
      adminName?: string;
      adminEmail?: string;
      adminPassword?: string;
    };

    const created = await createSeniorsSchool({
      schoolName: body.schoolName ?? "",
      schoolCode: body.schoolCode,
      adminName: body.adminName ?? "School Admin",
      adminEmail: body.adminEmail ?? "",
      adminPassword: body.adminPassword?.trim() || "demo1234",
    });

    return NextResponse.json({
      ok: true,
      school: {
        id: created.tenantId,
        slug: created.slug,
        name: created.schoolName,
        adminEmail: created.admin.email,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create school";
    const status = message.includes("already taken") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
