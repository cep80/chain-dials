"use client";

import { motion } from "framer-motion";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import { useEffect, useId, useState } from "react";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatDuration, formatInteger } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";
import { svgDefId } from "@/lib/viz-scale";

const TARGET = 0.4;

export function TurbineTach({
  large = false,
  compact = false,
  stage = false,
}: {
  large?: boolean;
  compact?: boolean;
  stage?: boolean;
}) {
  const tipTimestamp = useDashboardStore((s) => s.live.tipTimestamp);
  const height = useDashboardStore((s) => s.live.blockHeight);
  const boardPulse = useDashboardStore((s) => s.boardPulse);
  const reduce = useAppReducedMotion();
  const uid = useId();
  const faceId = svgDefId("tach-face", uid);
  const glowId = svgDefId("tach-glow", uid);
  const [since, setSince] = useState<number | null>(null);

  useEffect(() => {
    if (tipTimestamp == null) {
      setSince(null);
      return;
    }
    const tick = () => setSince(Math.max(0, (Date.now() - tipTimestamp) / 1000));
    tick();
    const id = window.setInterval(tick, reduce ? 500 : 50);
    return () => window.clearInterval(id);
  }, [tipTimestamp, reduce, boardPulse]);

  // Map delay to needle: 0s = redline (~240°), slow = drop toward 0
  const ratio = since == null ? 0.85 : Math.max(0, 1 - since / (TARGET * 8));
  const angle = -120 + ratio * 240;
  const healthy = since != null && since < TARGET * 3;

  const size = stage ? 720 : large ? 180 : compact ? 96 : 140;
  const reading = formatDuration(since);

  const tach = (
    <div
      className={`relative ${reduce ? "" : "instrument-live-glow"}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Turbine tachometer. ${reading} since slot.`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          <radialGradient id={faceId} cx="45%" cy="40%" r="60%">
            <stop offset="0%" stopColor="var(--ink-soft)" />
            <stop offset="100%" stopColor="var(--ink)" />
          </radialGradient>
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={50} cy={55} r={42} fill={`url(#${faceId})`} opacity={0.95} />
        <path
          d="M 15 70 A 40 40 0 1 1 85 70"
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth={7}
          strokeLinecap="round"
          opacity={0.55}
        />
        <path
          d="M 15 70 A 40 40 0 1 1 85 70"
          fill="none"
          stroke="var(--accent)"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${ratio * 126} 126`}
          opacity={0.28}
          filter={`url(#${glowId})`}
        />
        <path
          d="M 15 70 A 40 40 0 1 1 85 70"
          fill="none"
          stroke={healthy ? "var(--accent)" : "var(--warn)"}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${ratio * 126} 126`}
          opacity={0.95}
        />
        <motion.g
          style={{ transformOrigin: "50px 55px" }}
          animate={{ rotate: angle }}
          transition={
            reduce
              ? { duration: 0 }
              : { type: "spring", stiffness: 120, damping: 14 }
          }
        >
          <line
            x1={50}
            y1={58}
            x2={50}
            y2={20}
            stroke={healthy ? "var(--accent)" : "var(--warn)"}
            strokeWidth={2.6}
            strokeLinecap="round"
            filter={`url(#${glowId})`}
          />
          <circle cx={50} cy={20} r={2.2} fill={healthy ? "var(--accent)" : "var(--warn)"} />
          <circle cx={50} cy={55} r={5} fill="var(--paper)" opacity={0.95} />
          <circle cx={50} cy={55} r={2} fill="var(--ink)" />
        </motion.g>
        {!compact && (
          <>
            <text x={16} y={80} fill="var(--paper-muted)" fontSize={5} fontFamily="var(--font-mono)">
              stall
            </text>
            <text x={70} y={80} fill="var(--accent)" fontSize={5} fontFamily="var(--font-mono)">
              redline
            </text>
          </>
        )}
      </svg>
      {!reduce && healthy && (
        <motion.div
          className="pointer-events-none absolute inset-[18%] rounded-full border border-accent/40"
          animate={{ opacity: [0.25, 0.65, 0.25], scale: [0.98, 1.03, 0.98] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </div>
  );

  if (compact) return tach;
  if (stage) {
    return (
      <div className="flex flex-col items-center gap-6">
        {tach}
        <p className="instrument-stage-reading mono text-5xl font-medium text-paper md:text-7xl">
          {reading}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          since slot · target ~{TARGET * 1000}ms
          {height != null ? ` · ${formatInteger(height)}` : ""}
        </p>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Tach"
      subtitle="~400ms slots · needle lives near redline"
      reading={reading}
      large={large}
      instrumentId="metronome"
    >
      {tach}
    </InstrumentFrame>
  );
}
