"use client";

import { useEffect, useId, useMemo, useState } from "react";

type Particle = {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  delay: number;
  spin: number;
};

export function SeniorsCoinBurst({
  amount,
  origin,
  target,
  onDone,
}: {
  amount: number;
  origin: { x: number; y: number };
  target: { x: number; y: number };
  onDone: () => void;
}) {
  const [visible, setVisible] = useState(true);
  const [flying, setFlying] = useState(false);
  const count = Math.min(12, Math.max(6, Math.round(amount / 2) + 5));
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spread = 28 + Math.random() * 54;
      return {
        id: i,
        x: origin.x + Math.cos(angle) * spread,
        y: origin.y + Math.sin(angle) * spread * 0.55,
        tx: target.x - (origin.x + Math.cos(angle) * spread),
        ty: target.y - (origin.y + Math.sin(angle) * spread * 0.55),
        delay: 40 + i * 28 + Math.random() * 40,
        spin: 120 + Math.random() * 220,
      };
    });
  }, [count, origin.x, origin.y, target.x, target.y]);

  useEffect(() => {
    const start = window.requestAnimationFrame(() => setFlying(true));
    const t = window.setTimeout(() => {
      setVisible(false);
      onDone();
    }, 1100);
    return () => {
      window.cancelAnimationFrame(start);
      window.clearTimeout(t);
    };
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute h-7 w-7"
          style={{
            left: p.x,
            top: p.y,
            transform: flying
              ? `translate(${p.tx}px, ${p.ty}px) scale(0.35) rotate(${p.spin}deg)`
              : "translate(0, 0) scale(1)",
            opacity: flying ? 0.15 : 1,
            transition: `transform 0.95s cubic-bezier(0.22, 0.9, 0.3, 1) ${p.delay}ms, opacity 0.95s ease ${p.delay}ms`,
          }}
        >
          <CoinGlyph />
        </span>
      ))}
      {amount > 0 ? (
        <span
          className="seniors-coin-pop absolute rounded-full px-3 py-1 text-sm font-bold text-amber-950 shadow-lg"
          style={{
            left: origin.x,
            top: origin.y - 18,
            background: "linear-gradient(180deg, #FFE8A3 0%, #F5C542 100%)",
          }}
        >
          +{amount}
        </span>
      ) : null}
    </div>
  );
}

export function CoinGlyph({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 32 32" className={className ?? "h-full w-full drop-shadow-md"} aria-hidden>
      <defs>
        <linearGradient id={`spCoin-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE9A8" />
          <stop offset="45%" stopColor="#F5C542" />
          <stop offset="100%" stopColor="#D4920A" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill={`url(#spCoin-${uid})`} stroke="#B45309" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="11.5" fill="none" stroke="#FFF4C8" strokeWidth="1.25" opacity="0.7" />
      <text
        x="16"
        y="20.5"
        textAnchor="middle"
        fontSize="13"
        fontWeight="800"
        fill="#7A4A05"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        ₹
      </text>
    </svg>
  );
}
