"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatFee, formatInteger, formatPlainPercent } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

export function BaseFeeTide({
  large = false,
  compact = false,
  stage = false,
}: {
  large?: boolean;
  compact?: boolean;
  stage?: boolean;
}) {
  const feeFastest = useDashboardStore((s) => s.live.feeFastest);
  const feeEconomy = useDashboardStore((s) => s.live.feeEconomy);
  const baseSeries = useDashboardStore((s) => s.live.baseFeeSeries);
  const prioritySeries = useDashboardStore((s) => s.live.prioritySeries);
  const pressure = useDashboardStore((s) => s.live.mempoolPressure);
  const count = useDashboardStore((s) => s.live.mempoolCount);
  const reduce = useReducedMotion();

  const latestBase =
    baseSeries.length > 0 ? baseSeries[baseSeries.length - 1]! : null;
  const latestTip =
    prioritySeries.length > 0
      ? prioritySeries[prioritySeries.length - 1]!
      : null;

  // Tide height from base fee level (gwei), soft-capped
  const baseCap = Math.max(...(baseSeries.length ? baseSeries : [20]), 20);
  const tide =
    latestBase != null
      ? Math.max(0.12, Math.min(0.92, latestBase / (baseCap * 1.15)))
      : 0.4;

  const wave = useMemo(() => {
    const series =
      baseSeries.length >= 3
        ? baseSeries
        : Array.from({ length: 12 }, (_, i) => 10 + Math.sin(i * 0.6) * 4);
    const max = Math.max(...series, 1);
    const pts = series.map((v, i) => ({
      x: (i / Math.max(1, series.length - 1)) * 100,
      y: 100 - Math.min(88, (v / max) * 55 + tide * 20),
    }));
    const d = pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");
    return `${d} L 100 100 L 0 100 Z`;
  }, [baseSeries, tide]);

  // Soft tip-foam dashes — not clickable sample dots
  const foam = useMemo(() => {
    const tips = prioritySeries.length
      ? prioritySeries.slice(- (compact ? 6 : 12))
      : Array.from({ length: 8 }, (_, i) => 1 + (i % 3));
    const max = Math.max(...tips, 1);
    return tips.map((t, i) => ({
      id: `foam-${i}`,
      x: 8 + (i / Math.max(1, tips.length - 1)) * 84,
      y: 100 - tide * 100 - 3 - (t / max) * 14,
      w: 2.4 + (t / max) * 2,
    }));
  }, [prioritySeries, tide, compact]);

  const w = stage ? 420 : large ? 260 : compact ? 120 : 200;
  const h = stage ? 220 : large ? 150 : compact ? 72 : 120;

  const reading =
    latestBase != null
      ? `${formatFee(latestBase, "gwei")} base`
      : formatFee(feeFastest, "gwei");

  const body = (
    <div
      className="relative overflow-hidden rounded-[10px] border border-line bg-ink"
      style={{ width: w, height: h }}
      role="img"
      aria-label={`Base fee tide. Base ${formatFee(latestBase, "gwei")}. Priority tip ${formatFee(latestTip, "gwei")}.`}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="tideFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--accent-dim)" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <motion.path
          d={wave}
          fill="url(#tideFill)"
          initial={false}
          animate={reduce ? undefined : { opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        {foam.map((f) => (
          <motion.rect
            key={f.id}
            x={f.x - f.w / 2}
            y={f.y}
            width={f.w}
            height={1.1}
            rx={0.5}
            fill="var(--paper)"
            opacity={0.28}
            animate={
              reduce
                ? undefined
                : { opacity: [0.15, 0.35, 0.15], y: [f.y, f.y - 1.2, f.y] }
            }
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </svg>
      {!compact && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between p-2 mono text-[9px] uppercase tracking-wider text-paper-muted">
          <span>base fee wave</span>
          <span>tip foam (decor)</span>
        </div>
      )}
    </div>
  );

  if (compact) return body;
  if (stage) {
    return (
      <div className="flex w-full flex-col items-center gap-5">
        {body}
        <p className="mono text-5xl font-medium text-paper md:text-7xl">
          {formatFee(latestBase ?? feeFastest, "gwei")}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          base gwei · tip {formatFee(latestTip, "gwei")}
          {pressure != null
            ? ` · block fullness ${formatPlainPercent(pressure, 0)}`
            : ""}
          {count != null ? ` · ${formatInteger(count)} in last block` : ""}
        </p>
        <p className="text-center text-[11px] text-paper-muted">
          Click anywhere to expand. Foam is decorative priority tips, not samples.
        </p>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Tide"
      subtitle="Base fee wave · tip foam is decor · click to expand"
      reading={reading}
      large={large}
      instrumentId="atmosphere"
    >
      {body}
    </InstrumentFrame>
  );
}
