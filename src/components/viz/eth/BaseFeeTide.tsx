"use client";

import { motion } from "framer-motion";
import { useId, useMemo } from "react";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatFee, formatInteger, formatPlainPercent } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";
import { tideHeight } from "@/lib/viz-scale";

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
  const reduce = useAppReducedMotion();
  const uid = useId().replace(/:/g, "");

  const latestBase =
    baseSeries.length > 0 ? baseSeries[baseSeries.length - 1]! : null;
  const latestTip =
    prioritySeries.length > 0
      ? prioritySeries[prioritySeries.length - 1]!
      : null;

  // Tide height from base fee level (gwei), soft-capped
  const baseCap = Math.max(...(baseSeries.length ? baseSeries : [20]), 20);
  const tide = tideHeight(latestBase, baseCap);

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

  // Soft tip-foam dashes (not clickable sample dots)
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

  const w = stage ? 640 : large ? 260 : compact ? 120 : 200;
  const h = stage ? 340 : large ? 150 : compact ? 72 : 120;

  const reading =
    latestBase != null
      ? `${formatFee(latestBase, "gwei")} base`
      : formatFee(feeFastest, "gwei");

  const body = (
    <div
      className={`relative overflow-hidden rounded-[12px] border border-line/80 bg-ink shadow-[0_0_40px_color-mix(in_oklab,var(--accent)_8%,transparent)] ${
        reduce ? "" : "instrument-live-glow"
      }`}
      style={{ width: w, height: h }}
      role="img"
      aria-label={`Base fee tide. Base ${formatFee(latestBase, "gwei")}. Priority tip ${formatFee(latestTip, "gwei")}.`}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id={`tideFill-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--paper)" stopOpacity="0.25" />
            <stop offset="18%" stopColor="var(--accent)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="var(--accent-dim)" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id={`tideSky-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ink-soft)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--ink)" stopOpacity="1" />
          </linearGradient>
          <filter id={`tideBlur-${uid}`} x="-5%" y="-5%" width="110%" height="120%">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
        </defs>
        <rect width="100" height="100" fill={`url(#tideSky-${uid})`} />
        <motion.path
          d={wave}
          fill={`url(#tideFill-${uid})`}
          filter={`url(#tideBlur-${uid})`}
          initial={false}
          animate={reduce ? undefined : { opacity: [0.88, 1, 0.88] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Specular crest line */}
        <motion.path
          d={wave.replace(/ L 100 100 L 0 100 Z$/, "")}
          fill="none"
          stroke="var(--paper)"
          strokeWidth={0.4}
          opacity={0.35}
        />
        {foam.map((f) => (
          <motion.rect
            key={f.id}
            x={f.x - f.w / 2}
            y={f.y}
            width={f.w}
            height={1.3}
            rx={0.6}
            fill="var(--paper)"
            opacity={0.32}
            animate={
              reduce
                ? undefined
                : { opacity: [0.15, 0.45, 0.15], y: [f.y, f.y - 1.4, f.y] }
            }
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </svg>
      {!compact && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between p-2 mono text-[9px] uppercase tracking-wider text-paper-muted">
          <span>base fee wave</span>
          <span>tip foam</span>
        </div>
      )}
    </div>
  );

  if (compact) return body;
  if (stage) {
    return (
      <div className="flex w-full flex-col items-center gap-5">
        {body}
        <p className="instrument-stage-reading mono text-5xl font-medium text-paper md:text-7xl">
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
          Click anywhere to expand. Foam shows decorative priority tips, not samples.
        </p>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Tide"
      subtitle="Base fee wave · tip foam is decorative · click to expand"
      reading={reading}
      large={large}
      instrumentId="atmosphere"
    >
      {body}
    </InstrumentFrame>
  );
}
