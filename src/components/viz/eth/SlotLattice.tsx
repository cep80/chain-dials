"use client";

import { motion, useReducedMotion } from "framer-motion";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatDuration, formatInteger } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

const SLOTS = 32;

export function SlotLattice({
  large = false,
  compact = false,
  stage = false,
}: {
  large?: boolean;
  compact?: boolean;
  stage?: boolean;
}) {
  const tipTimestamp = useDashboardStore((s) => s.live.tipTimestamp);
  const height = useDashboardStore((s) => s.live.blockHeight);
  const epochProgress = useDashboardStore((s) => s.live.retargetProgress);
  const now = useDashboardStore((s) => s.now);
  const reduce = useReducedMotion();
  const since =
    tipTimestamp != null ? Math.max(0, (now - tipTimestamp) / 1000) : null;

  const slotInEpoch =
    epochProgress != null
      ? Math.min(SLOTS - 1, Math.floor((epochProgress / 100) * SLOTS))
      : null;

  const overdue = since != null && since > 18;

  const cells = Array.from({ length: SLOTS }, (_, i) => ({
    i,
    done: slotInEpoch != null && i < slotInEpoch,
    now: slotInEpoch != null && i === slotInEpoch,
  }));

  const size = stage ? 280 : large ? 180 : compact ? 88 : 140;
  const reading = formatDuration(since);

  const grid = (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Slot lattice. ${slotInEpoch != null ? `Consensus slot ${slotInEpoch + 1} of ${SLOTS}.` : "Consensus slot unavailable."} ${reading} since tip.`}
    >
      <div
        className="grid h-full w-full gap-1 p-1"
        style={{ gridTemplateColumns: "repeat(8, 1fr)" }}
      >
        {cells.map((c) => (
          <motion.div
            key={c.i}
            className="rounded-[3px] border"
            style={{
              borderColor: c.now
                ? "var(--accent)"
                : c.done
                  ? "var(--accent-dim)"
                  : "var(--line)",
              background: c.now
                ? "var(--accent)"
                : c.done
                  ? "color-mix(in oklab, var(--accent) 35%, transparent)"
                  : "var(--ink)",
            }}
            animate={
              reduce || !c.now
                ? undefined
                : overdue
                  ? { opacity: [1, 0.35, 1] }
                  : { scale: [1, 1.08, 1] }
            }
            transition={
              c.now
                ? { duration: overdue ? 0.7 : 1.2, repeat: Infinity, ease: "easeInOut" }
                : undefined
            }
          />
        ))}
      </div>
      {!compact && (
        <p className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 mono text-[9px] text-paper-muted">
          {slotInEpoch != null ? `${slotInEpoch + 1}/${SLOTS}` : "—/32"}
        </p>
      )}
    </div>
  );

  if (compact) return grid;
  if (stage) {
    return (
      <div className="flex flex-col items-center gap-6">
        {grid}
        <p className="mono text-5xl font-medium text-paper md:text-7xl">{reading}</p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          since tip · slot {slotInEpoch != null ? slotInEpoch + 1 : "—"} of {SLOTS}
          {height != null ? ` · block ${formatInteger(height)}` : ""}
        </p>
        <p className="max-w-sm text-center text-[11px] text-paper-muted">
          Grid is the canonical Beacon-chain slot in this epoch, rather than an
          execution-block-height proxy.
        </p>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Lattice"
      subtitle="32 consensus slots · canonical Beacon-chain position"
      reading={reading}
      large={large}
      instrumentId="metronome"
    >
      {grid}
    </InstrumentFrame>
  );
}
