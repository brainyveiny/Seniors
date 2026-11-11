const SUB: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
};

const SUP: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
};

function toSub(n: string) {
  return [...n].map((c) => SUB[c] ?? c).join("");
}

function toSup(n: string) {
  return [...n].map((c) => SUP[c] ?? c).join("");
}

/** Gemini/JSON often turns `\t` into a real tab before `ext{`. */
function restoreBrokenLatex(s: string) {
  return s
    .replace(/\\text\{/g, "\\text{")
    .replace(/\\mathrm\{/g, "\\mathrm{")
    .replace(/\\textrm\{/g, "\\textrm{")
    .replace(/\\rightarrow/g, "\\rightarrow")
    .replace(/\\longrightarrow/g, "\\longrightarrow")
    .replace(/\\xrightarrow/g, "\\xrightarrow");
}

/**
 * Turn Gemini LaTeX chemistry into readable unicode (CO₂, H₂O, equations)
 * so students never see `$\text{CO}_2$`.
 */
export function prettifyTutorText(input: string): string {
  let s = restoreBrokenLatex(input);

  s = s.replace(/\\(?:text|mathrm|textrm|mathit|mathbf)\{([^{}]*)\}/g, "$1");
  s = s.replace(/_\{(\d+)\}/g, (_m, n: string) => toSub(n));
  s = s.replace(/_(\d+)/g, (_m, n: string) => toSub(n));
  s = s.replace(/\^\{([0-9+\-]+)\}/g, (_m, n: string) => toSup(n));
  s = s.replace(/\^(-?\d)/g, (_m, n: string) => toSup(n));

  s = s.replace(/\\xrightarrow\{([^{}]*)\}/g, " → ");
  s = s.replace(/\\longrightarrow|\\rightarrow|\\to\b/g, " → ");
  s = s.replace(/\\leftarrow/g, " ← ");
  s = s.replace(/\\times\b/g, "×");
  s = s.replace(/\\cdot\b/g, "·");
  s = s.replace(/\\pm\b/g, "±");
  s = s.replace(/\\circ\b/g, "°");
  s = s.replace(/\\%/g, "%");
  s = s.replace(/\\,/g, " ");
  s = s.replace(/\\ /g, " ");

  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_m, inner: string) => {
    const t = String(inner).replace(/\s+/g, " ").trim();
    if (/\\[a-zA-Z]/.test(t)) return `$$${t}$$`;
    return `\n\n${t}\n\n`;
  });
  s = s.replace(/\$([^$\n]+?)\$/g, (_m, inner: string) => {
    const t = String(inner).trim();
    if (/\\[a-zA-Z]/.test(t)) return `$${t}$`;
    return t;
  });
  s = s.replace(/\\\(([\s\S]+?)\\\)/g, (_m, inner: string) => {
    const t = String(inner).trim();
    if (/\\[a-zA-Z]/.test(t)) return `\\(${t}\\)`;
    return t;
  });

  return s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function looksLikeEquation(line: string) {
  const t = line.trim();
  if (t.length < 8 || t.length > 220) return false;
  if (/^[-*•]\s|^\d+[.)]\s/.test(t)) return false;
  if (!/[→←=]/.test(t)) return false;
  return /[₀-₉]/.test(t) || /\d[A-Z]/.test(t);
}
