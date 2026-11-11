import Link from "next/link";
import { cn } from "@/shared/lib/utils";
import { SENIORS_PASTEL } from "./seniors-nav";

export const PASTEL_ORDER: (keyof typeof SENIORS_PASTEL)[] = [
  "blue",
  "green",
  "purple",
  "peach",
  "orange",
  "pink",
  "cyan",
];

export function pastelByIndex(index: number): keyof typeof SENIORS_PASTEL {
  return PASTEL_ORDER[index % PASTEL_ORDER.length];
}

export function SeniorsCard({
  children,
  className,
  variant = "default",
  pastel,
  pastelIndex,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "flat" | "elevated" | "pastel";
  pastel?: keyof typeof SENIORS_PASTEL;
  /** Rotate through soft pastel backgrounds when `pastel` is not set */
  pastelIndex?: number;
}) {
  const resolvedPastel =
    pastel ??
    (pastelIndex !== undefined
      ? pastelByIndex(pastelIndex)
      : variant === "default"
        ? "blue"
        : undefined);
  const pastelBg = resolvedPastel ? SENIORS_PASTEL[resolvedPastel] : null;

  return (
    <div
      className={cn(
        "rounded-[var(--sp-radius-panel,1.25rem)] p-5",
        pastelBg
          ? "border border-white/50 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          : variant === "flat"
            ? "bg-[var(--sp-surface-2,#fafafa)]"
            : variant === "elevated"
              ? "bg-[var(--sp-surface,#ffffff)] shadow-[var(--sp-shadow-soft)]"
              : "bg-[var(--sp-surface-2,#fafafa)]",
        className,
      )}
      style={pastelBg ? { backgroundColor: pastelBg } : undefined}
    >
      {children}
    </div>
  );
}

export function SeniorsKpiCard({
  label,
  value,
  subtext,
  icon,
  trend,
  pastel = "blue",
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: React.ReactNode;
  pastel?: keyof typeof SENIORS_PASTEL;
}) {
  return (
    <SeniorsCard pastel={pastel} variant="pastel" className="p-5">
      <div className="flex min-h-[72px] items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[var(--sp-text-strong,#18181B)]/70">{label}</p>
          <p className="mt-1.5 text-3xl font-bold tracking-tight text-[var(--sp-text-strong,#18181B)]">
            {value}
          </p>
          {subtext ? (
            <p className="mt-1 text-xs font-medium text-[var(--sp-text-strong,#18181B)]/60">
              {subtext}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          {icon ? (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/85 shadow-sm"
              style={{ color: "var(--sp-text-strong,#18181B)" }}
            >
              {icon}
            </div>
          ) : null}
          {trend}
        </div>
      </div>
    </SeniorsCard>
  );
}

export function SeniorsPastelPill({
  label,
  value,
  pastel = "blue",
  className,
}: {
  label: string;
  value: string;
  pastel?: keyof typeof SENIORS_PASTEL;
  className?: string;
}) {
  const bg = SENIORS_PASTEL[pastel];
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-2xl px-4 py-3",
        className,
      )}
      style={{ backgroundColor: bg }}
    >
      <span className="text-sm font-semibold text-[var(--sp-text-strong,#18181B)]">{label}</span>
      <span className="text-sm font-bold text-[var(--sp-text-strong,#18181B)]">{value}</span>
    </div>
  );
}

export function SeniorsActivityChip({
  title,
  time,
  icon,
  pastel = "blue",
  className,
}: {
  title: string;
  time?: string;
  icon?: React.ReactNode;
  pastel?: keyof typeof SENIORS_PASTEL;
  className?: string;
}) {
  const bg = SENIORS_PASTEL[pastel];
  return (
    <div
      className={cn(
        "sp-activity-chip inline-flex items-center gap-2.5 rounded-2xl border border-white/40",
        className,
      )}
      style={{ backgroundColor: bg }}
    >
      {icon ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/80">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="truncate font-semibold text-[var(--sp-text-strong,#18181B)]">{title}</p>
        {time ? <p className="text-[11px] text-[var(--sp-muted,#71717A)]">{time}</p> : null}
      </div>
    </div>
  );
}

export function SeniorsMonthPills({
  months,
  active,
  onChange,
}: {
  months: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {months.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          className={cn(
            "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
            active === m.id
              ? "bg-[var(--sp-accent,#18181B)] text-[var(--sp-on-accent,#ffffff)]"
              : "text-[var(--sp-muted,#71717A)] hover:bg-[var(--sp-surface-3,#f4f4f5)] hover:text-[var(--sp-text-strong,#18181B)]",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

export function SeniorsProgressRing({
  percent,
  size = 64,
  stroke = 6,
  color = "#16A34A",
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const fontSize = size >= 72 ? 14 : size <= 40 ? 9 : 12;
  const center = size / 2;
  return (
    <svg width={size} height={size} className="shrink-0" aria-hidden>
      <g transform={`rotate(-90 ${center} ${center})`}>
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="var(--sp-border-2, #E4E4E7)"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="butt"
        />
      </g>
      <text
        x={center}
        y={center}
        dominantBaseline="middle"
        textAnchor="middle"
        fill="var(--sp-text-strong, #18181B)"
        fontSize={fontSize}
        fontWeight="700"
      >
        {clamped}%
      </text>
    </svg>
  );
}

export function SeniorsEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--sp-radius-panel,1.25rem)] border border-dashed border-[var(--sp-border,#E4E4E7)] bg-[var(--sp-surface-2,#fafafa)] p-10 text-center">
      <p className="font-semibold text-[var(--sp-text-strong,#18181B)]">{title}</p>
      <p className="mt-2 text-sm text-[var(--sp-muted,#71717A)]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SeniorsTabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-full bg-[var(--sp-surface-3,#f4f4f5)] p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all",
            active === tab.id
              ? "bg-[var(--sp-surface,#ffffff)] text-[var(--sp-text-strong,#18181B)] shadow-[var(--sp-shadow-card)]"
              : "text-[var(--sp-muted,#71717A)] hover:text-[var(--sp-text-strong,#18181B)]",
          )}
        >
          {tab.icon ? <span className="inline-flex shrink-0">{tab.icon}</span> : null}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function SeniorsLinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "danger" | "ghost";
}) {
  const styles =
    variant === "primary"
      ? "bg-[var(--sp-accent,#18181B)] text-[var(--sp-on-accent,#ffffff)] hover:opacity-90"
      : variant === "danger"
        ? "bg-[#DC2626] text-white hover:bg-[#B91C1C]"
        : "text-[var(--sp-text-strong,#18181B)] hover:underline";
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
        styles,
      )}
    >
      {children}
    </Link>
  );
}

export function SeniorsPrimaryButton({
  children,
  onClick,
  disabled,
  className,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full rounded-full bg-[var(--sp-accent,#18181B)] px-5 py-3 text-sm font-semibold text-[var(--sp-on-accent,#ffffff)] transition hover:opacity-90 disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}
