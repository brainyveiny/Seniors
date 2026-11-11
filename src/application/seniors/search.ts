import type { SeniorsSearchResult } from "@/domain/seniors/types";

export interface SearchableItem {
  type: SeniorsSearchResult["type"];
  id: string;
  title: string;
  subtitle: string;
  href: string;
  keywords?: string[];
}

export function searchSeniorsContent(
  query: string,
  items: SearchableItem[],
  limit = 20,
): SeniorsSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return items
    .filter((item) => {
      const haystack = [
        item.title,
        item.subtitle,
        ...(item.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, limit)
    .map(({ type, id, title, subtitle, href }) => ({
      type,
      id,
      title,
      subtitle,
      href,
    }));
}
