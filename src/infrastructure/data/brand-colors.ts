import type { BrandColorId } from "@/domain/entities/onboarding";

export interface BrandColorOption {
  id: BrandColorId;
  label: string;
  hex: string;
  buttonClass: string;
  ringClass: string;
}

export const BRAND_COLORS: BrandColorOption[] = [
  {
    id: "indigo",
    label: "Indigo",
    hex: "#4F46E5",
    buttonClass: "bg-indigo-600 hover:bg-indigo-700",
    ringClass: "ring-indigo-600",
  },
  {
    id: "lavender",
    label: "Lavender",
    hex: "#A78BFA",
    buttonClass: "bg-violet-400 hover:bg-violet-500",
    ringClass: "ring-violet-400",
  },
  {
    id: "pink",
    label: "Pink",
    hex: "#EC4899",
    buttonClass: "bg-pink-500 hover:bg-pink-600",
    ringClass: "ring-pink-500",
  },
  {
    id: "orange",
    label: "Orange",
    hex: "#F97316",
    buttonClass: "bg-orange-500 hover:bg-orange-600",
    ringClass: "ring-orange-500",
  },
  {
    id: "green",
    label: "Green",
    hex: "#22C55E",
    buttonClass: "bg-green-500 hover:bg-green-600",
    ringClass: "ring-green-500",
  },
  {
    id: "sky",
    label: "Sky",
    hex: "#0EA5E9",
    buttonClass: "bg-sky-500 hover:bg-sky-600",
    ringClass: "ring-sky-500",
  },
  {
    id: "red",
    label: "Red",
    hex: "#EF4444",
    buttonClass: "bg-red-500 hover:bg-red-600",
    ringClass: "ring-red-500",
  },
  {
    id: "teal",
    label: "Teal",
    hex: "#14B8A6",
    buttonClass: "bg-teal-500 hover:bg-teal-600",
    ringClass: "ring-teal-500",
  },
];

export function getBrandColor(id: BrandColorId) {
  return BRAND_COLORS.find((c) => c.id === id) ?? BRAND_COLORS[0];
}

function expandShortHex(hex: string): string {
  if (hex.length !== 4) return hex;
  const r = hex[1]!;
  const g = hex[2]!;
  const b = hex[3]!;
  return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
}

/** Normalizes preset id or #hex to a 6-digit hex string */
export function normalizeBrandColorValue(value: string): string {
  const trimmed = value.trim();
  if (/^#[0-9A-Fa-f]{3}$/.test(trimmed)) {
    return expandShortHex(trimmed);
  }
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  const preset = BRAND_COLORS.find((c) => c.id === trimmed);
  return preset?.hex ?? BRAND_COLORS[0]!.hex;
}

export function resolveBrandHex(value: string): string {
  return normalizeBrandColorValue(value);
}

/** Preset id or custom hex -for components that need hex + fallbacks */
export function resolveBrandAccent(value: string): BrandColorOption {
  const hex = resolveBrandHex(value);
  const preset = BRAND_COLORS.find(
    (c) => c.id === value.trim() || c.hex.toUpperCase() === hex.toUpperCase(),
  );
  if (preset) return preset;
  return {
    id: "indigo",
    label: "Custom",
    hex,
    buttonClass: "",
    ringClass: "",
  };
}
