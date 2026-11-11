"use client";

import Image from "next/image";
import { cn } from "@/shared/lib/utils";

function canOptimize(src: string): boolean {
  if (src.startsWith("/") || src.startsWith("data:")) return true;
  try {
    const host = new URL(src).hostname;
    return (
      host === "images.unsplash.com" ||
      host === "cdn.pixabay.com" ||
      host.endsWith(".r2.dev")
    );
  } catch {
    return false;
  }
}

type SeniorsMediaImageProps = {
  src: string;
  alt?: string;
  className?: string;
  /** Fill parent that is `position: relative` */
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  draggable?: boolean;
};

/**
 * next/image wrapper for Seniors marketing surfaces.
 * Optimizes local + known CDNs; falls back to unoptimized for arbitrary CMS URLs.
 */
export function SeniorsMediaImage({
  src,
  alt = "",
  className,
  fill = false,
  width,
  height,
  priority = false,
  sizes,
  draggable = false,
}: SeniorsMediaImageProps) {
  const trimmed = src.trim();
  if (!trimmed) return null;

  return (
    <Image
      src={trimmed}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width ?? 800}
      height={fill ? undefined : height ?? 600}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      sizes={sizes}
      unoptimized={!canOptimize(trimmed)}
      draggable={draggable}
      className={cn(className)}
    />
  );
}
