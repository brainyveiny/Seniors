/** Admin image upload limits */

export const ACADEMY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const ACADEMY_IMAGE_MAX_MB = 5;

export const ACADEMY_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AcademyImageMimeType = (typeof ACADEMY_IMAGE_MIME_TYPES)[number];

export const ACADEMY_IMAGE_ACCEPT = ACADEMY_IMAGE_MIME_TYPES.join(",");

export function isAllowedAcademyImageMime(mime: string): mime is AcademyImageMimeType {
  return (ACADEMY_IMAGE_MIME_TYPES as readonly string[]).includes(mime);
}
