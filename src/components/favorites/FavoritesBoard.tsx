"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MetricRow } from "@/components/metrics/MetricRow";
import { useDashboardStore } from "@/lib/store";

export function FavoritesBoard() {
  const favorites = useDashboardStore((s) => s.favorites);
  const pinDefaults = useDashboardStore((s) => s.pinDefaults);
  const hydrated = useDashboardStore((s) => s.hydrated);
  const reduce = useReducedMotion();

  return (
    <section
      aria-labelledby="favorites-heading"
      className="overflow-hidden rounded-[14px] border border-accent/35 bg-ink-elevated/80"
    >
      <header className="flex items-center justify-between gap-3 border-b border-accent/25 px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-accent">
            Pinned
          </p>
          <h2 id="favorites-heading" className="text-xl font-bold text-paper">
            Network Health
          </h2>
        </div>
        <span className="mono text-xs text-paper-muted">
          {hydrated ? favorites.length : "—"} pinned
        </span>
      </header>

      {favorites.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm text-paper-muted">
            Your board is empty. Pin the defaults to get a live pulse in one tap.
          </p>
          <button
            type="button"
            onClick={pinDefaults}
            className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink transition hover:bg-accent-dim"
          >
            Pin Network Health defaults
          </button>
        </div>
      ) : (
        <motion.div
          layout={!reduce}
          className="divide-y divide-line/60"
        >
          {favorites.map((id) => (
            <MetricRow key={id} id={id} />
          ))}
        </motion.div>
      )}
    </section>
  );
}
