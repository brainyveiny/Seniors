"use client";

import { useEffect, useMemo, useRef } from "react";
import "katex/dist/katex.min.css";
import { resolveMediaUrl } from "@/application/practice/lib/examApi";
import { normalizeQuestionMediaHtml } from "@/application/practice/lib/normalizeQuestionMediaHtml";
import { renderQuestionHtml } from "@/application/practice/lib/renderMathContent";
import "./rich-html-content.css";

type Props = {
  html: string;
  className?: string;
  as?: "div" | "span";
};

function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value.trim());
}

/** Strip scripts/event handlers from admin-authored HTML before render. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function sanitizeExamHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*(['"])[^'"]*\1/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
}

function resolveSrcAttr(
  prefix: string,
  quote: string,
  src: string,
  resolver: (url: string) => string | null,
): string {
  const resolved = resolver(src.trim());
  return resolved ? `${prefix}${quote}${resolved}${quote}` : `${prefix}${quote}${src}${quote}`;
}

function resolveImageUrlsInHtml(html: string): string {
  return html.replace(
    /(<img\b[^>]*\bsrc\s*=\s*)(['"])([^'"]*)\2/gi,
    (_match, prefix: string, quote: string, src: string) =>
      resolveSrcAttr(prefix, quote, src, (url) => resolveMediaUrl(url) || null),
  );
}

export function RichHtmlContent({ html, className = "", as = "div" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastProcessedRef = useRef("");
  const trimmed = html?.trim() ?? "";

  const processed = useMemo(() => {
    if (!trimmed) return "";
    const cleaned = looksLikeHtml(trimmed)
      ? normalizeQuestionMediaHtml(sanitizeExamHtml(trimmed))
      : trimmed;
    const withImages = looksLikeHtml(trimmed) ? resolveImageUrlsInHtml(cleaned) : cleaned;
    return renderQuestionHtml(withImages);
  }, [trimmed]);

  const hasEmbed = /<iframe\b|<video\b/i.test(processed);

  useEffect(() => {
    if (!hasEmbed || as !== "div") return;
    const host = ref.current;
    if (!host || processed === lastProcessedRef.current) return;
    lastProcessedRef.current = processed;
    host.innerHTML = processed;
  }, [processed, hasEmbed, as]);

  if (!trimmed) return null;

  const Tag = as === "span" ? "span" : "div";

  if (!looksLikeHtml(trimmed) && processed === trimmed) {
    return <Tag className={className}>{trimmed}</Tag>;
  }

  if (hasEmbed && as === "div") {
    return <Tag ref={ref} className={`rich-html-content ${className}`.trim()} />;
  }

  return (
    <Tag
      ref={as === "div" ? ref : undefined}
      className={`rich-html-content ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  );
}
