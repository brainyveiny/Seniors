import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { findTenantBySlug } from "@/infrastructure/database/tenant-repository";
import {
  isApiError,
  requireSchoolAdminApi,
  requireStudentApi,
  requireTeacherApi,
} from "@/infrastructure/seniors/seniors-api-auth";
import { isR2Configured } from "@/infrastructure/storage/r2-config";
import { isFirebaseStorageConfigured } from "@/infrastructure/storage/firebase-storage";
import { storeSeniorsUpload } from "@/infrastructure/storage/seniors-upload";
import {
  ACADEMY_IMAGE_MAX_BYTES,
  ACADEMY_IMAGE_MAX_MB,
  isAllowedAcademyImageMime,
} from "@/shared/lib/academy-image-limits";

type RouteContext = { params: Promise<{ slug: string }> };

const PDF_MAX_BYTES = 15 * 1024 * 1024;
const PDF_MAX_MB = 15;

function isPdf(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

export async function GET() {
  return NextResponse.json({
    r2: isR2Configured(),
    firebase: isFirebaseStorageConfigured(),
    db: true,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const teacherAuth = await requireTeacherApi(request, slug);
  const adminAuth = isApiError(teacherAuth)
    ? await requireSchoolAdminApi(request, slug)
    : null;
  const studentAuth =
    isApiError(teacherAuth) && adminAuth && isApiError(adminAuth)
      ? await requireStudentApi(request, slug)
      : null;
  if (
    isApiError(teacherAuth) &&
    (!adminAuth || isApiError(adminAuth)) &&
    (!studentAuth || isApiError(studentAuth))
  ) {
    return isApiError(teacherAuth)
      ? teacherAuth
      : adminAuth && isApiError(adminAuth)
        ? adminAuth
        : studentAuth!;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File required" }, { status: 400 });
    }

    const pdf = isPdf(file);
    if (!pdf && !isAllowedAcademyImageMime(file.type)) {
      return NextResponse.json(
        { error: "Use JPG, PNG, WebP, GIF, or PDF only." },
        { status: 400 },
      );
    }

    const maxBytes = pdf ? PDF_MAX_BYTES : ACADEMY_IMAGE_MAX_BYTES;
    const maxMb = pdf ? PDF_MAX_MB : ACADEMY_IMAGE_MAX_MB;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File must be ${maxMb} MB or smaller.` },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = pdf ? "application/pdf" : file.type;

    const tenant = await findTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const uploaded = await storeSeniorsUpload({
      tenantSlug: slug,
      tenantId: tenant.id,
      fileName: file.name,
      contentType,
      body: buffer,
    });

    return NextResponse.json({ ok: true, ...uploaded, mimeType: contentType });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    console.error("[seniors-media-upload]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
