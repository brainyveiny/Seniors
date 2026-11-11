import { randomUUID } from "node:crypto";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

function trimEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function getFirebasePrivateKey(): string {
  return trimEnv("FIREBASE_PRIVATE_KEY")
    .replace(/^"|"$/g, "")
    .replace(/\\n/g, "\n");
}

function getStorageBucketName(): string {
  return (
    trimEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET") ||
    trimEnv("FIREBASE_STORAGE_BUCKET") ||
    (trimEnv("FIREBASE_PROJECT_ID")
      ? `${trimEnv("FIREBASE_PROJECT_ID")}.appspot.com`
      : "")
  );
}

export function isFirebaseStorageConfigured(): boolean {
  return Boolean(
    trimEnv("FIREBASE_PROJECT_ID") &&
      trimEnv("FIREBASE_CLIENT_EMAIL") &&
      getFirebasePrivateKey() &&
      getStorageBucketName(),
  );
}

function getFirebaseAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = trimEnv("FIREBASE_PROJECT_ID");
  const clientEmail = trimEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = getFirebasePrivateKey();
  const storageBucket = getStorageBucketName();

  if (!projectId || !clientEmail || !privateKey || !storageBucket) {
    throw new Error("Firebase Storage is not configured");
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket,
  });
}

function buildObjectPath(
  tenantSlug: string,
  fileName: string,
  mimeType: string,
): string {
  const safeSlug =
    tenantSlug.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "tenant";
  const extFromName = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  const extFromMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
  };
  const ext = extFromName || extFromMime[mimeType] || "bin";
  return `seniors/${safeSlug}/${randomUUID()}.${ext}`;
}

/**
 * Upload notes/PDF/images for Seniors when Cloudflare R2 is not configured.
 * Uses a download token so the URL works without public bucket rules.
 */
export async function uploadToFirebaseStorage(input: {
  tenantSlug: string;
  fileName: string;
  body: Buffer;
  contentType: string;
}): Promise<{ path: string; url: string }> {
  if (!isFirebaseStorageConfigured()) {
    throw new Error("Firebase Storage is not configured");
  }

  const app = getFirebaseAdminApp();
  const bucketName = getStorageBucketName();
  const bucket = getStorage(app).bucket(bucketName);
  const path = buildObjectPath(input.tenantSlug, input.fileName, input.contentType);
  const token = randomUUID();

  const file = bucket.file(path);
  await file.save(input.body, {
    resumable: false,
    metadata: {
      contentType: input.contentType,
      cacheControl: "public, max-age=31536000, immutable",
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(path)}?alt=media&token=${encodeURIComponent(token)}`;

  return { path, url };
}
