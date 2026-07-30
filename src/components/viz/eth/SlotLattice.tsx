"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const boardPulse = useDashboardStore((s) => s.boardPulse);
  const reduce = useReducedMotion();
  const [since, setSince] = useState<number | null>(null);
  const [scars, setScars] = useState<Set<number>>(() => new Set());
  const prevHeight = useRef<number | null>(null);

  useEffect(() => {
    if (tipTimestamp == null) {
      setSince(null);
      return;
    }
    const tick = () => setSince(Math.max(0, (Date.now() - tipTimestamp) / 1000));
    tick();
    const id = window.setInterval(tick, reduce ? 1000 : 200);
    return () => window.clearInterval(id);
  }, [tipTimestamp, reduce, boardPulse]);

  const slotInEpoch =
    epochProgress != null
      ? Math.min(SLOTS - 1, Math.floor((epochProgress / 100) * SLOTS))
      : height != null
        ? height % SLOTS
        : 0;

  // Execution-block proxy: height jump > 1 marks intervening cells as scars
  useEffect(() => {
    if (height == null) return;
    const prev = prevHeight.current;
    prevHeight.current = height;
    if (prev == null || height <= prev) return;
    const jump = height - prev;
    if (jump <= 1) return;
    setScars((old) => {
      const next = new Set(old);
      for (let h = prev + 1; h < height; h++) {
        next.add(h % SLOTS);
      }
      // Keep scars in current epoch window only
      for (const s of [...next]) {
        if (s > slotInEpoch) next.delete(s);
      }
      return next;
    });
  }, [height, slotInEpoch]);

  const overdue = since != null && since > 18;

  const cells = useMemo(
    () =>
      Array.from({ length: SLOTS }, (_, i) => ({
        i,
        done: i < slotInEpoch,
        now: i === slotInEpoch,
        scar: scars.has(i) && i < slotInEpoch,
      })),
    [slotInEpoch, scars],
  );

  const size = stage ? 280 : large ? 180 : compact ? 88 : 140;
  const reading = formatDuration(since);

  const grid = (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Slot lattice. Slot ${slotInEpoch + 1} of ${SLOTS}. ${reading} since tip.`}
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
                : c.scar
                  ? "var(--warn, #c9a227)"
                  : c.done
                    ? "var(--accent-dim)"
                    : "var(--line)",
              background: c.now
                ? "var(--accent)"
                : c.scar
                  ? "color-mix(in oklab, #c9a227 25%, transparent)"
                  : c.done
                    ? "color-mix(in oklab, var(--accent) 35%, transparent)"
                    : "var(--ink)",
              opacity: c.scar ? 0.55 : 1,
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
          {slotInEpoch + 1}/{SLOTS}
          {scars.size > 0 ? " · scars" : ""}
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
          since tip · slot {slotInEpoch + 1} of {SLOTS}
          {height != null ? ` · block ${formatInteger(height)}` : ""}
        </p>
        <p className="max-w-sm text-center text-[11px] text-paper-muted">
          Grid is execution height mod 32. Skipped heights leave a scar in this
          epoch window.
        </p>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Lattice"
      subtitle="32 slots · height mod 32 · scars = skipped heights"
      reading={reading}
      large={large}
      instrumentId="metronome"
    >
      {grid}
    </InstrumentFrame>
  );
}
