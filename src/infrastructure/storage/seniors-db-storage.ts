import { getPrismaClient } from "@/infrastructure/database/prisma";

function extensionFor(fileName: string, mimeType: string): string {
  const fromName = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName && fromName.length <= 5) return fromName;
  const fromMime: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return fromMime[mimeType] || "bin";
}

export async function uploadSeniorsMediaToDb(input: {
  tenantId: string;
  fileName: string;
  mimeType: string;
  body: Buffer;
}): Promise<{ id: string; url: string }> {
  const prisma = getPrismaClient();
  const row = await prisma.seniorsMediaFile.create({
    data: {
      tenantId: input.tenantId,
      fileName: input.fileName.slice(0, 200),
      mimeType: input.mimeType || "application/octet-stream",
      bytes: new Uint8Array(input.body),
      sizeBytes: input.body.length,
    },
    select: { id: true },
  });

  const ext = extensionFor(input.fileName, input.mimeType);
  return {
    id: row.id,
    // Extension in path so PDF viewers / isPdfUrl detect the type.
    url: `/api/public/seniors-media/${row.id}.${ext}`,
  };
}

export async function getSeniorsMediaFromDb(idOrWithExt: string): Promise<{
  mimeType: string;
  fileName: string;
  bytes: Buffer;
} | null> {
  const raw = idOrWithExt?.trim() ?? "";
  if (!raw) return null;
  const id = raw.replace(/\.[a-z0-9]{1,5}$/i, "");
  if (!id) return null;

  const prisma = getPrismaClient();
  const row = await prisma.seniorsMediaFile.findUnique({
    where: { id },
    select: { mimeType: true, fileName: true, bytes: true },
  });
  if (!row) return null;
  return {
    mimeType: row.mimeType,
    fileName: row.fileName,
    bytes: Buffer.from(row.bytes),
  };
}
