/** Convert common video URLs to an embeddable iframe src. */
export function toEmbedVideoUrl(url: string): string | null {
  const raw = url.trim();
  if (!raw) return null;

  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname.startsWith("/embed/")) {
        return raw;
      }
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      const shorts = /^\/shorts\/([^/]+)/.exec(u.pathname);
      if (shorts?.[1]) return `https://www.youtube.com/embed/${shorts[1]}`;
    }

    if (host === "vimeo.com") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }

    return raw;
  } catch {
    return null;
  }
}
