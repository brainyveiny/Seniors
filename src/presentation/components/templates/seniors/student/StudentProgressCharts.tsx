"use client";

import type { SeniorsChapterSummary } from "@/domain/seniors/types";

const TRACK = "var(--sp-surface-3, #E8EEF5)";
const ACCENT = "var(--sp-accent, #1a4696)";
const TEXT = "var(--sp-text-strong, #111827)";
const MUTED = "var(--sp-muted, #6B7280)";
const GRID = "var(--sp-border, #E8EEF5)";

export function ProgressDonut({
  percent,
  size = 148,
  stroke = 12,
  label,
  caption,
  color = ACCENT,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  label: string;
  caption?: string;
  color?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center text-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <g transform={`rotate(-90 ${center} ${center})`}>
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={TRACK}
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
            strokeLinecap="round"
          />
        </g>
        <text
          x={center}
          y={center - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={TEXT}
          fontSize={size >= 140 ? 28 : 20}
          fontWeight="700"
        >
          {clamped}%
        </text>
        <text
          x={center}
          y={center + 18}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={MUTED}
          fontSize={11}
          fontWeight="600"
        >
          {label}
        </text>
      </svg>
      {caption ? (
        <p className="mt-1 text-xs" style={{ color: MUTED }}>
          {caption}
        </p>
      ) : null}
    </div>
  );
}

export function SubjectBarChart({
  rows,
}: {
  rows: { id: string; label: string; percent: number; color: string }[];
}) {
  const height = Math.max(120, rows.length * 44 + 28);
  const left = 92;
  const right = 44;
  const top = 8;
  const bottom = 22;
  const plotW = 320;
  const plotH = height - top - bottom;
  const width = left + plotW + right;
  const rowH = rows.length === 0 ? 0 : plotH / rows.length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Subject coverage chart"
    >
      {[0, 25, 50, 75, 100].map((tick) => {
        const x = left + (tick / 100) * plotW;
        return (
          <g key={tick}>
            <line x1={x} y1={top} x2={x} y2={top + plotH} stroke={GRID} strokeWidth={1} />
            <text x={x} y={height - 6} textAnchor="middle" fill={MUTED} fontSize={10}>
              {tick}
            </text>
          </g>
        );
      })}
      {rows.map((row, i) => {
        const y = top + i * rowH + rowH * 0.28;
        const barH = Math.max(10, rowH * 0.44);
        const w = Math.max(row.percent > 0 ? 4 : 0, (row.percent / 100) * plotW);
        return (
          <g key={row.id}>
            <text
              x={left - 10}
              y={y + barH / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fill={TEXT}
              fontSize={12}
              fontWeight="600"
            >
              {row.label.length > 12 ? `${row.label.slice(0, 11)}…` : row.label}
            </text>
            <rect
              x={left}
              y={y}
              width={plotW}
              height={barH}
              rx={6}
              fill={TRACK}
            />
            {w > 0 ? (
              <rect x={left} y={y} width={w} height={barH} rx={6} fill={row.color} />
            ) : null}
            <text
              x={left + plotW + 8}
              y={y + barH / 2}
              dominantBaseline="middle"
              fill={TEXT}
              fontSize={12}
              fontWeight="700"
            >
              {row.percent}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function ChapterBarChart({ chapters }: { chapters: SeniorsChapterSummary[] }) {
  if (chapters.length === 0) return null;

  return (
    <ul className="space-y-2.5" aria-label="Chapter completion chart">
      {chapters.map((ch) => {
        const percent =
          ch.topicCount === 0 ? 0 : Math.round((ch.completedCount / ch.topicCount) * 100);
        const done = ch.topicCount > 0 && ch.completedCount >= ch.topicCount;
        return (
          <li key={ch.id} className="flex items-center gap-3">
            <span
              className="w-8 shrink-0 text-xs font-semibold tabular-nums"
              style={{ color: MUTED }}
            >
              Ch {ch.number}
            </span>
            <span
              className="h-2 min-w-0 flex-1 overflow-hidden rounded-full"
              style={{ backgroundColor: TRACK }}
            >
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${percent}%`,
                  backgroundColor: done ? "var(--sp-success, #16A34A)" : ACCENT,
                }}
              />
            </span>
            <span
              className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums"
              style={{ color: done ? "var(--sp-success, #16A34A)" : TEXT }}
            >
              {percent}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}
