import katex from "katex";

/** Detects common LaTeX commands typed without $ delimiters or math-formula wrappers. */
const LATEX_COMMAND_RE =
  /\\(?:frac|dfrac|tfrac|sqrt|sum|int|prod|lim|alpha|beta|gamma|theta|pi|sin|cos|tan|log|ln|leq|geq|neq|pm|mp|cdot|times|div|left|right|begin|end|text|vec|hat|bar|binom|displaystyle|overline|underline)/;

export function looksLikeLatex(text: string): boolean {
  return LATEX_COMMAND_RE.test(text);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

/** Plain text from editor HTML (preserves LaTeX backslashes). */
export function htmlToPlainText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p>/gi, " ")
      .replace(/<\/div>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " "),
  ).trim();
}

/** True when the block is almost entirely LaTeX (not a prose question with a formula). */
export function isPrimarilyLatex(text: string): boolean {
  if (!looksLikeLatex(text)) return false;
  const withoutCommands = text.replace(/\\[a-zA-Z]+/g, " ");
  const prose = withoutCommands.replace(/[a-zA-Z]{3,}/g, "");
  const proseLen = prose.replace(/[\s\d_{}()+*/=.\-,\\[\]]/g, "").length;
  return proseLen < 5;
}

export function renderLatexToHtml(latex: string, displayMode = false): string {
  const trimmed = latex.trim();
  if (!trimmed) return "";
  try {
    return katex.renderToString(trimmed, {
      throwOnError: false,
      displayMode,
    });
  } catch {
    return trimmed;
  }
}

function formulaFromMathSpan(dataFormula: string, innerHtml: string): string {
  const fromAttr = decodeHtmlEntities(dataFormula).trim();
  const fromInner = decodeHtmlEntities(innerHtml.replace(/<[^>]*>/g, "")).trim();
  return fromInner.length > fromAttr.length ? fromInner : fromAttr;
}

/** Render math-formula spans, $…$, $$…$$, and bare LaTeX in HTML. */
export function renderMathInHtml(html: string): string {
  let out = html;

  out = out.replace(
    /<span[^>]*class="[^"]*math-formula[^"]*"[^>]*data-formula=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/span>/gi,
    (_match, _quote: string, dataFormula: string, innerHtml: string) => {
      const formula = formulaFromMathSpan(dataFormula, innerHtml);
      return renderLatexToHtml(formula, false) || `<span class="math-formula">${formula}</span>`;
    },
  );

  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_m, formula: string) =>
    renderLatexToHtml(formula, true),
  );

  out = out.replace(/\$([^$\n]+?)\$/g, (_m, formula: string) =>
    renderLatexToHtml(formula, false),
  );

  out = out.replace(/(^|>)([^<]+)(<|$)/g, (match, before: string, text: string, after: string) => {
    const trimmed = text.trim();
    if (!trimmed || !looksLikeLatex(trimmed)) return match;
    if (/class=["']katex/i.test(trimmed)) return match;
    return `${before}${renderLatexToHtml(trimmed, false)}${after}`;
  });

  return out;
}

/**
 * Main entry for question stems/options: merges all editor text and renders one
 * KaTeX block when the content is math-only (fixes partial math-formula spans).
 */
export function renderQuestionHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";

  const plain = htmlToPlainText(trimmed);
  if (plain && isPrimarilyLatex(plain) && !/<img\b/i.test(trimmed)) {
    return renderLatexToHtml(plain);
  }

  if (!/<[a-z][\s\S]*>/i.test(trimmed)) {
    return looksLikeLatex(trimmed) ? renderLatexToHtml(trimmed) : trimmed;
  }

  return renderMathInHtml(trimmed);
}
