import { resolveSeniorsContent } from "@/shared/lib/seniors-content";
import type { SeniorsContent } from "@/domain/entities/seniors-content";
import type { SeniorsAudienceId } from "@/shared/config/seniors-audiences";
import { resolveSeniorsAudienceContent } from "@/shared/lib/seniors-platform-pages";

export async function loadSeniorsPlatformLandingContent(): Promise<SeniorsContent> {
  return resolveSeniorsContent(undefined, "Seniors");
}

export async function loadSeniorsAudiencePageContent(audienceId: SeniorsAudienceId) {
  return resolveSeniorsAudienceContent(undefined, audienceId);
}
