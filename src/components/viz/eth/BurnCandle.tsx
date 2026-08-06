"use client";

import { motion } from "framer-motion";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
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
  const supply = useDashboardStore((s) => s.live.supplyProgress);
  const burnEth = useDashboardStore((s) => s.live.burnEthPerBlock);
  const boardPulse = useDashboardStore((s) => s.boardPulse);
  const reduce = useAppReducedMotion();

  const flame = Math.max(0.12, Math.min(1, burn / 100));
  const wax =
    supply != null ? Math.max(0.2, Math.min(0.85, supply / 120)) : 0.55;

  const h = stage ? 400 : large ? 190 : compact ? 100 : 154;
  const w = stage ? 180 : large ? 100 : compact ? 56 : 80;

  const burnLabel =
    burnEth != null && burnEth > 0
      ? `${burnEth < 0.01 ? burnEth.toFixed(4) : burnEth.toFixed(3)} ETH`
      : formatPlainPercent(burn, 0);

  const candle = (
    <div
      className={`relative flex items-end justify-center ${reduce ? "" : "instrument-live-glow"}`}
      style={{ width: w, height: h }}
      role="img"
      aria-label={`Burn candle. About ${burnLabel} burned in the latest block. Supply clock ${supply != null ? `${supply.toFixed(0)} percent` : "unavailable"}.`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 100%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 70%)",
        }}
        aria-hidden
      />
      <motion.div
        className="absolute z-[2]"
        style={{
          bottom: `${wax * 100 * 0.72 + 18}%`,
          width: compact ? 18 : 30,
          height: compact ? 30 : 48,
        }}
        animate={
          reduce
            ? undefined
            : {
                scaleY: [0.9, 1.18, 0.95, 1.12, 0.9],
                scaleX: [1, 0.9, 1.06, 0.94, 1],
                opacity: [0.78, 1, 0.88, 1, 0.78],
              }
        }
        transition={{ duration: 1.1 + (1 - flame), repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="h-full w-full rounded-[50%_50%_50%_50%/60%_60%_40%_40%]"
          style={{
            background: `radial-gradient(circle at 50% 70%, rgba(255,255,255,0.85) 0%, var(--accent) ${35 + flame * 32}%, transparent 72%)`,
            filter: `drop-shadow(0 0 ${8 + flame * 14}px var(--accent)) drop-shadow(0 0 ${4 + flame * 6}px rgba(255,220,160,0.5))`,
            transform: `scale(${0.72 + flame * 0.58})`,
          }}
        />
      </motion.div>

      <div
        className="relative w-[55%] overflow-hidden rounded-b-[8px] border border-line-strong"
        style={{
          height: `${wax * 72}%`,
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--ink-elevated) 90%, var(--paper) 10%), var(--ink-elevated))",
          boxShadow:
            "0 0 20px color-mix(in oklab, var(--accent) 12%, transparent), inset 0 1px 0 color-mix(in oklab, var(--paper) 8%, transparent)",
        }}
      >
        <motion.div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: `${flame * 100}%`,
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--accent) 55%, transparent), color-mix(in oklab, var(--accent-dim) 40%, transparent))",
          }}
          animate={reduce ? undefined : { opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        />
        <div className="absolute left-1/2 top-0 h-3.5 w-[2px] -translate-x-1/2 bg-paper-muted shadow-[0_0_6px_var(--accent)]" />
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
        <p className="instrument-stage-reading mono text-5xl font-medium text-paper md:text-7xl">
          {burnLabel}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          burned last block
          {supply != null
            ? ` · supply clock ${formatPlainPercent(supply, 0)}`
            : " · supply feed unavailable"}
        </p>
        <p className="max-w-sm text-center text-[11px] text-paper-muted">
          Flame = base fee × gas used (EIP-1559 burn). Wax tracks reported
          circulating supply against a soft 120M clock, not mint rate.
        </p>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Candle"
      subtitle="Flame = ETH burned last block · wax = reported supply clock"
      reading={burnLabel}
      large={large}
      instrumentId="issuance"
    >
      {candle}
    </InstrumentFrame>
  );
}
