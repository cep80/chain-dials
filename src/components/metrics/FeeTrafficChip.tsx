"use client";

import { useDashboardStore } from "@/lib/store";

type Level = "calm" | "busy" | "hot";

function levelFor(satVb: number | null): Level {
  if (satVb == null) return "calm";
  if (satVb >= 20) return "hot";
  if (satVb >= 5) return "busy";
  return "calm";
}

const STYLES: Record<Level, string> = {
  calm: "border-up/40 text-up bg-up/10",
  busy: "border-warn/40 text-warn bg-warn/10",
  hot: "border-down/40 text-down bg-down/10",
};

const LABELS: Record<Level, string> = {
  calm: "Calm",
  busy: "Busy",
  hot: "Hot",
};

export function FeeTrafficChip() {
  const fee = useDashboardStore((s) => s.live.feeFastest);
  const level = levelFor(fee);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STYLES[level]}`}
    >
      {LABELS[level]}
    </span>
  );
}
