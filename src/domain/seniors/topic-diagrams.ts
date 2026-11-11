export type TopicDiagramItem = {
  url: string;
  caption: string;
};

export function normalizeTopicDiagrams(
  diagrams: unknown,
  fallbackUrl = "",
): TopicDiagramItem[] {
  const fromJson: TopicDiagramItem[] = [];
  if (Array.isArray(diagrams)) {
    for (const item of diagrams) {
      if (!item || typeof item !== "object") continue;
      const url = String((item as { url?: unknown }).url ?? "").trim();
      if (!url) continue;
      const caption = String((item as { caption?: unknown }).caption ?? "").trim();
      fromJson.push({ url, caption });
    }
  }
  if (fromJson.length > 0) return fromJson;
  const legacy = fallbackUrl.trim();
  return legacy ? [{ url: legacy, caption: "" }] : [];
}

export function diagramsPayload(diagrams: TopicDiagramItem[]) {
  const cleaned = normalizeTopicDiagrams(diagrams);
  return {
    diagrams: cleaned,
    diagramUrl: cleaned[0]?.url ?? "",
  };
}

export function figureHeading(index: number, caption: string) {
  const letter = String.fromCharCode(97 + (index % 26));
  const trimmed = caption.trim();
  if (!trimmed) return `Fig ${letter}`;
  if (/^fig\.?\s*[a-z0-9]/i.test(trimmed)) return trimmed;
  return `Fig ${letter}: ${trimmed}`;
}

export function isRenderableImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("data:image/")) return true;
  if (trimmed.startsWith("/")) return true;
  if (!/^https?:\/\//i.test(trimmed)) return false;
  if (/\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?|#|$)/i.test(trimmed)) return true;
  if (
    /(unsplash|pixabay|gettyimages|cloudinary|imgur|\/images\/|\/media\/|r2\.|amazonaws|cloudflare)/i.test(
      trimmed,
    )
  ) {
    return true;
  }
  return false;
}
