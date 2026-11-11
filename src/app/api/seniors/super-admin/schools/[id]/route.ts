import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSeniorsSchoolDetail } from "@/application/seniors/seniors-product-admin";
import { requireSuperAdminApi } from "@/infrastructure/auth/super-admin-guard";
import { logPlatformAction } from "@/infrastructure/seniors/platform-audit";
import {
  deleteSchool,
  setSchoolStatus,
  updateSchoolBranding,
  updateSchoolProfile,
  type SchoolBrandingInput,
  type SchoolProfileInput,
} from "@/infrastructure/seniors/seniors-platform-mutations";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message === "School not found" ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  const school = await getSeniorsSchoolDetail(id);
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });
  return NextResponse.json({ school });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;

  try {
    const body = (await request.json()) as {
      profile?: SchoolProfileInput;
      branding?: SchoolBrandingInput;
      status?: string;
      suspendedReason?: string;
    };

    if (body.profile) {
      const school = await updateSchoolProfile(id, body.profile);
      await logPlatformAction(auth, "school.update", {
        tenantId: id,
        tenantSlug: school.slug,
        summary: `Updated profile of ${school.platformName}`,
      });
    }

    if (body.branding) {
      const school = await updateSchoolBranding(id, body.branding);
      await logPlatformAction(auth, "school.branding", {
        tenantId: id,
        tenantSlug: school.slug,
        summary: `Updated branding of ${body.branding.schoolName?.trim() || school.platformName}`,
        metadata: { ...body.branding },
      });
    }

    if (body.status === "active" || body.status === "suspended") {
      const school = await setSchoolStatus(id, body.status, body.suspendedReason ?? "");
      await logPlatformAction(auth, body.status === "suspended" ? "school.suspend" : "school.activate", {
        tenantId: id,
        tenantSlug: school.slug,
        summary:
          body.status === "suspended"
            ? `Suspended ${school.platformName}${body.suspendedReason ? `: ${body.suspendedReason}` : ""}`
            : `Re-activated ${school.platformName}`,
      });
    }

    const school = await getSeniorsSchoolDetail(id);
    return NextResponse.json({ ok: true, school });
  } catch (error) {
    return errorResponse(error, "Failed to update school");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;

  try {
    const body = (await request.json().catch(() => ({}))) as { confirmCode?: string };
    const school = await deleteSchool(id, body.confirmCode ?? "");
    await logPlatformAction(auth, "school.delete", {
      tenantId: null,
      tenantSlug: school.slug,
      summary: `Deleted school ${school.platformName} (${school.slug})`,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Failed to delete school");
  }
}
