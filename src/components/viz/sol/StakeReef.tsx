"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatPlainPercent } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

function kelpSeed(i: number) {
  const x = Math.sin(i * 19.19 + 4.2) * 43758.5453;
  return x - Math.floor(x);
}

export function StakeReef({
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

  const n = compact ? 7 : stage ? 16 : 11;
  const kelp = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const r = kelpSeed(i);
        return {
          x: 10 + (i / Math.max(1, n - 1)) * 80,
          h: 28 + r * 40 * (0.55 + score),
          sway: 3 + r * 5,
          delay: r * 1.4,
          thick: 2 + r * 2.2,
        };
      }),
    [n, score],
  );

  const size = stage ? 300 : large ? 180 : compact ? 96 : 140;
  const orbit = Math.max(0, Math.min(100, epoch ?? 0)) / 100;

  const reef = (
    <div
      className="relative overflow-hidden rounded-[14px] border border-line bg-ink"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Stake reef. ${label ?? `${Math.round(score * 100)}% heat`}.`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <ellipse cx={50} cy={92} rx={42} ry={6} fill="var(--line)" opacity={0.45} />
        {kelp.map((k, i) => (
          <motion.path
            key={i}
            d={`M ${k.x} 90 Q ${k.x + k.sway} ${90 - k.h * 0.55} ${k.x} ${90 - k.h}`}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={k.thick}
            strokeLinecap="round"
            opacity={0.45 + score * 0.45}
            animate={
              reduce
                ? undefined
                : {
                    d: [
                      `M ${k.x} 90 Q ${k.x + k.sway} ${90 - k.h * 0.55} ${k.x} ${90 - k.h}`,
                      `M ${k.x} 90 Q ${k.x - k.sway} ${90 - k.h * 0.55} ${k.x} ${90 - k.h}`,
                      `M ${k.x} 90 Q ${k.x + k.sway} ${90 - k.h * 0.55} ${k.x} ${90 - k.h}`,
                    ],
                  }
            }
            transition={{
              duration: 2.4 + k.delay,
              repeat: Infinity,
              ease: "easeInOut",
              delay: k.delay,
            }}
          />
        ))}
        <circle
          cx={50}
          cy={50}
          r={44}
          fill="none"
          stroke="var(--line)"
          strokeWidth={0.5}
          opacity={0.35}
        />
        <circle
          cx={50 + Math.cos(-Math.PI / 2 + orbit * Math.PI * 2) * 44}
          cy={50 + Math.sin(-Math.PI / 2 + orbit * Math.PI * 2) * 44}
          r={2}
          fill="var(--accent)"
        />
      </svg>
      {!reduce && boardPulse > 0 && (
        <motion.div
          key={boardPulse}
          className="pointer-events-none absolute inset-0 border-2 border-accent/70"
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.85 }}
        />
      )}
    </div>
  );

  const reading = label ?? `${Math.round(score * 100)}% reef`;

  if (compact) return reef;
  if (stage) {
    return (
      <div className="flex flex-col items-center gap-6">
        {reef}
        <p className="mono text-4xl font-medium text-paper md:text-6xl">{reading}</p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          stake kelp
          {epoch != null ? ` · epoch ${formatPlainPercent(epoch, 0)}` : ""}
        </p>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Reef"
      subtitle="Vote stake as kelp · current = epoch"
      reading={reading}
      large={large}
      instrumentId="forge"
    >
      {reef}
    </InstrumentFrame>
  );
}
