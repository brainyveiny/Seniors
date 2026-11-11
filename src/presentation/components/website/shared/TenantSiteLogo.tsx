"use client";

import { resolveAcademyImageUrl } from "@/shared/lib/academy-media-url";
import { cn } from "@/shared/lib/utils";

interface TenantSiteLogoProps {
  logoUrl?: string;
  academyName: string;
  className?: string;
  imageClassName?: string;
}

function canPreviewImage(url: string): boolean {
  const t = url.trim();
  return t.startsWith("http") || t.startsWith("data:") || t.startsWith("/");
}

/** Tenant-uploaded logo, or nothing (caller shows academy name). */
export function TenantSiteLogo({
  logoUrl,
  academyName,
  className,
  imageClassName,
}: TenantSiteLogoProps) {
  const src = resolveAcademyImageUrl(logoUrl);
  if (!src || !canPreviewImage(src)) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={academyName}
      className={cn("h-8 w-auto max-w-[160px] shrink-0 object-contain", imageClassName)}
    />
  );
}
