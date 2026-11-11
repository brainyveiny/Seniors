import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/infrastructure/auth/super-admin-guard";
import { logPlatformAction } from "@/infrastructure/seniors/platform-audit";
import { createSeniorsSchool } from "@/infrastructure/seniors/create-seniors-school";

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as {
      schoolName?: string;
      schoolCode?: string;
      adminName?: string;
      adminEmail?: string;
      adminPassword?: string;
      primaryColor?: string;
      city?: string;
      contactPhone?: string;
    };

    const created = await createSeniorsSchool({
      schoolName: body.schoolName ?? "",
      schoolCode: body.schoolCode,
      adminName: body.adminName ?? "School Admin",
      adminEmail: body.adminEmail ?? "",
      adminPassword: body.adminPassword?.trim() || "demo1234",
      primaryColor: body.primaryColor,
      city: body.city,
      contactPhone: body.contactPhone,
    });

    await logPlatformAction(auth, "school.create", {
      tenantId: created.tenantId,
      tenantSlug: created.slug,
      summary: `Created school ${created.schoolName} (${created.slug})`,
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
