import { resolveMediaUrl } from "@/application/practice/lib/examApi";
import { expandVideosForDisplay } from "@/application/practice/lib/questionVideoEmbed";
import { toEmbedVideoUrl } from "@/application/practice/lib/videoLecture";

function resolveVideoSrc(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  return toEmbedVideoUrl(trimmed) ?? resolveMediaUrl(trimmed) ?? trimmed;
}

/** Clean TinyMCE wrappers and normalize video URLs for storage / display. */
export function normalizeQuestionMediaHtml(html: string): string {
  if (!html?.trim()) return html ?? "";

  let out = html;

  out = out.replace(
    /<span[^>]*class="[^"]*mce-preview-object[^"]*"[^>]*>[\s\S]*?(<iframe[\s\S]*?<\/iframe>)[\s\S]*?<\/span>/gi,
    "$1",
  );

  out = out.replace(
    /<span[^>]*data-mce-object="(iframe|video)"[^>]*>[\s\S]*?(<\1[\s\S]*?<\/\1>)[\s\S]*?<\/span>/gi,
    "$2",
  );

  out = out.replace(
    /<iframe\b([^>]*?)data-mce-src=(['"])([^'"]+)\2([^>]*)>/gi,
    (_m, before, quote, src, after) => {
      const embed = resolveVideoSrc(src);
      const cleanedBefore = before.replace(/\ssrc=(['"])[^'"]*\1/gi, "");
      const cleanedAfter = after.replace(/\ssrc=(['"])[^'"]*\1/gi, "");
      return `<iframe${cleanedBefore} src=${quote}${embed}${quote}${cleanedAfter}>`;
    },
  );

  out = out.replace(
    /<iframe\b([^>]*)\bsrc=(['"])([^'"]+)\2/gi,
    (_m, attrs, quote, src) => {
      const embed = resolveVideoSrc(src);
      return `<iframe${attrs} src=${quote}${embed}${quote}`;
    },
  );

  out = out.replace(
    /<video\b([^>]*)\bsrc=(['"])([^'"]+)\2/gi,
    (_m, attrs, quote, src) => {
      const resolved = resolveMediaUrl(src) || src;
      return `<video${attrs} src=${quote}${resolved}${quote}`;
    },
  );

  out = out.replace(
    /<source\b([^>]*)\bsrc=(['"])([^'"]+)\2/gi,
    (_m, attrs, quote, src) => {
      const resolved = resolveMediaUrl(src) || src;
      return `<source${attrs} src=${quote}${resolved}${quote}`;
    },
  );

  out = out.replace(/<span[^>]*class="[^"]*mce-shim[^"]*"[^>]*>\s*<\/span>/gi, "");

  return expandVideosForDisplay(out);
}
