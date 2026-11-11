import type { Metadata } from "next";

export const SITE_NAME = "Seniors";

/** Canonical production origin -always https, no trailing slash. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const DEFAULT_OG_IMAGE = "/assets/seniors/seniors-logo.png";

type PageSeoInput = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  ogImage?: string;
};

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL.replace(/\/$/, "")}${normalized}`;
}

export function buildPageMetadata({
  title,
  description,
  path,
  noIndex = false,
  ogImage = DEFAULT_OG_IMAGE,
}: PageSeoInput): Metadata {
  const url = absoluteUrl(path);

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: url,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      type: "website",
      locale: "en_IN",
      url,
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url: absoluteUrl(ogImage), alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl(ogImage)],
    },
  };
}

export const defaultRootMetadata: Metadata = buildPageMetadata({
  title: "Seniors | School-Specific Personalized Learning",
  description:
    "Seniors is a school learning platform -personalized digital campuses for schools, teachers, students, and parents.",
  path: "/seniors",
});
