import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSeniorsMediaFromDb } from "@/infrastructure/storage/seniors-db-storage";

type RouteContext = { params: Promise<{ id: string }> };

/** Public file serve for Seniors DB-backed uploads (unguessable cuid id). */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const asset = await getSeniorsMediaFromDb(id);
  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": asset.mimeType || "application/octet-stream",
    "Content-Length": String(asset.bytes.length),
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  if (asset.fileName) {
    headers.set(
      "Content-Disposition",
      `inline; filename="${asset.fileName.replace(/"/g, "")}"`,
    );
  }

  return new NextResponse(new Uint8Array(asset.bytes), { status: 200, headers });
}
