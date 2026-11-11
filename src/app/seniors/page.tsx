import type { Metadata } from "next";

import { SeniorsPlatformLanding } from "@/presentation/components/templates/seniors/SeniorsPlatformLanding";

import { buildPageMetadata } from "@/shared/lib/seo-metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Seniors | School-Specific Personalized Learning",
  description:
    "Seniors is a school learning platform -personalized digital campuses for schools, teachers, students, and parents.",
  path: "/seniors",
});

/** Seniors product page — Framer design (Seniors content, no Enblox flash). */
export default function SeniorsPlatformPage() {
  return <SeniorsPlatformLanding />;
}
