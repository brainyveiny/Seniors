import { isR2Configured } from "@/infrastructure/storage/r2-config";
import { buildAcademyImageObjectKey, uploadToR2 } from "@/infrastructure/storage/r2-storage";
import {
  isFirebaseStorageConfigured,
  uploadToFirebaseStorage,
} from "@/infrastructure/storage/firebase-storage";
import { uploadSeniorsMediaToDb } from "@/infrastructure/storage/seniors-db-storage";

export type SeniorsStoredUpload = {
  url: string;
  key: string;
  storage: "r2" | "firebase" | "db";
};

/** R2 → Firebase → Postgres fallback chain shared by every Seniors upload. */
export async function storeSeniorsUpload(input: {
  tenantSlug: string;
  tenantId: string;
  fileName: string;
  contentType: string;
  body: Buffer;
}): Promise<SeniorsStoredUpload> {
  if (isR2Configured()) {
    try {
      const key = buildAcademyImageObjectKey(input.tenantSlug, input.fileName, input.contentType);
      const uploaded = await uploadToR2({ key, body: input.body, contentType: input.contentType });
      return { url: uploaded.url, key: uploaded.key, storage: "r2" };
    } catch (error) {
      console.error(
        "[seniors-media-upload] R2 failed, falling back",
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (isFirebaseStorageConfigured()) {
    try {
      const uploaded = await uploadToFirebaseStorage({
        tenantSlug: input.tenantSlug,
        fileName: input.fileName,
        body: input.body,
        contentType: input.contentType,
      });
      return { url: uploaded.url, key: uploaded.path, storage: "firebase" };
    } catch (error) {
      console.error(
        "[seniors-media-upload] Firebase failed, falling back",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const uploaded = await uploadSeniorsMediaToDb({
    tenantId: input.tenantId,
    fileName: input.fileName,
    mimeType: input.contentType,
    body: input.body,
  });
  return { url: uploaded.url, key: uploaded.id, storage: "db" };
}
