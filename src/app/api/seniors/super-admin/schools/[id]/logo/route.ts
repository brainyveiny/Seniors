import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSuperAdminApi } from "@/infrastructure/auth/super-admin-guard";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { storeSeniorsUpload } from "@/infrastructure/storage/seniors-upload";
import {
  ACADEMY_IMAGE_MAX_BYTES,
  ACADEMY_IMAGE_MAX_MB,
  isAllowedAcademyImageMime,
} from "@/shared/lib/academy-image-limits";

type RouteContext = { params: Promise<{ id: string }> };

/** Uploads a logo image; the caller saves the returned URL via PATCH branding. */
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;

  const tenant = await getPrismaClient().tenant.findFirst({
    where: { id, activeTemplateId: "seniors-platform" },
    select: { id: true, slug: true },
  });
  if (!tenant) return NextResponse.json({ error: "School not found" }, { status: 404 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File required" }, { status: 400 });
    }
    if (!isAllowedAcademyImageMime(file.type)) {
      return NextResponse.json({ error: "Use a JPG, PNG, WebP or GIF image." }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }
    if (file.size > ACADEMY_IMAGE_MAX_BYTES) {
      return NextResponse.json(
        { error: `Logo must be ${ACADEMY_IMAGE_MAX_MB} MB or smaller.` },
        { status: 400 },
      );
    }

    const uploaded = await storeSeniorsUpload({
      tenantSlug: tenant.slug,
      tenantId: tenant.id,
      fileName: file.name,
      contentType: file.type,
      body: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json({ ok: true, url: uploaded.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
