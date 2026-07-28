"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId, useMemo } from "react";
import { formatHashrate, formatPercent, formatPlainPercent } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";
import { normalizeHashrate } from "@/lib/viz-scale";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";

const SIZE = 140;
const CX = SIZE / 2;
const CY = SIZE / 2;
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
  const boardPulse = useDashboardStore((s) => s.boardPulse);
  const histories = useDashboardStore((s) => s.histories);
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const coreGrad = `forge-core-${uid}`;
  const heatGrad = `forge-heat-${uid}`;

  const intensity = normalizeHashrate(hashrate, histories.hashrate ?? []);
  const orbit = Math.max(0, Math.min(100, retargetProgress ?? 0)) / 100;
  const changeUp = (retargetChange ?? 0) >= 0;
  const markerAngle = -Math.PI / 2 + orbit * Math.PI * 2;
  const markerX = px(CX + Math.cos(markerAngle) * ORBIT_R);
  const markerY = px(CY + Math.sin(markerAngle) * ORBIT_R);

  const embers = useMemo(() => {
    const n = compact ? 8 : stage ? 20 : 14;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const r = 14 + (i % 5) * 4.5;
      return {
        cx: px(CX + Math.cos(a) * r * 0.4),
        cy: px(CY + 16 + Math.sin(a) * r * 0.22),
        delay: (i % 7) * 0.18,
        r: 1.1 + (i % 3) * 0.55,
        lift: 8 + (i % 4) * 3,
      };
    });
  }, [compact, stage]);

  const aria = `Hashrate forge. Network hashrate ${formatHashrate(hashrate)}. Difficulty epoch ${formatPlainPercent(retargetProgress ?? 0, 1)} complete. Estimated retarget ${formatPercent(retargetChange, 1)}.`;

  const forge = (
    <div
      className="relative"
      style={{
        width: stage ? 300 : large ? 180 : compact ? 96 : SIZE,
        height: stage ? 300 : large ? 180 : compact ? 96 : SIZE,
      }}
      role="img"
      aria-label={aria}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" aria-hidden>
        <defs>
          <radialGradient id={coreGrad} cx="50%" cy="60%" r="50%">
            <stop
              offset="0%"
              stopColor="var(--accent)"
              stopOpacity={0.35 + intensity * 0.55}
            />
            <stop
              offset="55%"
              stopColor="var(--accent-dim)"
              stopOpacity={0.15 + intensity * 0.25}
            />
            <stop offset="100%" stopColor="var(--ink)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={heatGrad} cx="50%" cy="45%" r="45%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2 + intensity * 0.35} />
            <stop offset="100%" stopColor="var(--ink)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Difficulty orbit track */}
        <circle
          cx={CX}
          cy={CY}
          r={ORBIT_R}
          fill="none"
          stroke="var(--line)"
          strokeWidth={1}
        />
        <circle
          cx={CX}
          cy={CY}
          r={ORBIT_R}
          fill="none"
          stroke="var(--paper-muted)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={`${orbit * 2 * Math.PI * ORBIT_R} ${2 * Math.PI * ORBIT_R}`}
          transform={`rotate(-90 ${CX} ${CY})`}
          opacity={0.85}
        />

        {/* Orbit marker — position tracks retarget progress */}
        <motion.circle
          cx={markerX}
          cy={markerY}
          r={3.2}
          fill="var(--accent)"
          initial={false}
          animate={
            reduce
              ? { cx: markerX, cy: markerY }
              : {
                  cx: markerX,
                  cy: markerY,
                  opacity: [0.7, 1, 0.7],
                  r: [2.8, 3.6, 2.8],
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

        {/* Ambient heat bloom */}
        {!reduce && (
          <motion.circle
            cx={CX}
            cy={CY + 6}
            r={42}
            fill={`url(#${heatGrad})`}
            animate={{ opacity: [0.45, 0.85, 0.45], r: [38 + intensity * 6, 44 + intensity * 10, 38 + intensity * 6] }}
            transition={{ duration: 2.6 - intensity * 0.8, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <ellipse
          cx={CX}
          cy={CY + 22}
          rx={36}
          ry={14}
          fill="var(--ink-soft)"
          stroke="var(--line-strong)"
          strokeWidth={1}
        />
        <path
          d={`M ${CX - 34} ${CY + 18} Q ${CX} ${CY - 28 - intensity * 10} ${CX + 34} ${CY + 18}`}
          fill={`url(#${coreGrad})`}
          stroke="var(--line-strong)"
          strokeWidth={1}
        />

        {/* Breathing kiln core */}
        <motion.circle
          cx={CX}
          cy={CY + 4}
          fill="var(--accent)"
          initial={false}
          animate={
            reduce
              ? {
                  r: 10 + intensity * 8,
                  opacity: 0.25 + intensity * 0.35,
                }
              : {
                  r: [
                    9 + intensity * 7,
                    12 + intensity * 10,
                    9 + intensity * 7,
                  ],
                  opacity: [
                    0.2 + intensity * 0.25,
                    0.35 + intensity * 0.4,
                    0.2 + intensity * 0.25,
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
          fill="var(--accent)"
          animate={
            reduce
              ? { r: 5 + intensity * 3, opacity: 0.75 }
              : {
                  r: [4.5 + intensity * 2.5, 6.5 + intensity * 4, 4.5 + intensity * 2.5],
                  opacity: [0.55, 0.9, 0.55],
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
                cy: [e.cy, e.cy - e.lift - intensity * 12, e.cy],
                opacity: [0.12, 0.55 + intensity * 0.4, 0.12],
                r: [e.r * 0.8, e.r * (1.1 + intensity * 0.3), e.r * 0.8],
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
            initial={{ r: 12, opacity: 0.7 }}
            animate={{ r: 50, opacity: 0 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
          />
        )}

        {retargetChange != null && (
          <g transform={`translate(${CX + 40}, ${CY - 48})`}>
            <rect
              x={-22}
              y={-8}
              width={44}
              height={16}
              rx={8}
              fill="var(--ink-elevated)"
              stroke="var(--line)"
            />
            <text
              textAnchor="middle"
              y={3.5}
              fill={changeUp ? "var(--up)" : "var(--down)"}
              fontSize="8"
              fontFamily="var(--font-mono)"
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
        <p className="mono text-5xl font-medium text-paper md:text-7xl">
          {formatHashrate(hashrate)}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          network hashrate
          {retargetProgress != null
            ? ` · epoch ${formatPlainPercent(retargetProgress, 1)}`
            : ""}
          {retargetChange != null
            ? ` · retarget ${formatPercent(retargetChange, 1)}`
            : ""}
          {retargetBlocks != null ? ` · ${retargetBlocks} blocks left` : ""}
        </p>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Forge"
      subtitle={
        retargetProgress != null
          ? `Heat vs recent session · epoch ${formatPlainPercent(retargetProgress, 0)}`
          : "Heat vs recent session · difficulty orbit"
      }
      reading={formatHashrate(hashrate)}
      large={large}
      instrumentId="forge"
    >
      {forge}
    </InstrumentFrame>
  );
}
