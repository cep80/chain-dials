"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Hint } from "@/components/ui/Hint";
import { Sparkline } from "@/components/metrics/Sparkline";
import { METRIC_BY_ID } from "@/lib/metrics";
import { formatPercent } from "@/lib/format";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import {
  deltaFor,
  getMetricDisplay,
  getMetricNumeric,
  useDashboardStore,
} from "@/lib/store";
import type { MetricId } from "@/types/metrics";

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8 6.8 19.5l1-5.8L3.6 9.6l5.8-.8L12 3.5z"
        fill={filled ? "var(--accent)" : "none"}
        stroke={filled ? "var(--accent)" : "var(--paper-muted)"}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MetricRow({ id }: { id: MetricId }) {
  const def = METRIC_BY_ID[id];
  const live = useDashboardStore((s) => s.live);
  const now = useDashboardStore((s) => s.now);
  const histories = useDashboardStore((s) => s.histories);
  const flash = useDashboardStore((s) => s.flash[id]);
  const favorites = useDashboardStore((s) => s.favorites);
  const expandedId = useDashboardStore((s) => s.expandedId);
  const toggleFavorite = useDashboardStore((s) => s.toggleFavorite);
  const setExpanded = useDashboardStore((s) => s.setExpanded);
  const reduce = useAppReducedMotion();

  if (!def) return null;

  const pinned = favorites.includes(id);
  const expanded = expandedId === id;
  const value = getMetricNumeric(live, now, id);
  const display = getMetricDisplay(live, now, id);
  const { pct, label } = deltaFor(histories, id, value);
  const points = histories[id] ?? [];
  const showDelta = !["time_since_block", "tip_hash", "halving_date"].includes(id);

  let deltaPositive: boolean | null = null;
  if (pct != null) {
    const rawUp = pct >= 0;
    deltaPositive = def.higherIsBetter === false ? !rawUp : rawUp;
    // for neutral metrics where higherIsBetter undefined, just use raw direction for sparkline color
    if (def.higherIsBetter == null) deltaPositive = rawUp;
  }

  const tenseSince =
    id === "time_since_block" && value != null && value > 12 * 60;

  return (
    <div
      className={`border-b border-line/70 last:border-b-0 ${
        flash === "up"
          ? "bg-up/10"
          : flash === "down"
            ? "bg-down/10"
            : expanded
              ? "bg-ink-soft/80"
              : ""
      } transition-colors duration-300`}
    >
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          aria-label={pinned ? `Unpin ${def.label}` : `Pin ${def.label}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(id);
          }}
          className="flex w-8 shrink-0 items-center justify-center text-paper-muted hover:text-accent"
        >
          <Hint tip="metric.pin">
            <motion.span
              key={pinned ? "on" : "off"}
              initial={reduce ? false : { scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="inline-flex"
            >
              <StarIcon filled={pinned} />
            </motion.span>
          </Hint>
        </button>

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 px-1 py-2.5 text-left"
          onClick={() => setExpanded(expanded ? null : id)}
          aria-expanded={expanded}
        >
          <div className="min-w-0 flex-1">
            <Hint tip="metric.row" className="max-w-full">
              <div className="truncate text-xs text-paper-muted underline decoration-dotted decoration-paper-muted/40 underline-offset-2">
                {def.label}
              </div>
            </Hint>
          </div>
          <div className="hidden w-14 shrink-0 sm:block">
            <Sparkline
              points={points}
              positive={pct == null ? null : pct >= 0}
            />
          </div>
          <div className="w-14 shrink-0 text-right">
            {showDelta && pct != null ? (
              <span
                className={`mono text-[11px] ${
                  deltaPositive ? "text-up" : "text-down"
                }`}
                title={`${label} change`}
              >
                {formatPercent(pct, 1)}
              </span>
            ) : (
              <span className="text-[11px] text-paper-muted/50">-</span>
            )}
          </div>
          <div
            className={`mono w-[7.5rem] shrink-0 text-right text-sm md:w-36 md:text-base ${
              tenseSince ? "text-warn" : "text-paper"
            }`}
          >
            {display}
          </div>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-9 pb-3 text-xs leading-relaxed text-paper-muted">
              {def.definition}
              <span className="mt-1 block text-[10px] uppercase tracking-wider opacity-70">
                Source · {def.source}
                {label ? ` · delta ${label}` : ""}
              </span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
