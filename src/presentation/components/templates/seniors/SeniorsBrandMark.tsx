import Image from "next/image";
import { cn } from "@/shared/lib/utils";

const LOGO_SRC = "/assets/seniors/seniors-logo.png";

/** Seniors wordmark + mark for auth drawers / login pages. */
export function SeniorsBrandMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const markPx = size === "lg" ? 44 : size === "sm" ? 32 : 36;
  const word =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src={LOGO_SRC}
        alt=""
        width={markPx}
        height={markPx}
        className="shrink-0 object-contain"
        aria-hidden
      />
      <span className={cn("font-bold tracking-tight text-[#0F172A]", word)}>Seniors</span>
    </div>
  );
}
