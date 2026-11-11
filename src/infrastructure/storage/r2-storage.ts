import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getR2Config } from "@/infrastructure/storage/r2-config";
import { buildAcademyMediaProxyPath } from "@/shared/lib/academy-media-url";

let cachedClient: S3Client | null = null;

function getR2Client(): S3Client {
  const config = getR2Config();
  if (!config) {
    throw new Error("R2 is not configured");
  }

  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return cachedClient;
}

export function buildAcademyImageObjectKey(
  tenantSlug: string,
  fileName: string,
  mimeType: string,
): string {
  const safeSlug = tenantSlug.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "academy";
  const extFromName = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  const extFromMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
  };
  const ext = extFromName || extFromMime[mimeType] || "jpg";
  const id = crypto.randomUUID();
  return `academy/${safeSlug}/images/${id}.${ext}`;
}

export function buildR2PublicUrl(objectKey: string): string {
  const config = getR2Config();
  if (!config) {
    throw new Error("R2 is not configured");
  }
  return `${config.publicBaseUrl}/${objectKey.replace(/^\/+/, "")}`;
}

export async function uploadToR2(input: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<{ key: string; url: string }> {
  const config = getR2Config();
  if (!config) {
    throw new Error("R2 is not configured");
  }

  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );

  return {
    key: input.key,
    url: buildAcademyMediaProxyPath(input.key),
  };
}

export async function getObjectFromR2(
  objectKey: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  const config = getR2Config();
  if (!config) return null;

  const key = objectKey.replace(/^\/+/, "");
  const client = getR2Client();

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      }),
    );

    if (!response.Body) return null;

    const bytes = await response.Body.transformToByteArray();
    return {
      body: Buffer.from(bytes),
      contentType: response.ContentType ?? "application/octet-stream",
    };
  } catch {
    return null;
  }
}
