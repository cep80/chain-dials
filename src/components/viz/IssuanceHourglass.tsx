"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useMemo, useState } from "react";
import { formatBtc, formatInteger, formatPlainPercent } from "@/lib/format";
import { getMetricNumeric, useDashboardStore } from "@/lib/store";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";

const W = 100;
const H = 140;

function grainSeed(i: number) {
  // Deterministic pseudo-random so SSR/client match
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function IssuanceHourglass({
  large = false,
  compact = false,
  stage = false,
}: {
  large?: boolean;
  compact?: boolean;
  stage?: boolean;
}) {
  const live = useDashboardStore((s) => s.live);
  const now = useDashboardStore((s) => s.now);
  const boardPulse = useDashboardStore((s) => s.boardPulse);
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const [grainT, setGrainT] = useState(0);

  const pctIssued = getMetricNumeric(live, now, "pct_issued") ?? 0;
  const remaining = Math.max(0, 100 - pctIssued);
  const halvingProgress = getMetricNumeric(live, now, "halving_progress") ?? 0;
  const blocksLeft = getMetricNumeric(live, now, "halving_blocks");
  const supply = getMetricNumeric(live, now, "money_supply");

  const neckY = H / 2;
  const topFill = remaining / 100;
  const bottomFill = pctIssued / 100;
  const clipTop = `hg-top-${uid}`;
  const clipBottom = `hg-bottom-${uid}`;
  const sandGrad = `sand-${uid}`;

  // Continuous grain clock — keeps the glass alive between block updates
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setGrainT((t) => t + 1), 80);
    return () => window.clearInterval(id);
  }, [reduce]);

  // One sand burst per block — discrete issuance, not continuous flow
  useEffect(() => {
    if (boardPulse <= 0 || reduce) return;
    setGrainT((t) => t + 12);
  }, [boardPulse, reduce]);

  const grains = useMemo(() => {
    const n = compact ? 4 : stage ? 14 : 9;
    return Array.from({ length: n }, (_, i) => {
      const r = grainSeed(i);
      const r2 = grainSeed(i + 17);
      return {
        x: 48 + r * 4,
        phase: r2,
        speed: 0.55 + r * 0.9,
        size: 0.7 + r2 * 0.9,
      };
    });
  }, [compact, stage]);

  const aria = `Issuance hourglass. ${pctIssued.toFixed(2)} percent of supply issued. ${remaining.toFixed(2)} percent remaining. Halving epoch ${halvingProgress.toFixed(1)} percent complete.`;

  const glass = (
    <div
      className="relative"
      style={{
        width: stage ? 180 : large ? 130 : compact ? 72 : 110,
        height: stage ? 252 : large ? 182 : compact ? 100 : 154,
      }}
      role="img"
      aria-label={aria}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden>
        <defs>
          <clipPath id={clipTop}>
            <polygon points="18,12 82,12 52,68 48,68" />
          </clipPath>
          <clipPath id={clipBottom}>
            <polygon points="48,72 52,72 82,128 18,128" />
          </clipPath>
          <linearGradient id={sandGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--accent-dim)" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        <polygon
          points="14,8 86,8 54,70 86,132 14,132 46,70"
          fill="var(--ink)"
          stroke="var(--line-strong)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <polygon
          points="18,12 82,12 52,68 48,68"
          fill="none"
          stroke="var(--line)"
          strokeWidth={0.8}
        />
        <polygon
          points="48,72 52,72 82,128 18,128"
          fill="none"
          stroke="var(--line)"
          strokeWidth={0.8}
        />

        {/* Remaining (top chamber) */}
        <g clipPath={`url(#${clipTop})`}>
          <motion.rect
            x={18}
            width={64}
            fill={`url(#${sandGrad})`}
            opacity={0.85}
            initial={false}
            animate={{
              y: 12 + (1 - topFill) * 56,
              height: Math.max(0.5, topFill * 56),
            }}
            transition={
              reduce ? { duration: 0 } : { type: "spring", stiffness: 50, damping: 20 }
            }
          />
          {/* Surface shimmer */}
          {!reduce && topFill > 0.02 && (
            <motion.ellipse
              cx={50}
              cy={12 + (1 - topFill) * 56 + 2}
              rx={22}
              ry={2.2}
              fill="var(--accent)"
              animate={{ opacity: [0.15, 0.4, 0.15], rx: [20, 24, 20] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </g>

        {/* Issued (bottom chamber) */}
        <g clipPath={`url(#${clipBottom})`}>
          <motion.rect
            x={18}
            width={64}
            fill={`url(#${sandGrad})`}
            initial={false}
            animate={{
              y: 128 - Math.max(0.5, bottomFill * 56),
              height: Math.max(0.5, bottomFill * 56),
            }}
            transition={
              reduce ? { duration: 0 } : { type: "spring", stiffness: 50, damping: 20 }
            }
          />
          {!reduce && (
            <motion.ellipse
              cx={50}
              cy={128 - bottomFill * 56}
              rx={26}
              ry={2}
              fill="var(--accent)"
              animate={{ opacity: [0.1, 0.28, 0.1] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </g>

        {/* Falling grains through the neck */}
        {!reduce &&
          remaining > 0.01 &&
          grains.map((g, i) => {
            const cycle = ((grainT * g.speed * 0.08 + g.phase) % 1);
            const y = 62 + cycle * 16;
            const opacity = cycle < 0.1 || cycle > 0.9 ? 0 : 0.55 + g.phase * 0.35;
            return (
              <circle
                key={i}
                cx={g.x}
                cy={y}
                r={g.size}
                fill="var(--accent)"
                opacity={opacity}
              />
            );
          })}

        {/* Neck drip pulse */}
        {!reduce && remaining > 0.05 && (
          <motion.line
            x1={50}
            x2={50}
            y1={66}
            y2={74}
            stroke="var(--accent)"
            strokeWidth={1.4}
            strokeLinecap="round"
            animate={{ opacity: [0.25, 1, 0.25], strokeWidth: [1, 1.8, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Epoch neck ring */}
        <circle
          cx={50}
          cy={neckY}
          r={7}
          fill="var(--ink-elevated)"
          stroke="var(--line)"
          strokeWidth={1}
        />
        <motion.circle
          cx={50}
          cy={neckY}
          r={7}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={`${(halvingProgress / 100) * 2 * Math.PI * 7} ${2 * Math.PI * 7}`}
          transform={`rotate(-90 50 ${neckY})`}
          animate={
            reduce
              ? undefined
              : { opacity: [0.7, 1, 0.7] }
          }
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Block-found ripple */}
        {!reduce && boardPulse > 0 && (
          <motion.circle
            key={boardPulse}
            cx={50}
            cy={neckY}
            r={7}
            fill="none"
            stroke="var(--accent)"
            initial={{ r: 7, opacity: 0.8 }}
            animate={{ r: 22, opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        )}
      </svg>
    </div>
  );

  if (compact) return glass;

  if (stage) {
    return (
      <div className="flex flex-col items-center gap-6">
        {glass}
        <p className="mono text-5xl font-medium text-paper md:text-7xl">
          {formatPlainPercent(pctIssued, 2)}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          of 21M issued
          {supply != null ? ` · ${formatBtc(supply, 0)}` : ""}
          {blocksLeft != null ? ` · ${formatInteger(blocksLeft)} to halving` : ""}
        </p>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Issuance"
      subtitle={
        blocksLeft != null
          ? `${formatInteger(blocksLeft)} to halving · sand ticks on blocks`
          : "21M hard cap · sand ticks on blocks"
      }
      reading={formatPlainPercent(pctIssued, 2)}
      large={large}
      instrumentId="issuance"
    >
      {glass}
    </InstrumentFrame>
  );
}
