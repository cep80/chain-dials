"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { useChainOptional } from "@/lib/chains/context";
import { formatDuration } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";
import { metronomeTone } from "@/lib/viz-scale";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";

const DEFAULT_TARGET = 600;
const SIZE = 140;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 52;

/** Round SVG coords so Node SSR and browser trig agree bit-for-bit. */
function px(n: number): number {
  return Math.round(n * 1000) / 1000;
}

const TICKS = Array.from({ length: 12 }, (_, i) => {
  const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
  const outer = R + 4;
  const inner = i % 3 === 0 ? R - 8 : R - 4;
  return {
    x1: px(CX + Math.cos(a) * inner),
    y1: px(CY + Math.sin(a) * inner),
    x2: px(CX + Math.cos(a) * outer),
    y2: px(CY + Math.sin(a) * outer),
    major: i % 3 === 0,
  };
});

const TONE_STROKE = {
  calm: "var(--accent)",
  late: "var(--warn)",
  stale: "var(--down)",
} as const;

export function BlockMetronome({
  large = false,
  compact = false,
  stage = false,
}: {
  large?: boolean;
  compact?: boolean;
  stage?: boolean;
}) {
  const tipTimestamp = useDashboardStore((s) => s.live.tipTimestamp);
  const boardPulse = useDashboardStore((s) => s.boardPulse);
  const chain = useChainOptional();
  const target = chain?.targetBlockSeconds ?? DEFAULT_TARGET;
  const cadence = chain?.cadenceLabel ?? "block";
  const reduce = useReducedMotion();

  // Local clock so the dial keeps moving even when the store tick is quiet,
  // and so we don't freeze the hand after the target mark.
  const [since, setSince] = useState<number | null>(null);

  useEffect(() => {
    if (tipTimestamp == null) {
      setSince(null);
      return;
    }
    const tick = () => {
      setSince(Math.max(0, (Date.now() - tipTimestamp) / 1000));
    };
    tick();
    // Sub-second cadence keeps the hand visibly alive
    const id = window.setInterval(tick, reduce ? 1000 : 250);
    return () => window.clearInterval(id);
  }, [tipTimestamp, reduce, boardPulse]);

  const raw = since != null ? since / target : 0;
  // Hand keeps sweeping past target (uncapped degrees - no freeze at full circle)
  const lap = raw % 1;
  const laps = Math.floor(raw);
  const tone = metronomeTone(since, target);
  const angleDeg = raw * 360;
  const overshoot = raw >= 1;
  const arcLen = (overshoot ? 1 : lap) * 2 * Math.PI * R;
  const circ = 2 * Math.PI * R;

  const reading = formatDuration(since);
  const targetLabel =
    target >= 60
      ? `${Math.round(target / 60)} min`
      : target >= 1
        ? `${target}s`
        : `${Math.round(target * 1000)}ms`;
  const aria = `Metronome. Time since last ${cadence}: ${reading}. Target interval ${targetLabel}.${
    laps > 0 ? ` ${laps} interval${laps === 1 ? "" : "s"} overdue.` : ""
  }`;

  const dial = (
    <div
      className="relative"
      style={{
        width: stage ? 300 : large ? 180 : compact ? 100 : SIZE,
        height: stage ? 300 : large ? 180 : compact ? 100 : SIZE,
      }}
      role="img"
      aria-label={aria}
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-full w-full"
        aria-hidden
      >
        <circle
          cx={CX}
          cy={CY}
          r={R + 8}
          fill="var(--ink)"
          stroke="var(--line)"
          strokeWidth={1}
        />
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth={1.5}
          strokeDasharray="2 3"
          opacity={0.5}
        />
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={TONE_STROKE[tone]}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ}`}
          transform={`rotate(-90 ${CX} ${CY})`}
          opacity={0.9}
        />
        {overshoot && (
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="var(--down)"
            strokeWidth={2}
            strokeDasharray="4 4"
            opacity={0.55}
          />
        )}
        {TICKS.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.major ? "var(--paper-muted)" : "var(--line)"}
            strokeWidth={t.major ? 1.5 : 1}
          />
        ))}
        {/* Rotate the hand as a group - continuous, no spring freeze past 10m */}
        <g
          style={{
            transformOrigin: `${CX}px ${CY}px`,
            transform: `rotate(${angleDeg}deg)`,
            // Skip easing on block reset (large rewind); smooth otherwise
            transition:
              reduce || (since != null && since < 1.5)
                ? undefined
                : "transform 0.25s linear",
          }}
        >
          <line
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY - (R - 10)}
            stroke={TONE_STROKE[tone]}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
        <circle cx={CX} cy={CY} r={3.5} fill={TONE_STROKE[tone]} />
        <text
          x={CX}
          y={CY - R + 16}
          textAnchor="middle"
          fill="var(--paper-muted)"
          fontSize="8"
          fontFamily="var(--font-mono)"
        >
          0
        </text>
        <text
          x={CX + R - 12}
          y={CY + 3}
          textAnchor="middle"
          fill="var(--paper-muted)"
          fontSize="8"
          fontFamily="var(--font-mono)"
        >
          5
        </text>
        <text
          x={CX}
          y={CY + R - 8}
          textAnchor="middle"
          fill="var(--paper-muted)"
          fontSize="8"
          fontFamily="var(--font-mono)"
        >
          {target >= 60 ? `${Math.round(target / 60)}m` : target >= 1 ? `${target}s` : "slot"}
        </text>
      </svg>
      {!reduce && boardPulse > 0 && (
        <motion.div
          key={boardPulse}
          className="pointer-events-none absolute inset-0 rounded-full border border-accent"
          initial={{ opacity: 0.7, scale: 0.85 }}
          animate={{ opacity: 0, scale: 1.15 }}
          transition={{ duration: 0.85, ease: "easeOut" }}
        />
      )}
    </div>
  );

  if (compact) return dial;

  if (stage) {
    return (
      <div className="flex flex-col items-center gap-6">
        {dial}
        <p className="mono text-5xl font-medium tracking-tight text-paper md:text-7xl">
          {reading}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          since the last {cadence}
          {laps > 0 ? ` · ${laps}× past the usual ${targetLabel}` : ""}
        </p>
      </div>
    );
  }

  const meta = chain?.instruments.metronome;
  return (
    <InstrumentFrame
      title={meta?.frameTitle ?? "Metronome"}
      subtitle={
        laps > 0
          ? `Still waiting · ${laps}× past the usual ${targetLabel}`
          : (meta?.subtitle ?? `Aims for ~${targetLabel} between ${cadence}s`)
      }
      reading={reading}
      large={large}
      instrumentId="metronome"
    >
      {dial}
    </InstrumentFrame>
  );
}
