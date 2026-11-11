import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

/** Techerly-style accents (theme-aware via CSS vars) */
export const STUDENT_ACCENT = "var(--sp-accent, #18181B)";
export const STUDENT_ACCENT_SOFT = "var(--sp-surface-3, #F4F4F5)";
export const STUDENT_ON_ACCENT = "var(--sp-on-accent, #ffffff)";

export function StudentPageHero({
  title,
  subtitle,
  icon: Icon,
  meta,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3.5">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm"
          style={{ backgroundColor: STUDENT_ACCENT_SOFT, color: STUDENT_ACCENT }}
        >
          <Icon className="h-6 w-6" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--sp-text-strong,#18181B)] sm:text-[1.75rem]">
            {title}
          </h1>
          <p className="mt-1 text-sm text-[var(--sp-muted,#71717A)]">{subtitle}</p>
        </div>
      </div>
      {meta ? <div className="shrink-0">{meta}</div> : null}
    </div>
  );
}

export function StudentLiftCard({
  children,
  className,
  as: Comp = "div",
  lift = true,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "article" | "li";
  lift?: boolean;
}) {
  return (
    <Comp
      className={cn(
        "rounded-[var(--sp-radius-panel,1.25rem)] border border-[var(--sp-border,#E4E4E7)] p-5 shadow-[var(--sp-shadow-card)]",
        lift && "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--sp-shadow-soft)]",
        className,
      )}
      style={{
        backgroundColor: "var(--sp-surface, #ffffff)",
        borderColor: "var(--sp-border, #E8EEF5)",
        color: "var(--sp-text, #1F2937)",
      }}
    >
      {children}
    </Comp>
  );
}

export function StudentEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#D1D9E6] bg-white/80 px-6 py-12 text-center">
      <p className="font-semibold text-[#1F2937]">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[#6B7280]">{description}</p>
    </div>
  );
}

export function daysLeftPill(daysLeft: number) {
  if (daysLeft <= 3) {
    return {
      label: daysLeft <= 0 ? "Today" : `${daysLeft}d left`,
      className: "bg-[#FEF2F2] text-[#B91C1C]",
    };
  }
  if (daysLeft <= 7) {
    return {
      label: `${daysLeft}d left`,
      className: "bg-[#FFFBEB] text-[#B45309]",
    };
  }
  return {
    label: `${daysLeft}d left`,
    className: "bg-[#E8F0FE] text-[#1a4696]",
  };
}
