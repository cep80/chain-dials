"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState, type MouseEvent } from "react";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatFee, formatInteger } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";
import type { AtmosphereTx } from "@/types/metrics";

export function PriorityJets({
  large = false,
  compact = false,
  stage = false,
}: {
  large?: boolean;
  compact?: boolean;
  stage?: boolean;
}) {
  const fees = useDashboardStore((s) => s.live.recentTxs);
  const hist = useDashboardStore((s) => s.live.feeHistogram);
  const feeFastest = useDashboardStore((s) => s.live.feeFastest);
  const count = useDashboardStore((s) => s.live.mempoolCount);
  const now = useDashboardStore((s) => s.now);
  const reduce = useReducedMotion();
  const [picked, setPicked] = useState<AtmosphereTx | null>(null);

  const jets = useMemo(() => {
    const src =
      fees.length > 0
        ? fees
        : hist.map(([feeRate], i) => ({
            txid: `jet-sample-${i}`,
            feeRate,
            fee: feeRate,
            vsize: 1,
            value: 0,
            seenAt: now,
            fresh: i < 4,
            kind: "sample" as const,
          }));
    const max = Math.max(...src.map((t) => t.feeRate), 1);
    const take = src.slice(0, compact ? 8 : stage ? 20 : 14);
    return take.map((t, i) => ({
      ...t,
      h: 12 + (t.feeRate / max) * (compact ? 40 : 70),
      x: ((i + 0.5) / take.length) * 100,
      delay: (i % 5) * 0.12,
    }));
  }, [fees, hist, compact, stage, now]);

  const w = stage ? 420 : large ? 260 : compact ? 120 : 200;
  const h = stage ? 220 : large ? 150 : compact ? 72 : 120;

  const clearPick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-jet]")) return;
    if (stage) {
      e.stopPropagation();
      setPicked(null);
    }
  };

  const body = (
    <div
      className="relative overflow-hidden rounded-[10px] border border-line bg-ink"
      style={{ width: w, height: h }}
      role="img"
      aria-label={`Priority fee samples. Top ${formatFee(feeFastest, "µLamports/CU")}.`}
      onClick={clearPick}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        {jets.map((j) => (
          <g key={j.txid} data-jet>
            <motion.rect
              x={j.x - 1.6}
              width={3.2}
              y={100 - j.h}
              height={j.h}
              rx={1.2}
              fill="var(--accent)"
              opacity={0.55 + (j.fresh ? 0.35 : 0.1)}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setPicked(j);
              }}
              animate={
                reduce
                  ? undefined
                  : { y: [100 - j.h, 100 - j.h - 3, 100 - j.h], opacity: [0.5, 0.95, 0.5] }
              }
              transition={{
                duration: 1.1 + j.delay,
                repeat: Infinity,
                ease: "easeInOut",
                delay: j.delay,
              }}
            />
            <motion.ellipse
              cx={j.x}
              cy={100 - j.h - 2}
              rx={2.2}
              ry={1.4}
              fill="var(--paper)"
              opacity={0.7}
              animate={reduce ? undefined : { opacity: [0.3, 0.9, 0.3] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: j.delay }}
            />
          </g>
        ))}
      </svg>
      {!compact && (
        <p className="pointer-events-none absolute bottom-1 left-2 mono text-[9px] uppercase tracking-wider text-paper-muted">
          fee samples · jet = peek · empty = go big
        </p>
      )}
    </div>
  );

  const pickLine = picked ? (
    <p
      className="mono text-[10px] text-paper-muted"
      onClick={(e) => e.stopPropagation()}
    >
      Sample {formatFee(picked.feeRate, "µLamports/CU")}
      {picked.kind === "sample" || picked.txid.includes("sample")
        ? " · not a transaction"
        : ""}
    </p>
  ) : null;

  if (compact) return body;
  if (stage) {
    return (
      <div className="flex w-full flex-col items-center gap-5">
        {body}
        {picked ? (
          <p className="mono text-sm text-paper">
            {formatFee(picked.feeRate, "µLamports/CU")} prioritization sample
          </p>
        ) : (
          <p className="text-[11px] text-paper-muted">
            Click a jet for the fee sample · empty clears
          </p>
        )}
        <p className="mono text-5xl font-medium text-paper md:text-7xl">
          {formatFee(feeFastest, "µLamports/CU")}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          p90 sample
          {count != null ? ` · ${formatInteger(count)} recent fees` : ""}
        </p>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Jets"
      subtitle="Prioritization fee samples · jet = peek · empty = go big"
      reading={formatFee(feeFastest, "µLamports/CU")}
      large={large}
      instrumentId="atmosphere"
    >
      <div className="flex w-full flex-col gap-2">
        {body}
        {pickLine}
      </div>
    </InstrumentFrame>
  );
}
