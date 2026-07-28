"use client";

import { motion, useReducedMotion } from "framer-motion";
import { formatDuration, formatFee, formatInteger, formatUsd } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

function Chip({
  label,
  value,
  tense,
}: {
  label: string;
  value: string;
  tense?: boolean;
}) {
  return (
    <div
      className={`min-w-0 flex-1 rounded-[10px] border px-3 py-2.5 md:px-4 ${
        tense
          ? "border-warn/50 bg-warn/10"
          : "border-line bg-ink-elevated/80"
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.16em] text-paper-muted">
        {label}
      </div>
      <div className="mono mt-1 truncate text-base font-medium text-paper md:text-lg">
        {value}
      </div>
    </div>
  );
}

export function PulseStrip() {
  const live = useDashboardStore((s) => s.live);
  const now = useDashboardStore((s) => s.now);
  const reduce = useReducedMotion();

  const since =
    live.tipTimestamp != null ? (now - live.tipTimestamp) / 1000 : null;
  const tense = since != null && since > 12 * 60;

  return (
    <motion.section
      aria-label="Network pulse"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <Chip label="Price" value={formatUsd(live.priceUsd, 0)} />
      <Chip
        label="Height"
        value={live.blockHeight != null ? formatInteger(live.blockHeight) : "—"}
      />
      <Chip
        label="Mempool"
        value={
          live.mempoolCount != null ? formatInteger(live.mempoolCount) : "—"
        }
      />
      <Chip label="Fee" value={formatFee(live.feeFastest)} />
      <Chip
        label="Since tip"
        value={formatDuration(since)}
        tense={tense}
      />
    </motion.section>
  );
}
