"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatInteger, formatPlainPercent } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

function formatBps(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "-";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)} bps`;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

export function FundingTide({
  large = false,
  compact = false,
  stage = false,
}: {
  large?: boolean;
  compact?: boolean;
  stage?: boolean;
}) {
  const fundingSeries = useDashboardStore((s) => s.live.baseFeeSeries);
  const prioritySeries = useDashboardStore((s) => s.live.prioritySeries);
  const pressure = useDashboardStore((s) => s.live.mempoolPressure);
  const count = useDashboardStore((s) => s.live.mempoolCount);
  const reduce = useReducedMotion();

  const latestFunding =
    fundingSeries.length > 0 ? fundingSeries[fundingSeries.length - 1]! : null;
  const medianFunding = median(fundingSeries);

  const absCap = Math.max(
    ...fundingSeries.map((v) => Math.abs(v)),
    0.5,
  );
  const tideAnchor = latestFunding ?? medianFunding;
  const tide =
    tideAnchor != null
      ? Math.max(0.15, Math.min(0.9, 0.45 + tideAnchor / (absCap * 2.2)))
      : 0.45;

  const wave = useMemo(() => {
    const series =
      fundingSeries.length >= 3
        ? fundingSeries
        : Array.from({ length: 12 }, (_, i) => Math.sin(i * 0.7) * 0.4);
    const max = Math.max(...series.map((v) => Math.abs(v)), 0.3);
    const pts = series.map((v, i) => ({
      x: (i / Math.max(1, series.length - 1)) * 100,
      y: 100 - Math.min(88, ((v + max) / (max * 2)) * 50 + tide * 18),
    }));
    const d = pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");
    return `${d} L 100 100 L 0 100 Z`;
  }, [fundingSeries, tide]);

  const foam = useMemo(() => {
    const tips = prioritySeries.length
      ? prioritySeries.slice(-(compact ? 6 : 12))
      : Array.from({ length: 8 }, (_, i) => 0.05 + (i % 3) * 0.02);
    const max = Math.max(...tips, 0.01);
    return tips.map((t, i) => ({
      id: `hype-foam-${i}`,
      x: 8 + (i / Math.max(1, tips.length - 1)) * 84,
      y: 100 - tide * 100 - 3 - (t / max) * 12,
      w: 2.2 + (t / max) * 2,
    }));
  }, [prioritySeries, tide, compact]);

  const w = stage ? 420 : large ? 260 : compact ? 120 : 200;
  const h = stage ? 220 : large ? 150 : compact ? 72 : 120;
  const reading = formatBps(latestFunding);

  const body = (
    <div
      className="relative overflow-hidden rounded-[10px] border border-line bg-ink"
      style={{ width: w, height: h }}
      role="img"
      aria-label={`Funding tide. ${reading}.`}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="hypeTideFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--accent-dim)" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        <motion.path
          d={wave}
          fill="url(#hypeTideFill)"
          initial={false}
          animate={reduce ? undefined : { opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
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
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </svg>
      {!compact && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between p-2 mono text-[9px] uppercase tracking-wider text-paper-muted">
          <span>48h funding</span>
          <span>gas foam</span>
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
          {formatBps(latestFunding)}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          HYPE funding · hourly history
          {medianFunding != null ? ` · median ${formatBps(medianFunding)}` : ""}
          {pressure != null
            ? ` · gas fullness ${formatPlainPercent(pressure, 0)}`
            : ""}
          {count != null ? ` · ${formatInteger(count)} perps` : ""}
        </p>
        <p className="text-center text-[11px] text-paper-muted">
          Wave is Hyperliquid HYPE funding history (hourly). Positive: longs
          pay shorts. Foam is HyperEVM priority tips.
        </p>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Tide"
      subtitle="HYPE funding history · click to expand"
      reading={reading}
      large={large}
      instrumentId="atmosphere"
    >
      {body}
    </InstrumentFrame>
  );
}
