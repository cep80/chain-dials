"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Visual mempool pressure vs ~1 block of vsize. */
export function MempoolMeter({ pressure }: { pressure: number | null }) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(300, pressure ?? 0));
  const fill = Math.min(100, pct);
  const hot = pct > 100;

  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-paper-muted">
        <span>Pressure</span>
        <span className="mono">{pressure == null ? "-" : `${pressure.toFixed(0)}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-soft">
        <motion.div
          className={`h-full rounded-full ${hot ? "bg-warn" : "bg-accent"}`}
          initial={false}
          animate={{ width: `${fill}%` }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 22 }}
        />
      </div>
    </div>
  );
}
