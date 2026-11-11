import type { Metadata } from "next";

import { SeniorsAboutPage } from "@/presentation/components/templates/seniors/SeniorsAboutPage";
import { buildPageMetadata } from "@/shared/lib/seo-metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "About Us | Seniors",
  description:
    "Learn about Seniors — the school-specific learning platform for students, teachers, parents, and schools across India.",
  path: "/seniors/about",
});

export default function SeniorsAboutRoute() {
  return <SeniorsAboutPage />;
}
