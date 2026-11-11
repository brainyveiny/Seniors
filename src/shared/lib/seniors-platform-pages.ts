import {
  SENIORS_AUDIENCES,
  type SeniorsAudienceId,
} from "@/shared/config/seniors-audiences";

export function resolveSeniorsAudienceContent(
  props: unknown,
  audienceId: SeniorsAudienceId,
) {
  const defaults = SENIORS_AUDIENCES[audienceId];
  if (!props || typeof props !== "object") return defaults;
  const stored = props as Partial<typeof defaults>;
  return {
    ...defaults,
    ...stored,
    id: audienceId,
    features:
      stored.features && stored.features.length > 0
        ? stored.features
        : defaults.features,
  };
}
