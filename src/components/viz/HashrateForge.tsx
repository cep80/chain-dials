"use client";

import { motion } from "framer-motion";
import { useId, useMemo } from "react";
import { useChainOptional } from "@/lib/chains/context";
import { formatHashrate, formatPercent, formatPlainPercent } from "@/lib/format";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import { useDashboardStore } from "@/lib/store";
import {
  forgeCoreRadius,
  instrumentCanvasSize,
  materialGlowOpacity,
  normalizeHashrate,
  particleBudget,
  resolveDisplayMode,
  ringDashLength,
} from "@/lib/viz-scale";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";

const VB = 140;
const CX = VB / 2;
const CY = VB / 2;
const ORBIT_R = 58;

function px(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function HashrateForge({
  large = false,
  compact = false,
  stage = false,
}: {
  large?: boolean;
  compact?: boolean;
  stage?: boolean;
}) {
  const hashrate = useDashboardStore((s) => s.live.hashrate);
  const retargetProgress = useDashboardStore((s) => s.live.retargetProgress);
  const retargetChange = useDashboardStore((s) => s.live.retargetChange);
  const retargetBlocks = useDashboardStore((s) => s.live.retargetBlocks);
  const securityScore = useDashboardStore((s) => s.live.securityScore);
  const forgeLabel = useDashboardStore((s) => s.live.forgeLabel);
  const boardPulse = useDashboardStore((s) => s.boardPulse);
  const histories = useDashboardStore((s) => s.histories);
  const chain = useChainOptional();
  const reduce = useAppReducedMotion();
  const uid = useId().replace(/:/g, "");
  const mode = resolveDisplayMode({ compact, large, stage });
  const size = instrumentCanvasSize(mode, 140);
  const coreGrad = `forge-core-${uid}`;
  const heatGrad = `forge-heat-${uid}`;
  const rimGrad = `forge-rim-${uid}`;
  const isPow = !chain || chain.id === "btc";

  const intensity = isPow
    ? normalizeHashrate(hashrate, histories.hashrate ?? [])
    : Math.max(0.12, Math.min(1, securityScore ?? 0.35));
  const orbit = Math.max(0, Math.min(100, retargetProgress ?? 0)) / 100;
  const changeUp = (retargetChange ?? 0) >= 0;
  const markerAngle = -Math.PI / 2 + orbit * Math.PI * 2;
  const markerX = px(CX + Math.cos(markerAngle) * ORBIT_R);
  const markerY = px(CY + Math.sin(markerAngle) * ORBIT_R);
  const glow = materialGlowOpacity(intensity);
  const coreR = forgeCoreRadius(intensity, mode);
  const orbitDash = ringDashLength(orbit, ORBIT_R);

  const reading = isPow
    ? formatHashrate(hashrate)
    : (forgeLabel ??
      (securityScore != null
        ? `${Math.round(securityScore * 100)}% heat`
        : "-"));

  const meta = chain?.instruments.forge;

  const emberCount = particleBudget({
    intensity,
    mode,
    reduceMotion: reduce,
    base: 14,
  });

  const embers = useMemo(() => {
    return Array.from({ length: emberCount }, (_, i) => {
      const a = (i / Math.max(1, emberCount)) * Math.PI * 2;
      const r = 14 + (i % 5) * 4.5;
      return {
        cx: px(CX + Math.cos(a) * r * 0.4),
        cy: px(CY + 16 + Math.sin(a) * r * 0.22),
        delay: (i % 7) * 0.18,
        r: 1.1 + (i % 3) * 0.55,
        lift: 8 + (i % 4) * 3,
      };
    });
  }, [emberCount]);

  const aria = isPow
    ? `Hashrate forge. Network hashrate ${formatHashrate(hashrate)}. Difficulty epoch ${formatPlainPercent(retargetProgress ?? 0, 1)} complete. Estimated retarget ${formatPercent(retargetChange, 1)}.`
    : `Security forge. ${reading}. Epoch ${formatPlainPercent(retargetProgress ?? 0, 1)} complete.`;

  const forge = (
    <div
      className={`relative ${reduce ? "" : "instrument-live-glow"}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={aria}
    >
      <svg viewBox={`0 0 ${VB} ${VB}`} className="h-full w-full" aria-hidden>
        <defs>
          <radialGradient id={coreGrad} cx="50%" cy="60%" r="50%">
            <stop
              offset="0%"
              stopColor="var(--accent)"
              stopOpacity={0.4 + intensity * 0.55}
            />
            <stop
              offset="55%"
              stopColor="var(--accent-dim)"
              stopOpacity={0.18 + intensity * 0.28}
            />
            <stop offset="100%" stopColor="var(--ink)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={heatGrad} cx="50%" cy="45%" r="45%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25 + intensity * 0.4} />
            <stop offset="100%" stopColor="var(--ink)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={rimGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--paper)" stopOpacity="0.18" />
            <stop offset="50%" stopColor="var(--line-strong)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.25" />
          </linearGradient>
          <filter id={`${uid}-bloom`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient heat field */}
        <circle
          cx={CX}
          cy={CY + 4}
          r={52}
          fill={`url(#${heatGrad})`}
          opacity={0.5 + intensity * 0.35}
        />

        {/* Difficulty orbit track */}
        <circle
          cx={CX}
          cy={CY}
          r={ORBIT_R}
          fill="none"
          stroke={`url(#${rimGrad})`}
          strokeWidth={1.2}
          opacity={0.9}
        />
        <circle
          cx={CX}
          cy={CY}
          r={ORBIT_R}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${orbitDash} ${2 * Math.PI * ORBIT_R}`}
          transform={`rotate(-90 ${CX} ${CY})`}
          opacity={0.35}
          filter={`url(#${uid}-bloom)`}
        />
        <circle
          cx={CX}
          cy={CY}
          r={ORBIT_R}
          fill="none"
          stroke="var(--paper-muted)"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeDasharray={`${orbitDash} ${2 * Math.PI * ORBIT_R}`}
          transform={`rotate(-90 ${CX} ${CY})`}
          opacity={0.9}
        />

        <motion.circle
          cx={markerX}
          cy={markerY}
          r={3.6}
          fill="var(--accent)"
          filter={`url(#${uid}-bloom)`}
          initial={false}
          animate={
            reduce
              ? { cx: markerX, cy: markerY }
              : {
                  cx: markerX,
                  cy: markerY,
                  opacity: [0.7, 1, 0.7],
                  r: [3, 4.2, 3],
                }
          }
          transition={
            reduce
              ? { duration: 0.4 }
              : {
                  cx: { type: "spring", stiffness: 40, damping: 18 },
                  cy: { type: "spring", stiffness: 40, damping: 18 },
                  opacity: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
                  r: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
                }
          }
        />

        {!reduce && (
          <motion.circle
            cx={CX}
            cy={CY + 6}
            r={42}
            fill={`url(#${heatGrad})`}
            animate={{
              opacity: [0.45, 0.9, 0.45],
              r: [38 + intensity * 6, 46 + intensity * 12, 38 + intensity * 6],
            }}
            transition={{
              duration: 2.6 - intensity * 0.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        <ellipse
          cx={CX}
          cy={CY + 22}
          rx={38}
          ry={15}
          fill="var(--ink-soft)"
          stroke="var(--line-strong)"
          strokeWidth={1.2}
          opacity={0.95}
        />
        <path
          d={`M ${CX - 36} ${CY + 18} Q ${CX} ${CY - 30 - intensity * 12} ${CX + 36} ${CY + 18}`}
          fill={`url(#${coreGrad})`}
          stroke="var(--line-strong)"
          strokeWidth={1.1}
        />

        <motion.circle
          cx={CX}
          cy={CY + 4}
          fill="var(--accent)"
          filter={`url(#${uid}-bloom)`}
          initial={false}
          animate={
            reduce
              ? { r: coreR, opacity: 0.28 + intensity * 0.35 }
              : {
                  r: [coreR * 0.9, coreR * 1.15, coreR * 0.9],
                  opacity: [
                    0.22 + intensity * 0.25,
                    0.4 + intensity * 0.42,
                    0.22 + intensity * 0.25,
                  ],
                }
          }
          transition={
            reduce
              ? { duration: 0.3 }
              : { duration: 1.6 - intensity * 0.5, repeat: Infinity, ease: "easeInOut" }
          }
        />
        <motion.circle
          cx={CX}
          cy={CY + 4}
          fill="var(--paper)"
          animate={
            reduce
              ? { r: 5 + intensity * 3, opacity: 0.75 }
              : {
                  r: [4.5 + intensity * 2.5, 6.5 + intensity * 4, 4.5 + intensity * 2.5],
                  opacity: [0.55, 0.95, 0.55],
                }
          }
          transition={
            reduce
              ? { duration: 0.3 }
              : { duration: 1.2 - intensity * 0.4, repeat: Infinity, ease: "easeInOut" }
          }
        />

        {!reduce &&
          embers.map((e, i) => (
            <motion.circle
              key={i}
              cx={e.cx}
              cy={e.cy}
              r={e.r}
              fill="var(--accent)"
              animate={{
                cy: [e.cy, e.cy - e.lift - intensity * 14, e.cy],
                opacity: [0.12, glow, 0.12],
                r: [e.r * 0.8, e.r * (1.15 + intensity * 0.35), e.r * 0.8],
              }}
              transition={{
                duration: 1.6 + (i % 4) * 0.35 - intensity * 0.4,
                repeat: Infinity,
                delay: e.delay,
                ease: "easeInOut",
              }}
            />
          ))}

        {!reduce && boardPulse > 0 && (
          <motion.circle
            key={boardPulse}
            cx={CX}
            cy={CY + 4}
            r={12}
            fill="none"
            stroke="var(--accent)"
            initial={{ r: 12, opacity: 0.75 }}
            animate={{ r: 54, opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        )}

        {retargetChange != null && (
          <g transform={`translate(${CX + 40}, ${CY - 48})`}>
            <rect
              x={-24}
              y={-9}
              width={48}
              height={18}
              rx={9}
              fill="var(--ink-elevated)"
              stroke="var(--line)"
              opacity={0.95}
            />
            <text
              textAnchor="middle"
              y={4}
              fill={changeUp ? "var(--up)" : "var(--down)"}
              fontSize="8.5"
              fontFamily="var(--font-mono)"
              fontWeight={600}
            >
              {formatPercent(retargetChange, 1)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );

  if (compact) return forge;

  if (stage) {
    return (
      <div className="flex flex-col items-center gap-6">
        {forge}
        <p className="instrument-stage-reading mono text-5xl font-medium text-paper md:text-7xl">
          {isPow ? formatHashrate(hashrate) : `${Math.round(intensity * 100)}%`}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          {isPow
            ? "how hard the network is hashing"
            : (forgeLabel ?? "security heat")}
          {retargetProgress != null
            ? ` · epoch ${formatPlainPercent(retargetProgress, 1)}`
            : ""}
          {isPow && retargetChange != null
            ? ` · next tweak ~${formatPercent(retargetChange, 1)}`
            : ""}
          {retargetBlocks != null ? ` · ${retargetBlocks} left` : ""}
        </p>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title={meta?.frameTitle ?? "Forge"}
      subtitle={
        meta?.subtitle ??
        (retargetProgress != null
          ? `Glow vs this session · epoch ${formatPlainPercent(retargetProgress, 0)} through`
          : "Glow vs this session · difficulty orbit")
      }
      reading={reading}
      large={large}
      instrumentId="forge"
    >
      {forge}
    </InstrumentFrame>
  );
}
