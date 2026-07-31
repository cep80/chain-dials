"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatDuration, formatInteger } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

const TARGET = 1;

export function ClearingClock({
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
  const reduce = useReducedMotion();
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

  const ratio = since == null ? 0.8 : Math.max(0, 1 - since / (TARGET * 8));
  const angle = -120 + ratio * 240;
  const healthy = since != null && since < TARGET * 3;

  const size = stage ? 300 : large ? 180 : compact ? 96 : 140;
  const reading = formatDuration(since);

  const clock = (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Clearing clock. ${reading} since block.`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <path
          d="M 15 70 A 40 40 0 1 1 85 70"
          fill="none"
          stroke="var(--line)"
          strokeWidth={6}
          strokeLinecap="round"
        />
        <path
          d="M 15 70 A 40 40 0 1 1 85 70"
          fill="none"
          stroke="var(--accent)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${ratio * 126} 126`}
          opacity={0.85}
        />
        <motion.g
          style={{ transformOrigin: "50px 55px" }}
          animate={{ rotate: angle }}
          transition={
            reduce
              ? { duration: 0 }
              : { type: "spring", stiffness: 140, damping: 16 }
          }
        >
          <line
            x1={50}
            y1={55}
            x2={50}
            y2={22}
            stroke={healthy ? "var(--accent)" : "var(--warn)"}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <circle cx={50} cy={55} r={3.5} fill="var(--paper)" />
        </motion.g>
        {!compact && (
          <>
            <text x={16} y={78} fill="var(--paper-muted)" fontSize={5}>
              lag
            </text>
            <text x={68} y={78} fill="var(--accent)" fontSize={5}>
              clearing
            </text>
          </>
        )}
      </svg>
      {!reduce && healthy && (
        <motion.div
          className="pointer-events-none absolute inset-[18%] rounded-full border border-accent/30"
          animate={{ opacity: [0.2, 0.55, 0.2], scale: [0.98, 1.02, 0.98] }}
          transition={{ duration: 0.9, repeat: Infinity }}
        />
      )}
    </div>
  );

  if (compact) return clock;
  if (stage) {
    return (
      <div className="flex flex-col items-center gap-6">
        {clock}
        <p className="mono text-5xl font-medium text-paper md:text-7xl">{reading}</p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          since tip · target ~{TARGET}s
          {height != null ? ` · ${formatInteger(height)}` : ""}
        </p>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Clock"
      subtitle="~1s HyperEVM blocks · hand near the mark"
      reading={reading}
      large={large}
      instrumentId="metronome"
    >
      {clock}
    </InstrumentFrame>
  );
}
