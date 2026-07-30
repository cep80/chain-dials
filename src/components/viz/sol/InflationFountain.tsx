"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatInteger, formatPlainPercent } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

export function InflationFountain({
  large = false,
  compact = false,
  stage = false,
}: {
  large?: boolean;
  compact?: boolean;
  stage?: boolean;
}) {
  const progress = useDashboardStore((s) => s.live.issuanceProgress) ?? 40;
  const inflation = useDashboardStore((s) => s.live.inflationRate);
  const left = useDashboardStore((s) => s.live.retargetBlocks);
  const label = useDashboardStore((s) => s.live.forgeLabel);
  const boardPulse = useDashboardStore((s) => s.boardPulse);
  const reduce = useReducedMotion();

  const level = Math.max(0.15, Math.min(0.9, progress / 100));
  // Spray density from inflation rate (~5–8% typical → mid spray)
  const spray =
    inflation != null
      ? Math.max(0.35, Math.min(1.4, inflation / 6))
      : 0.85;
  const dropCount = Math.round((compact ? 5 : stage ? 14 : 9) * spray);

  const drops = useMemo(
    () =>
      Array.from({ length: dropCount }, (_, i) => ({
        x: 42 + (i % 5) * 4,
        delay: (i % 7) * 0.18,
        speed: 0.75 + (i % 4) * 0.2 * spray,
      })),
    [compact, stage, dropCount, spray],
  );

  const h = stage ? 260 : large ? 190 : compact ? 100 : 154;
  const w = stage ? 160 : large ? 120 : compact ? 64 : 100;

  const reading =
    inflation != null
      ? `${inflation.toFixed(1)}%`
      : formatPlainPercent(progress, 1);

  const fountain = (
    <div
      className="relative overflow-hidden rounded-[12px] border border-line bg-ink"
      style={{ width: w, height: h }}
      role="img"
      aria-label={`Inflation fountain. Epoch ${progress.toFixed(0)} percent. Inflation ${inflation?.toFixed(1) ?? "unknown"} percent.`}
    >
      <svg viewBox="0 0 100 140" className="h-full w-full">
        <motion.rect
          x={18}
          width={64}
          fill="var(--accent)"
          opacity={0.35}
          initial={false}
          animate={{ y: 140 - level * 70, height: level * 70 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 40, damping: 18 }}
        />
        <rect x={46} y={40} width={8} height={50} fill="var(--line-strong)" rx={2} />
        <ellipse cx={50} cy={40} rx={10} ry={4} fill="var(--accent)" opacity={0.8} />
        {!reduce &&
          drops.map((d, i) => (
            <motion.circle
              key={i}
              cx={d.x}
              r={1.2 + spray * 0.4}
              fill="var(--accent)"
              animate={{
                cy: [42, 42 + 55 + (i % 3) * 6],
                opacity: [0, 0.9, 0],
              }}
              transition={{
                duration: 1.2 / d.speed,
                repeat: Infinity,
                delay: d.delay,
                ease: "easeIn",
              }}
            />
          ))}
        {!reduce && boardPulse > 0 && (
          <motion.circle
            key={boardPulse}
            cx={50}
            cy={100}
            r={8}
            fill="none"
            stroke="var(--accent)"
            initial={{ r: 8, opacity: 0.8 }}
            animate={{ r: 36, opacity: 0 }}
            transition={{ duration: 0.9 }}
          />
        )}
      </svg>
    </div>
  );

  if (compact) return fountain;
  if (stage) {
    return (
      <div className="flex flex-col items-center gap-6">
        {fountain}
        <p className="mono text-5xl font-medium text-paper md:text-7xl">
          {formatPlainPercent(progress, 1)}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          through epoch
          {inflation != null ? ` · ${inflation.toFixed(1)}% inflation spray` : ""}
          {left != null ? ` · ${formatInteger(left)} slots left` : ""}
        </p>
        {label ? (
          <p className="max-w-sm text-center text-[11px] text-paper-muted">{label}</p>
        ) : null}
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Fountain"
      subtitle={
        inflation != null
          ? `Epoch water · spray from ${inflation.toFixed(1)}% inflation`
          : "Epoch water · spray = inflation mood"
      }
      reading={reading}
      large={large}
      instrumentId="issuance"
    >
      {fountain}
    </InstrumentFrame>
  );
}
