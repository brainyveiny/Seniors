/** Cloudflare R2 (S3-compatible) -media uploads */

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  /** e.g. https://media.example.com or https://pub-xxx.r2.dev */
  publicBaseUrl: string;
  endpoint: string;
};

function trimEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function getR2Config(): R2Config | null {
  const accountId = trimEnv("R2_ACCOUNT_ID");
  const accessKeyId = trimEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = trimEnv("R2_SECRET_ACCESS_KEY");
  const bucketName = trimEnv("R2_BUCKET_NAME");
  const publicBaseUrl = trimEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicBaseUrl) {
    return null;
  }

  const endpoint =
    trimEnv("R2_ENDPOINT") || `https://${accountId}.r2.cloudflarestorage.com`;

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl,
    endpoint,
  };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

export function r2PublicHostname(): string | null {
  const config = getR2Config();
  if (!config) return null;
  try {
    return new URL(config.publicBaseUrl).hostname;
  } catch {
    return null;
  }
}
