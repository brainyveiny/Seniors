/**
 * Rewrites R2/custom-domain academy image URLs to the app proxy so images load
 * even when the R2 bucket is private or the media domain is not public yet.
 */
export function resolveAcademyImageUrl(url: string | undefined | null): string {
  const trimmed = url?.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("data:") || trimmed.startsWith("/api/public/academy-media/")) {
    return trimmed;
  }

  if (trimmed.startsWith("/academy/")) {
    return buildAcademyMediaProxyPath(trimmed.slice(1));
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      const marker = "/academy/";
      const idx = parsed.pathname.indexOf(marker);
      if (idx >= 0) {
        const key = parsed.pathname.slice(idx + 1);
        return buildAcademyMediaProxyPath(key);
      }
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

export function buildAcademyMediaProxyPath(objectKey: string): string {
  const key = objectKey.replace(/^\/+/, "");
  if (!key.startsWith("academy/")) {
    return objectKey;
  }
  return `/api/public/academy-media/${key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export function isAcademyMediaObjectKey(key: string): boolean {
  const normalized = key.replace(/^\/+/, "");
  return normalized.startsWith("academy/") && !normalized.includes("..");
}
