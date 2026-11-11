/** Resolves editor paths like /courses to full tenant paths */
export function resolveSiteLink(
  sitePath: (segment?: string) => string,
  link: string,
): string {
  const trimmed = link.trim();
  if (!trimmed || trimmed === "/") return sitePath();
  if (trimmed.startsWith("http")) return trimmed;
  const segment = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  return sitePath(segment);
}
