"use client";

import { motion } from "framer-motion";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import { useMemo } from "react";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatPlainPercent } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

function barSeed(i: number) {
  const x = Math.sin(i * 17.13 + 2.7) * 43758.5453;
  return x - Math.floor(x);
}

export function OiVault({
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
  const gasMood = useDashboardStore((s) => s.live.mempoolPressure);
  const boardPulse = useDashboardStore((s) => s.boardPulse);
  const reduce = useAppReducedMotion();

  const n = compact ? 6 : stage ? 14 : 10;
  const bars = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const r = barSeed(i);
        return {
          x: 12 + (i / Math.max(1, n - 1)) * 76,
          h: 18 + r * 48 * (0.45 + score),
          delay: r * 1.2,
          w: 3.2 + r * 1.4,
        };
      }),
    [n, score],
  );

  const size = stage ? 300 : large ? 180 : compact ? 96 : 140;
  const orbit = Math.max(0, Math.min(100, gasMood ?? 0)) / 100;

  const vault = (
    <div
      className={`relative overflow-hidden rounded-[14px] border border-line/80 bg-ink shadow-[0_0_36px_color-mix(in_oklab,var(--accent)_12%,transparent)] ${
        reduce ? "" : "instrument-live-glow"
      }`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`OI vault. ${label ?? `${Math.round(score * 100)}% heat`}.`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <rect
          x={8}
          y={14}
          width={84}
          height={72}
          rx={4}
          fill="none"
          stroke="var(--line)"
          strokeWidth={0.8}
          opacity={0.55}
        />
        <line
          x1={8}
          y1={86}
          x2={92}
          y2={86}
          stroke="var(--line-strong)"
          strokeWidth={1.2}
        />
        {bars.map((b, i) => (
          <motion.rect
            key={i}
            x={b.x - b.w / 2}
            width={b.w}
            rx={0.8}
            fill="var(--accent)"
            opacity={0.4 + score * 0.5}
            initial={false}
            animate={{ y: 86 - b.h, height: b.h }}
            transition={
              reduce
                ? { duration: 0 }
                : {
                    type: "spring",
                    stiffness: 50,
                    damping: 16,
                    delay: b.delay * 0.05,
                  }
            }
          />
        ))}
        <circle
          cx={50}
          cy={50}
          r={44}
          fill="none"
          stroke="var(--line)"
          strokeWidth={0.5}
          opacity={0.3}
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

  const reading = label ?? `${Math.round(score * 100)}% vault`;

  if (compact) return vault;
  if (stage) {
    return (
      <div className="flex flex-col items-center gap-6">
        {vault}
        <p className="mono text-4xl font-medium text-paper md:text-6xl">{reading}</p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          open interest vault
          {gasMood != null ? ` · gas window ${formatPlainPercent(gasMood, 0)}` : ""}
        </p>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Vault"
      subtitle="Open interest as stacked heat · orbit = gas"
      reading={reading}
      large={large}
      instrumentId="forge"
    >
      {vault}
    </InstrumentFrame>
  );
}
