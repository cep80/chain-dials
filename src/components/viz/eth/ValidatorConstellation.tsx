"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatPlainPercent } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

function starSeed(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function ValidatorConstellation({
  large = false,
  compact = false,
  stage = false,
}: {
  large?: boolean;
  compact?: boolean;
  stage?: boolean;
}) {
  const score = useDashboardStore((s) => s.live.securityScore) ?? 0.4;
  const label = useDashboardStore((s) => s.live.forgeLabel);
  const epoch = useDashboardStore((s) => s.live.retargetProgress);
  const boardPulse = useDashboardStore((s) => s.boardPulse);
  const reduce = useReducedMotion();

  const n = compact ? 18 : stage ? 48 : 32;
  const stars = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const r = starSeed(i);
        const r2 = starSeed(i + 9);
        return {
          x: 8 + r * 84,
          y: 10 + r2 * 78,
          r: 0.6 + r * 1.8 * (0.5 + score),
          delay: r2 * 2.5,
        };
      }),
    [n, score],
  );

  const links = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < Math.min(stars.length - 1, 14); i += 2) {
      const a = stars[i]!;
      const b = stars[i + 1]!;
      out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
    return out;
  }, [stars]);

  const size = stage ? 300 : large ? 180 : compact ? 96 : 140;
  const orbit = Math.max(0, Math.min(100, epoch ?? 0)) / 100;

  const sky = (
    <div
      className="relative overflow-hidden rounded-full border border-line bg-ink"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Validator constellation. ${label ?? `${Math.round(score * 100)}% heat`}.`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        {links.map((l, i) => (
          <line
            key={i}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="var(--accent)"
            strokeWidth={0.3}
            opacity={0.25 + score * 0.35}
          />
        ))}
        {stars.map((s, i) => (
          <motion.circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={i % 5 === 0 ? "var(--accent)" : "var(--paper)"}
            animate={
              reduce
                ? undefined
                : { opacity: [0.35, 0.95, 0.35], r: [s.r, s.r * 1.25, s.r] }
            }
            transition={{
              duration: 2.2 + s.delay,
              repeat: Infinity,
              ease: "easeInOut",
              delay: s.delay,
            }}
          />
        ))}
        <circle
          cx={50}
          cy={50}
          r={46}
          fill="none"
          stroke="var(--line)"
          strokeWidth={0.6}
          opacity={0.5}
        />
        <motion.circle
          cx={50 + Math.cos(-Math.PI / 2 + orbit * Math.PI * 2) * 46}
          cy={50 + Math.sin(-Math.PI / 2 + orbit * Math.PI * 2) * 46}
          r={2.2}
          fill="var(--accent)"
        />
      </svg>
      {!reduce && boardPulse > 0 && (
        <motion.div
          key={boardPulse}
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-accent"
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.9 }}
        />
      )}
    </div>
  );

  const reading = label ?? `${Math.round(score * 100)}% heat`;

  if (compact) return sky;
  if (stage) {
    return (
      <div className="flex flex-col items-center gap-6">
        {sky}
        <p className="mono text-4xl font-medium text-paper md:text-6xl">{reading}</p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          validator sky
          {epoch != null ? ` · epoch ${formatPlainPercent(epoch, 0)}` : ""}
        </p>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Sky"
      subtitle="Stake as a night sky · orbit = epoch"
      reading={reading}
      large={large}
      instrumentId="forge"
    >
      {sky}
    </InstrumentFrame>
  );
}
