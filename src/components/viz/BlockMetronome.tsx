"use client";

import { motion } from "framer-motion";
import { useEffect, useId, useState } from "react";
import { useChainOptional } from "@/lib/chains/context";
import { formatDuration } from "@/lib/format";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import { useDashboardStore } from "@/lib/store";
import {
  instrumentCanvasSize,
  materialGlowOpacity,
  materialStrokeWeight,
  metronomeHandDegrees,
  metronomeTone,
  resolveDisplayMode,
  ringDashLength,
} from "@/lib/viz-scale";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";

const DEFAULT_TARGET = 600;
const VB = 140;
const CX = VB / 2;
const CY = VB / 2;
const R = 52;

/** Round SVG coords so Node SSR and browser trig agree bit-for-bit. */
function px(n: number): number {
  return Math.round(n * 1000) / 1000;
}

const TICKS = Array.from({ length: 60 }, (_, i) => {
  const a = -Math.PI / 2 + (i / 60) * Math.PI * 2;
  const major = i % 5 === 0;
  const outer = R + (major ? 6 : 3);
  const inner = major ? R - 10 : R - 4;
  return {
    x1: px(CX + Math.cos(a) * inner),
    y1: px(CY + Math.sin(a) * inner),
    x2: px(CX + Math.cos(a) * outer),
    y2: px(CY + Math.sin(a) * outer),
    major,
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
  const reduce = useAppReducedMotion();
  const uid = useId().replace(/:/g, "");
  const mode = resolveDisplayMode({ compact, large, stage });
  const size = instrumentCanvasSize(mode, 140);

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
    const id = window.setInterval(tick, reduce ? 1000 : 250);
    return () => window.clearInterval(id);
  }, [tipTimestamp, reduce, boardPulse]);

  const raw = since != null ? since / target : 0;
  const lap = raw % 1;
  const laps = Math.floor(raw);
  const tone = metronomeTone(since, target);
  const angleDeg = metronomeHandDegrees(since, target);
  const overshoot = raw >= 1;
  const arcLen = ringDashLength(overshoot ? 1 : lap, R);
  const circ = 2 * Math.PI * R;
  const glow = materialGlowOpacity(overshoot ? 0.85 : Math.min(1, raw));
  const strokeW = materialStrokeWeight(overshoot ? 0.9 : lap, mode);

  const faceGrad = `metro-face-${uid}`;
  const ringGlow = `metro-glow-${uid}`;
  const hubGrad = `metro-hub-${uid}`;
  const faceDark = tone === "stale" ? 0.55 : tone === "late" ? 0.25 : 0;
  const trailCount = stage ? 7 : 5;
  const handTrail = Array.from({ length: trailCount }, (_, i) => {
    const t = (i + 1) / (trailCount + 1);
    const deg = angleDeg - t * 14;
    const rad = ((deg - 90) * Math.PI) / 180;
    const len = R - 14;
    return {
      x: px(CX + Math.cos(rad) * len),
      y: px(CY + Math.sin(rad) * len),
      opacity: 0.12 + (1 - t) * 0.35,
      r: 1.6 + (1 - t) * 1.4,
    };
  });
  const lapMarks = Math.min(8, laps);

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
      className={`relative ${reduce ? "" : "instrument-live-glow"}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={aria}
    >
      <svg viewBox={`0 0 ${VB} ${VB}`} className="h-full w-full" aria-hidden>
        <defs>
          <radialGradient id={faceGrad} cx="42%" cy="38%" r="62%">
            <stop offset="0%" stopColor="var(--ink-soft)" stopOpacity="1" />
            <stop offset="55%" stopColor="var(--ink)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--ink)" stopOpacity="1" />
          </radialGradient>
          <radialGradient id={ringGlow} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={TONE_STROKE[tone]} stopOpacity={glow} />
            <stop offset="70%" stopColor={TONE_STROKE[tone]} stopOpacity={glow * 0.25} />
            <stop offset="100%" stopColor={TONE_STROKE[tone]} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={hubGrad} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="var(--paper)" stopOpacity="0.95" />
            <stop offset="45%" stopColor={TONE_STROKE[tone]} stopOpacity="1" />
            <stop offset="100%" stopColor="var(--accent-dim)" stopOpacity="0.9" />
          </radialGradient>
          <filter id={`${uid}-soft`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer ambient bloom */}
        <circle cx={CX} cy={CY} r={R + 16} fill={`url(#${ringGlow})`} opacity={0.55} />

        {/* Bezel */}
        <circle
          cx={CX}
          cy={CY}
          r={R + 10}
          fill={`url(#${faceGrad})`}
          stroke="var(--line-strong)"
          strokeWidth={1.5}
        />
        <circle
          cx={CX}
          cy={CY}
          r={R + 10}
          fill="none"
          stroke="var(--paper)"
          strokeWidth={0.5}
          opacity={0.1}
        />
        {/* Late / stale vignette on the face */}
        {faceDark > 0 && (
          <circle
            cx={CX}
            cy={CY}
            r={R + 9}
            fill="var(--ink)"
            opacity={faceDark}
          />
        )}

        {/* Track */}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth={1.5}
          strokeDasharray="2 3"
          opacity={0.45}
        />

        {/* Progress arc with soft glow */}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={TONE_STROKE[tone]}
          strokeWidth={strokeW + 2}
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ}`}
          transform={`rotate(-90 ${CX} ${CY})`}
          opacity={0.25}
          filter={`url(#${uid}-soft)`}
        />
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={TONE_STROKE[tone]}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ}`}
          transform={`rotate(-90 ${CX} ${CY})`}
          opacity={0.95}
        />

        {overshoot && (
          <circle
            cx={CX}
            cy={CY}
            r={R + 4}
            fill="none"
            stroke="var(--down)"
            strokeWidth={2.2}
            strokeDasharray="3 5"
            opacity={0.7}
          />
        )}

        {/* Overdue lap studs on the outer bezel */}
        {lapMarks > 0 &&
          Array.from({ length: lapMarks }, (_, i) => {
            const a = -Math.PI / 2 + (i / Math.max(1, lapMarks)) * Math.PI * 2;
            return (
              <circle
                key={`lap-${i}`}
                cx={px(CX + Math.cos(a) * (R + 10))}
                cy={px(CY + Math.sin(a) * (R + 10))}
                r={stage ? 2.4 : 1.8}
                fill="var(--down)"
                opacity={0.75}
              />
            );
          })}

        {TICKS.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.major ? "var(--paper-muted)" : "var(--line)"}
            strokeWidth={t.major ? 1.8 : 0.75}
            opacity={t.major ? 0.92 : 0.55}
          />
        ))}

        {/* Hand residual sweep */}
        {!reduce &&
          since != null &&
          handTrail.map((p, i) => (
            <circle
              key={`trail-${i}`}
              cx={p.x}
              cy={p.y}
              r={p.r}
              fill={TONE_STROKE[tone]}
              opacity={p.opacity}
            />
          ))}

        <g
          style={{
            transformOrigin: `${CX}px ${CY}px`,
            transform: `rotate(${angleDeg}deg)`,
            transition:
              reduce || (since != null && since < 1.5)
                ? undefined
                : "transform 0.25s linear",
          }}
        >
          <line
            x1={CX}
            y1={CY + 10}
            x2={CX}
            y2={CY - (R - 12)}
            stroke={TONE_STROKE[tone]}
            strokeWidth={stage ? 3.2 : 2.6}
            strokeLinecap="round"
            opacity={0.95}
          />
          <circle
            cx={CX}
            cy={CY - (R - 12)}
            r={stage ? 3.2 : 2.6}
            fill={TONE_STROKE[tone]}
            filter={`url(#${uid}-soft)`}
          />
        </g>

        <circle cx={CX} cy={CY} r={stage ? 8 : 6.5} fill={`url(#${hubGrad})`} />
        <circle cx={CX} cy={CY} r={2.4} fill="var(--ink)" opacity={0.85} />

        {!compact && (
          <>
            <text
              x={CX}
              y={CY - R + 18}
              textAnchor="middle"
              fill="var(--paper-muted)"
              fontSize="7.5"
              fontFamily="var(--font-mono)"
              opacity={0.85}
            >
              0
            </text>
            <text
              x={CX + R - 14}
              y={CY + 3}
              textAnchor="middle"
              fill="var(--paper-muted)"
              fontSize="7.5"
              fontFamily="var(--font-mono)"
              opacity={0.85}
            >
              ¼
            </text>
            <text
              x={CX}
              y={CY + R - 10}
              textAnchor="middle"
              fill="var(--paper-muted)"
              fontSize="7.5"
              fontFamily="var(--font-mono)"
              opacity={0.85}
            >
              {target >= 60
                ? `${Math.round(target / 60)}m`
                : target >= 1
                  ? `${target}s`
                  : "slot"}
            </text>
          </>
        )}
      </svg>
      {!reduce && boardPulse > 0 && (
        <motion.div
          key={boardPulse}
          className="pointer-events-none absolute inset-0 rounded-full border border-accent"
          initial={{ opacity: 0.75, scale: 0.82 }}
          animate={{ opacity: 0, scale: 1.18 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      )}
    </div>
  );

  if (compact) return dial;

  if (stage) {
    return (
      <div className="flex flex-col items-center gap-6">
        {dial}
        <p className="instrument-stage-reading mono text-5xl font-medium tracking-tight text-paper md:text-7xl">
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
