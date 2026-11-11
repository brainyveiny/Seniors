import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isR2Configured } from "@/infrastructure/storage/r2-config";
import { getObjectFromR2 } from "@/infrastructure/storage/r2-storage";
import { isAcademyMediaObjectKey } from "@/shared/lib/academy-media-url";

type RouteContext = { params: Promise<{ path: string[] }> };

/** Serves uploaded images from R2 (no public bucket required). */
export async function GET(_request: NextRequest, context: RouteContext) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const { path } = await context.params;
  if (!path?.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const objectKey = path.map((segment) => decodeURIComponent(segment)).join("/");
  if (!isAcademyMediaObjectKey(objectKey)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const asset = await getObjectFromR2(objectKey);
  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(asset.body), {
    status: 200,
    headers: {
      "Content-Type": asset.contentType,
      "Content-Length": String(asset.body.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
