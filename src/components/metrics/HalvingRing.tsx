"use client";

import { motion, useReducedMotion } from "framer-motion";

export function HalvingRing({
  progress,
  size = 88,
}: {
  progress: number | null;
  size?: number;
}) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(100, progress ?? 0));
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 80, damping: 20 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="mono text-sm text-paper">{pct.toFixed(1)}%</span>
        <span className="text-[9px] uppercase tracking-wider text-paper-muted">epoch</span>
      </div>
    </div>
  );
}
