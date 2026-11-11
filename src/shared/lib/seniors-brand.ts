import type { CSSProperties } from "react";

export const SENIORS_DEFAULT_BRAND_HEX = "#2563EB";

/** Curated school colours offered in the super-admin branding editor. */
export const SENIORS_BRAND_PRESETS = [
  { label: "Royal blue", hex: "#2563EB" },
  { label: "Navy", hex: "#1E3A8A" },
  { label: "Indigo", hex: "#4F46E5" },
  { label: "Purple", hex: "#7C3AED" },
  { label: "Maroon", hex: "#9F1239" },
  { label: "Red", hex: "#DC2626" },
  { label: "Orange", hex: "#EA580C" },
  { label: "Forest", hex: "#15803D" },
  { label: "Teal", hex: "#0F766E" },
  { label: "Sky", hex: "#0284C7" },
  { label: "Slate", hex: "#334155" },
  { label: "Black", hex: "#18181B" },
] as const;

type Rgb = { r: number; g: number; b: number };

export function normalizeHex(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return null;
}

function toRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex({ r, g, b }: Rgb): string {
  const part = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

/** Mix `hex` with `other`; `amount` = share of `other` (0..1). */
function mix(hex: string, other: string, amount: number): string {
  const a = toRgb(hex);
  const b = toRgb(other);
  return toHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  });
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = toRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function channel(v: number) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = toRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Text colour (white or near-black) that reads best on top of `hex`. */
export function onBrandColor(hex: string): string {
  return contrastRatio(hex, "#FFFFFF") >= contrastRatio(hex, "#111827") ? "#FFFFFF" : "#111827";
}

/** Darken until the brand reads as text on a white page (WCAG AA for large text). */
function readableOnLight(hex: string): string {
  let out = hex;
  for (let i = 0; i < 10 && contrastRatio(out, "#FFFFFF") < 4.5; i++) {
    out = mix(out, "#000000", 0.12);
  }
  return out;
}

/** Lighten until the brand reads as text on a near-black page. */
function readableOnDark(hex: string): string {
  let out = hex;
  for (let i = 0; i < 10 && contrastRatio(out, "#18181B") < 4.5; i++) {
    out = mix(out, "#FFFFFF", 0.15);
  }
  return out;
}

export function resolveSchoolBrandHex(value: string | null | undefined): string {
  return normalizeHex(value) ?? SENIORS_DEFAULT_BRAND_HEX;
}

/**
 * CSS custom properties consumed by every Seniors portal (school admin, teacher,
 * student, parent). `--sp-accent` is shared with the neutral portal theme.
 */
export function seniorsBrandCssVars(value: string | null | undefined, dark: boolean): CSSProperties {
  const hex = resolveSchoolBrandHex(value);
  const on = onBrandColor(hex);
  const vars: Record<string, string> = dark
    ? {
        "--sp-brand": hex,
        "--sp-brand-hover": mix(hex, "#FFFFFF", 0.12),
        "--sp-brand-text": readableOnDark(hex),
        "--sp-brand-soft": rgba(hex, 0.18),
        "--sp-brand-soft-2": rgba(hex, 0.28),
        "--sp-brand-border": rgba(hex, 0.45),
        "--sp-on-brand": on,
        "--sp-accent": hex,
        "--sp-on-accent": on,
      }
    : {
        "--sp-brand": hex,
        "--sp-brand-hover": mix(hex, "#000000", 0.14),
        "--sp-brand-text": readableOnLight(hex),
        "--sp-brand-soft": mix(hex, "#FFFFFF", 0.92),
        "--sp-brand-soft-2": mix(hex, "#FFFFFF", 0.82),
        "--sp-brand-border": mix(hex, "#FFFFFF", 0.65),
        "--sp-on-brand": on,
        "--sp-accent": hex,
        "--sp-on-accent": on,
      };
  return vars as CSSProperties;
}

/** Warning shown in the branding editor when white button text would be hard to read. */
export function brandContrastWarning(value: string | null | undefined): string | null {
  const hex = normalizeHex(value);
  if (!hex) return "Enter a valid colour like #2563EB.";
  if (contrastRatio(hex, "#FFFFFF") < 3) {
    return "This colour is very light. Buttons will use dark text, and headings will be shown in a darker shade.";
  }
  return null;
}
