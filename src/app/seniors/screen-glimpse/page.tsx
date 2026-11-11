import type { Metadata } from "next";
import { SeniorsScreenGlimpse } from "@/presentation/components/templates/seniors/SeniorsScreenGlimpse";

export const metadata: Metadata = {
  title: "Seniors preview",
  robots: { index: false, follow: false },
};

export default function SeniorsScreenGlimpsePage() {
  return (
    <div className="h-full w-full">
      <SeniorsScreenGlimpse />
    </div>
  );
}
