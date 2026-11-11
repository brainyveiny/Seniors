import type { ReactNode } from "react";
import { resolveAcademyImageUrl } from "@/shared/lib/academy-media-url";
import { cn } from "@/shared/lib/utils";

export const SA_INPUT =
  "mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none";
export const SA_LABEL = "block text-sm font-medium text-neutral-700";
export const SA_BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60";
export const SA_BTN_SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-60";
export const SA_BTN_DANGER =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60";

export function SaCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-neutral-200 bg-white shadow-sm", className)}>
      {title || action ? (
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4">
          <div>
            {title ? <h2 className="font-semibold text-neutral-900">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-sm text-neutral-500">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function SaStat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "warn";
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p
        className={cn(
          "mt-2 text-3xl font-semibold tracking-tight",
          tone === "warn" ? "text-amber-600" : "text-neutral-900",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

export function SaStatusBadge({ status }: { status: "active" | "suspended" }) {
  return status === "suspended" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      Suspended
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Active
    </span>
  );
}

export function SaSchoolAvatar({
  name,
  logoUrl,
  brandHex,
  size = "md",
}: {
  name: string;
  logoUrl?: string;
  brandHex: string;
  size?: "sm" | "md" | "lg";
}) {
  const box = size === "lg" ? "h-14 w-14 text-xl" : size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  const src = resolveAcademyImageUrl(logoUrl);
  if (src) {
    return (
      <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-white", box)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} className="h-full w-full object-contain p-0.5" />
      </span>
    );
  }
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-lg font-bold text-white", box)}
      style={{ backgroundColor: brandHex }}
      aria-hidden
    >
      {(name.trim()[0] || "S").toUpperCase()}
    </span>
  );
}

export function SaNotice({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  return (
    <p
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "error" && "border-red-200 bg-red-50 text-red-700",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "info" && "border-neutral-200 bg-neutral-50 text-neutral-700",
      )}
    >
      {children}
    </p>
  );
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const ACTION_LABELS: Record<string, string> = {
  "school.create": "School created",
  "school.update": "Profile updated",
  "school.branding": "Branding updated",
  "school.suspend": "School suspended",
  "school.activate": "School re-activated",
  "school.delete": "School deleted",
  "school.impersonate": "Opened admin panel",
  "school-admin.create": "Admin added",
  "school-admin.update": "Admin updated",
  "school-admin.reset-password": "Password reset",
  "school-admin.delete": "Admin removed",
  "broadcast.send": "Broadcast sent",
  "super-admin.create": "Super admin added",
  "super-admin.update": "Super admin updated",
  "super-admin.password": "Password changed",
};

export function auditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
