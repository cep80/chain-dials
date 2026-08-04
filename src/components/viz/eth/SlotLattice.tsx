"use client";

import { motion } from "framer-motion";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatDuration, formatInteger } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";
import {
  instrumentCanvasSize,
  resolveDisplayMode,
} from "@/lib/viz-scale";

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
  const reduce = useAppReducedMotion();
  const mode = resolveDisplayMode({ compact, large, stage });
  const size = instrumentCanvasSize(mode, 140);
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

  const reading = formatDuration(since);

  const grid = (
    <div
      className={`relative ${reduce ? "" : "instrument-live-glow"}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Slot lattice. ${slotInEpoch != null ? `Consensus slot ${slotInEpoch + 1} of ${SLOTS}.` : "Consensus slot unavailable."} ${reading} since tip.`}
    >
      <div
        className="absolute inset-0 rounded-[12px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 40%, color-mix(in oklab, var(--accent) 12%, transparent), transparent 70%)",
        }}
        aria-hidden
      />
      <div
        className="relative grid h-full w-full gap-1.5 p-2"
        style={{ gridTemplateColumns: "repeat(8, 1fr)" }}
      >
        {cells.map((c) => (
          <motion.div
            key={c.i}
            className="rounded-[4px] border"
            style={{
              borderColor: c.now
                ? "var(--accent)"
                : c.done
                  ? "color-mix(in oklab, var(--accent) 55%, var(--line))"
                  : "var(--line)",
              background: c.now
                ? "var(--accent)"
                : c.done
                  ? "color-mix(in oklab, var(--accent) 42%, transparent)"
                  : "color-mix(in oklab, var(--ink-soft) 80%, transparent)",
              boxShadow: c.now
                ? "0 0 14px color-mix(in oklab, var(--accent) 55%, transparent)"
                : c.done
                  ? "0 0 6px color-mix(in oklab, var(--accent) 18%, transparent)"
                  : "inset 0 1px 0 color-mix(in oklab, var(--paper) 4%, transparent)",
            }}
            animate={
              reduce || !c.now
                ? undefined
                : overdue
                  ? { opacity: [1, 0.35, 1] }
                  : { scale: [1, 1.1, 1] }
            }
            transition={
              c.now
                ? {
                    duration: overdue ? 0.7 : 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
                : undefined
            }
          />
        ))}
      </div>
      {!compact && (
        <p className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 mono text-[10px] font-medium tracking-wide text-paper-muted">
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
        <p className="instrument-stage-reading mono text-5xl font-medium text-paper md:text-7xl">
          {reading}
        </p>
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
