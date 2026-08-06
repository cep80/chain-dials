"use client";

import { motion } from "framer-motion";
import { useEffect, useId, useMemo, useState } from "react";
import { useChainOptional } from "@/lib/chains/context";
import { formatBtc, formatInteger, formatPlainPercent } from "@/lib/format";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import { getMetricNumeric, useDashboardStore } from "@/lib/store";
import { particleBudget, resolveDisplayMode } from "@/lib/viz-scale";
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
  const chain = useChainOptional();
  const reduce = useAppReducedMotion();
  const uid = useId().replace(/:/g, "");
  const mode = resolveDisplayMode({ compact, large, stage });
  const [grainT, setGrainT] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isBtc = !chain || chain.id === "btc";
  const pctIssued = isBtc
    ? (getMetricNumeric(live, now, "pct_issued") ?? 0)
    : (live.supplyProgress ?? 0);
  const halvingProgress = isBtc
    ? (getMetricNumeric(live, now, "halving_progress") ?? 0)
    : (live.issuanceProgress ?? live.retargetProgress ?? 0);
  const epochRemaining = Math.max(0, 100 - halvingProgress);
  const blocksLeft = isBtc
    ? getMetricNumeric(live, now, "halving_blocks")
    : live.retargetBlocks;
  const supply = isBtc ? getMetricNumeric(live, now, "money_supply") : null;

  const neckY = H / 2;
  // Chambers track the current subsidy epoch → next halving (not 21M finality)
  const topFill = epochRemaining / 100;
  const bottomFill = halvingProgress / 100;
  const clipTop = `hg-top-${uid}`;
  const clipBottom = `hg-bottom-${uid}`;
  const sandGrad = `sand-${uid}`;

  // Sand only ticks on a new block: discrete issuance, not a fake continuous pour
  useEffect(() => {
    if (boardPulse <= 0 || reduce) return;
    setGrainT((t) => t + 1);
  }, [boardPulse, reduce]);

  const grains = useMemo(() => {
    const n = particleBudget({
      intensity: Math.max(0.25, epochRemaining / 100),
      mode,
      reduceMotion: false,
      base: 10,
      max: stage ? 22 : large ? 16 : compact ? 5 : 12,
    });
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
  }, [mode, stage, large, compact, epochRemaining]);

  const aria = `Issuance hourglass. Current subsidy epoch ${halvingProgress.toFixed(1)} percent complete. ${
    blocksLeft != null ? `${Math.round(blocksLeft)} blocks to next halving. ` : ""
  }${pctIssued.toFixed(2)} percent of 21 million issued.`;

  const topY = 12 + (1 - topFill) * 56;
  const topH = Math.max(0.5, topFill * 56);
  const bottomH = Math.max(0.5, bottomFill * 56);
  const bottomY = 128 - bottomH;
  const bandCount = stage ? 7 : large ? 5 : 4;

  const glass = (
    <div
      className="relative"
      style={{
        width: stage ? 280 : large ? 130 : compact ? 72 : 110,
        height: stage ? 392 : large ? 182 : compact ? 100 : 154,
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
            <stop offset="0%" stopColor="var(--paper)" stopOpacity="0.55" />
            <stop offset="35%" stopColor="var(--accent)" stopOpacity="0.98" />
            <stop offset="100%" stopColor="var(--accent-dim)" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--paper)" stopOpacity="0.16" />
            <stop offset="45%" stopColor="var(--ink)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id={`${uid}-spec`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--paper)" stopOpacity="0.22" />
            <stop offset="40%" stopColor="var(--paper)" stopOpacity="0" />
          </linearGradient>
          <filter id={`${uid}-sand`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.45" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <polygon
          points="14,8 86,8 54,70 86,132 14,132 46,70"
          fill={`url(#${uid}-glass)`}
          stroke="var(--line-strong)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {/* Specular glass edge */}
        <polygon
          points="20,14 44,14 48,66 46,66"
          fill={`url(#${uid}-spec)`}
          opacity={0.55}
        />
        <polygon
          points="18,12 82,12 52,68 48,68"
          fill="none"
          stroke="var(--paper)"
          strokeWidth={0.7}
          opacity={0.22}
        />
        <polygon
          points="48,72 52,72 82,128 18,128"
          fill="none"
          stroke="var(--paper)"
          strokeWidth={0.7}
          opacity={0.22}
        />

        {/* Remaining until next halving (top chamber) - banded sand */}
        <g clipPath={`url(#${clipTop})`}>
          <motion.g
            initial={false}
            animate={{ y: topY }}
            transition={
              reduce ? { duration: 0 } : { type: "spring", stiffness: 50, damping: 20 }
            }
          >
            <rect
              x={18}
              y={0}
              width={64}
              height={topH}
              fill={`url(#${sandGrad})`}
              opacity={0.9}
              filter={`url(#${uid}-sand)`}
            />
            {Array.from({ length: bandCount }, (_, i) => {
              const y = (topH / bandCount) * i;
              return (
                <rect
                  key={`tb-${i}`}
                  x={20}
                  y={y}
                  width={60}
                  height={Math.max(0.8, topH / bandCount - 0.6)}
                  fill="var(--ink)"
                  opacity={0.08 + (i % 2) * 0.06}
                />
              );
            })}
            {topFill > 0.02 && (
              <ellipse
                cx={50}
                cy={2}
                rx={22}
                ry={2}
                fill="var(--accent)"
                opacity={0.35}
              />
            )}
          </motion.g>
        </g>

        {/* Epoch elapsed (bottom chamber) */}
        <g clipPath={`url(#${clipBottom})`}>
          <motion.g
            initial={false}
            animate={{ y: bottomY }}
            transition={
              reduce ? { duration: 0 } : { type: "spring", stiffness: 50, damping: 20 }
            }
          >
            <rect
              x={18}
              y={0}
              width={64}
              height={bottomH}
              fill={`url(#${sandGrad})`}
              opacity={0.92}
            />
            {Array.from({ length: bandCount }, (_, i) => {
              const y = (bottomH / bandCount) * i;
              return (
                <rect
                  key={`bb-${i}`}
                  x={20}
                  y={y}
                  width={60}
                  height={Math.max(0.8, bottomH / bandCount - 0.6)}
                  fill="var(--ink)"
                  opacity={0.07 + (i % 2) * 0.05}
                />
              );
            })}
            <ellipse
              cx={50}
              cy={0}
              rx={24}
              ry={1.8}
              fill="var(--accent)"
              opacity={0.28}
            />
          </motion.g>
        </g>

        {/* Falling grains: one burst per block pulse */}
        {mounted &&
          !reduce &&
          grainT > 0 &&
          epochRemaining > 0.01 &&
          grains.map((g, i) => (
            <motion.circle
              key={`${grainT}-${i}`}
              cx={g.x}
              r={g.size}
              fill="var(--accent)"
              initial={{ cy: 62, opacity: 0 }}
              animate={{ cy: 78, opacity: [0, 0.9, 0] }}
              transition={{
                duration: 0.7 + g.phase * 0.35,
                delay: g.phase * 0.12,
                ease: "easeIn",
              }}
            />
          ))}

        {/* Still neck bridge between blocks */}
        {epochRemaining > 0.05 && (
          <line
            x1={50}
            x2={50}
            y1={66}
            y2={74}
            stroke="var(--accent)"
            strokeWidth={1.2}
            strokeLinecap="round"
            opacity={0.35}
          />
        )}

        {/* Long clock: total % of 21M issued (secondary to epoch sand) */}
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
          strokeDasharray={`${(pctIssued / 100) * 2 * Math.PI * 7} ${2 * Math.PI * 7}`}
          transform={`rotate(-90 50 ${neckY})`}
          animate={
            reduce
              ? undefined
              : { opacity: [0.7, 1, 0.7] }
          }
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Block-found ripple */}
        {mounted && !reduce && boardPulse > 0 && (
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
        <p className="instrument-stage-reading mono text-5xl font-medium text-paper md:text-7xl">
          {formatPlainPercent(halvingProgress, 1)}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          {isBtc
            ? "of the way to the next halving"
            : "of this epoch / issuance stretch"}
          {blocksLeft != null
            ? ` · ${formatInteger(blocksLeft)} ${isBtc ? "blocks" : "left"}`
            : ""}
        </p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-paper-muted/80">
          {isBtc
            ? `${formatPlainPercent(pctIssued, 2)} of 21M already out`
            : `${formatPlainPercent(pctIssued, 1)} supply / stake clock`}
          {supply != null ? ` · ${formatBtc(supply, 0)}` : ""}
        </p>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title={chain?.instruments.issuance.frameTitle ?? "Issuance"}
      subtitle={
        !isBtc
          ? (chain?.instruments.issuance.subtitle ??
            `${formatInteger(blocksLeft)} left in this stretch`)
          : blocksLeft != null
            ? `${formatInteger(blocksLeft)} blocks till the reward halves · sand ticks each block`
            : "Sand tracks this subsidy era · ticks each block"
      }
      reading={formatPlainPercent(halvingProgress, 1)}
      large={large}
      instrumentId="issuance"
    >
      {glass}
    </InstrumentFrame>
  );
}
