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
  materialDropShadowBlur,
  materialGlowOpacity,
  materialStrokeWeight,
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
  const slagGrad = `forge-slag-${uid}`;
  const isPow = !chain || chain.id === "btc";

  const intensity = isPow
    ? normalizeHashrate(hashrate, histories.hashrate ?? [])
    : Math.max(0.12, Math.min(1, securityScore ?? 0.35));
  const orbit = Math.max(0, Math.min(100, retargetProgress ?? 0)) / 100;
  const changeUp = (retargetChange ?? 0) >= 0;
  const markerTone =
    retargetChange == null
      ? "var(--accent)"
      : changeUp
        ? "var(--up)"
        : "var(--down)";
  const markerAngle = -Math.PI / 2 + orbit * Math.PI * 2;
  const markerX = px(CX + Math.cos(markerAngle) * ORBIT_R);
  const markerY = px(CY + Math.sin(markerAngle) * ORBIT_R);
  const glow = materialGlowOpacity(intensity);
  const coreR = forgeCoreRadius(intensity, mode);
  const orbitDash = ringDashLength(orbit, ORBIT_R);
  const orbitStroke = materialStrokeWeight(intensity, mode);
  const dropBlur = materialDropShadowBlur(intensity, mode);
  const slagH = 10 + intensity * 14;

  const reading = isPow
    ? formatHashrate(hashrate)
    : (forgeLabel ??
      (securityScore != null
        ? `${Math.round(securityScore * 100)}% heat`
        : "-"));

  const meta = chain?.instruments.forge;

  // Embers only on block pulse (discrete heat kick), not a forever loop
  const emberCount =
    !reduce && boardPulse > 0
      ? particleBudget({
          intensity,
          mode,
          reduceMotion: false,
          base: 10,
          max: stage ? 22 : 14,
        })
      : 0;

  const embers = useMemo(() => {
    return Array.from({ length: emberCount }, (_, i) => {
      const a = (i / Math.max(1, emberCount)) * Math.PI * 2;
      const r = 12 + (i % 5) * 4;
      return {
        cx: px(CX + Math.cos(a) * r * 0.35),
        cy: px(CY + 18 + Math.sin(a) * r * 0.18),
        delay: (i % 5) * 0.04,
        r: 1.2 + (i % 3) * 0.5,
        lift: 14 + (i % 4) * 5 + intensity * 10,
      };
    });
  }, [emberCount, intensity]);

  const aria = isPow
    ? `Hashrate forge. Network hashrate ${formatHashrate(hashrate)}. Difficulty epoch ${formatPlainPercent(retargetProgress ?? 0, 1)} complete. Estimated retarget ${formatPercent(retargetChange, 1)}.`
    : `Security forge. ${reading}. Epoch ${formatPlainPercent(retargetProgress ?? 0, 1)} complete.`;

  const forge = (
    <div
      className="relative"
      style={{
        width: size,
        height: size,
        filter: `drop-shadow(0 0 ${dropBlur}px color-mix(in oklab, var(--accent) ${Math.round(glow * 55)}%, transparent))`,
      }}
      role="img"
      aria-label={aria}
    >
      <svg viewBox={`0 0 ${VB} ${VB}`} className="h-full w-full" aria-hidden>
        <defs>
          <radialGradient id={coreGrad} cx="50%" cy="60%" r="50%">
            <stop
              offset="0%"
              stopColor="var(--accent)"
              stopOpacity={0.45 + intensity * 0.5}
            />
            <stop
              offset="55%"
              stopColor="var(--accent-dim)"
              stopOpacity={0.2 + intensity * 0.3}
            />
            <stop offset="100%" stopColor="var(--ink)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={heatGrad} cx="50%" cy="48%" r="48%">
            <stop
              offset="0%"
              stopColor="var(--accent)"
              stopOpacity={0.2 + intensity * 0.35}
            />
            <stop offset="100%" stopColor="var(--ink)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={rimGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--paper)" stopOpacity="0.22" />
            <stop offset="50%" stopColor="var(--line-strong)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id={slagGrad} x1="0%" y1="0%" x2="0%" y2="1">
            <stop
              offset="0%"
              stopColor="var(--accent)"
              stopOpacity={0.35 + intensity * 0.4}
            />
            <stop
              offset="100%"
              stopColor="var(--accent-dim)"
              stopOpacity={0.55 + intensity * 0.3}
            />
          </linearGradient>
          <filter id={`${uid}-bloom`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={stage ? 2.6 : 1.8} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx={CX}
          cy={CY + 4}
          r={50}
          fill={`url(#${heatGrad})`}
          opacity={0.45 + intensity * 0.3}
        />

        {/* Difficulty orbit */}
        <circle
          cx={CX}
          cy={CY}
          r={ORBIT_R}
          fill="none"
          stroke={`url(#${rimGrad})`}
          strokeWidth={1.5}
          opacity={0.95}
        />
        <circle
          cx={CX}
          cy={CY}
          r={ORBIT_R}
          fill="none"
          stroke={markerTone}
          strokeWidth={orbitStroke + 0.5}
          strokeLinecap="round"
          strokeDasharray={`${orbitDash} ${2 * Math.PI * ORBIT_R}`}
          transform={`rotate(-90 ${CX} ${CY})`}
          opacity={0.3}
          filter={`url(#${uid}-bloom)`}
        />
        <circle
          cx={CX}
          cy={CY}
          r={ORBIT_R}
          fill="none"
          stroke="var(--paper-muted)"
          strokeWidth={orbitStroke * 0.75}
          strokeLinecap="round"
          strokeDasharray={`${orbitDash} ${2 * Math.PI * ORBIT_R}`}
          transform={`rotate(-90 ${CX} ${CY})`}
          opacity={0.92}
        />

        <motion.circle
          cx={markerX}
          cy={markerY}
          r={stage ? 5 : 4}
          fill={markerTone}
          filter={`url(#${uid}-bloom)`}
          initial={false}
          animate={{ cx: markerX, cy: markerY }}
          transition={{ type: "spring", stiffness: 40, damping: 18 }}
        />

        {/* Crucible body */}
        <ellipse
          cx={CX}
          cy={CY + 24}
          rx={40}
          ry={16}
          fill="var(--ink)"
          stroke="var(--line-strong)"
          strokeWidth={1.6}
        />
        <ellipse
          cx={CX}
          cy={CY + 24}
          rx={34}
          ry={12}
          fill="none"
          stroke="var(--paper)"
          strokeWidth={0.5}
          opacity={0.12}
        />
        <path
          d={`M ${CX - 38} ${CY + 20} Q ${CX} ${CY - 28 - intensity * 14} ${CX + 38} ${CY + 20}`}
          fill={`url(#${coreGrad})`}
          stroke="var(--line-strong)"
          strokeWidth={1.4}
        />
        {/* Inner rim */}
        <path
          d={`M ${CX - 30} ${CY + 16} Q ${CX} ${CY - 8 - intensity * 6} ${CX + 30} ${CY + 16}`}
          fill="none"
          stroke="var(--paper)"
          strokeWidth={0.7}
          opacity={0.2}
        />

        {/* Slag / molten pool height ∝ intensity */}
        <ellipse
          cx={CX}
          cy={CY + 20}
          rx={22 + intensity * 6}
          ry={slagH * 0.35}
          fill={`url(#${slagGrad})`}
          opacity={0.85}
          filter={`url(#${uid}-bloom)`}
        />

        <motion.circle
          cx={CX}
          cy={CY + 6}
          fill="var(--accent)"
          filter={`url(#${uid}-bloom)`}
          initial={false}
          animate={
            reduce
              ? { r: coreR, opacity: 0.3 + intensity * 0.35 }
              : {
                  r: [coreR * 0.92, coreR * 1.08, coreR * 0.92],
                  opacity: [
                    0.28 + intensity * 0.22,
                    0.42 + intensity * 0.38,
                    0.28 + intensity * 0.22,
                  ],
                }
          }
          transition={
            reduce
              ? { duration: 0.3 }
              : {
                  duration: 2.4 - intensity * 0.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
        />
        <circle
          cx={CX}
          cy={CY + 6}
          r={4 + intensity * 2.5}
          fill="var(--paper)"
          opacity={0.55 + intensity * 0.3}
        />

        {!reduce &&
          embers.map((e, i) => (
            <motion.circle
              key={`${boardPulse}-${i}`}
              cx={e.cx}
              cy={e.cy}
              r={e.r}
              fill="var(--accent)"
              initial={{ opacity: 0, cy: e.cy }}
              animate={{
                cy: e.cy - e.lift,
                opacity: [0, glow, 0],
                r: [e.r, e.r * 1.4, e.r * 0.5],
              }}
              transition={{
                duration: 0.85 + (i % 3) * 0.12,
                delay: e.delay,
                ease: "easeOut",
              }}
            />
          ))}

        {!reduce && boardPulse > 0 && (
          <motion.circle
            key={boardPulse}
            cx={CX}
            cy={CY + 6}
            r={12}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            initial={{ r: 12, opacity: 0.8 }}
            animate={{ r: 56, opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
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
          ? `Kiln heat vs this session · epoch ${formatPlainPercent(retargetProgress, 0)} through`
          : "Kiln heat vs this session · difficulty orbit")
      }
      reading={reading}
      large={large}
      instrumentId="forge"
    >
      {forge}
    </InstrumentFrame>
  );
}
