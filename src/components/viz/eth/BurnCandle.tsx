"use client";

import { motion, useReducedMotion } from "framer-motion";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatPlainPercent } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

export function BurnCandle({
  large = false,
  compact = false,
  stage = false,
}: {
  large?: boolean;
  compact?: boolean;
  stage?: boolean;
}) {
  const burn = useDashboardStore((s) => s.live.issuanceProgress) ?? 0;
  const supply = useDashboardStore((s) => s.live.supplyProgress) ?? 90;
  const burnEth = useDashboardStore((s) => s.live.burnEthPerBlock);
  const boardPulse = useDashboardStore((s) => s.boardPulse);
  const reduce = useReducedMotion();

  const flame = Math.max(0.12, Math.min(1, burn / 100));
  const wax = Math.max(0.2, Math.min(0.85, supply / 120));

  const h = stage ? 260 : large ? 190 : compact ? 100 : 154;
  const w = stage ? 120 : large ? 100 : compact ? 56 : 80;

  const burnLabel =
    burnEth != null && burnEth > 0
      ? `${burnEth < 0.01 ? burnEth.toFixed(4) : burnEth.toFixed(3)} ETH`
      : formatPlainPercent(burn, 0);

  const candle = (
    <div
      className="relative flex items-end justify-center"
      style={{ width: w, height: h }}
      role="img"
      aria-label={`Burn candle. About ${burnLabel} burned in the latest block. Supply clock ${supply.toFixed(0)} percent.`}
    >
      <motion.div
        className="absolute z-[2]"
        style={{
          bottom: `${wax * 100 * 0.72 + 18}%`,
          width: compact ? 18 : 28,
          height: compact ? 28 : 44,
        }}
        animate={
          reduce
            ? undefined
            : {
                scaleY: [0.9, 1.15, 0.95, 1.1, 0.9],
                scaleX: [1, 0.92, 1.05, 0.95, 1],
                opacity: [0.75, 1, 0.85, 1, 0.75],
              }
        }
        transition={{ duration: 1.1 + (1 - flame), repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="h-full w-full rounded-[50%_50%_50%_50%/60%_60%_40%_40%]"
          style={{
            background: `radial-gradient(circle at 50% 70%, #fff6 0%, var(--accent) ${40 + flame * 30}%, transparent 70%)`,
            filter: `drop-shadow(0 0 ${6 + flame * 10}px var(--accent))`,
            transform: `scale(${0.7 + flame * 0.55})`,
          }}
        />
      </motion.div>

      <div
        className="relative w-[55%] overflow-hidden rounded-b-[6px] border border-line-strong bg-ink-elevated"
        style={{ height: `${wax * 72}%` }}
      >
        <motion.div
          className="absolute inset-x-0 bottom-0 bg-accent/30"
          style={{ height: `${flame * 100}%` }}
          animate={reduce ? undefined : { opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        />
        <div className="absolute left-1/2 top-0 h-3 w-[2px] -translate-x-1/2 bg-paper-muted" />
      </div>

      {!reduce && boardPulse > 0 && (
        <motion.div
          key={boardPulse}
          className="pointer-events-none absolute inset-0 rounded-full border border-accent/70"
          initial={{ opacity: 0.7, scale: 0.8 }}
          animate={{ opacity: 0, scale: 1.3 }}
          transition={{ duration: 0.9 }}
        />
      )}
    </div>
  );

  if (compact) return candle;
  if (stage) {
    return (
      <div className="flex flex-col items-center gap-6">
        {candle}
        <p className="mono text-5xl font-medium text-paper md:text-7xl">
          {burnLabel}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          burned last block · supply clock {formatPlainPercent(supply, 0)}
        </p>
        <p className="max-w-sm text-center text-[11px] text-paper-muted">
          Flame ≈ base fee × gas used (EIP-1559 burn). Wax tracks circulating
          supply vs a soft 120M clock, not mint rate.
        </p>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Candle"
      subtitle="Flame = ETH burned last block · wax = supply clock"
      reading={burnLabel}
      large={large}
      instrumentId="issuance"
    >
      {candle}
    </InstrumentFrame>
  );
}
