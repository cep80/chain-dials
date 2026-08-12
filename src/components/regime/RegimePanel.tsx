"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Hint } from "@/components/ui/Hint";
import { RegimeHowTo } from "@/components/regime/RegimeHowTo";
import { formatUsd } from "@/lib/format";
import {
  evaluateHypeRegime,
  regimeLiveFromBoard,
} from "@/lib/regime/evaluate";
import {
  applyPaperStance,
  loadPaperBook,
  paperEquity,
  savePaperBook,
  unrealizedPnl,
  type PaperBook,
} from "@/lib/regime/paper";
import {
  isRegimeId,
  REGIME_LABELS,
  STANCE_LABELS,
  type RegimeReading,
} from "@/lib/regime/types";
import { useDashboardStore } from "@/lib/store";

function notifyFlip(reading: RegimeReading, prevLabel: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const reason = reading.reasons[0] ?? REGIME_LABELS[reading.regime];
  new Notification(`HYPE ${REGIME_LABELS[reading.regime]}`, {
    body: `${prevLabel} → ${REGIME_LABELS[reading.regime]}. ${reason} Stance ${STANCE_LABELS[reading.stance]}. Paper only.`,
    tag: "regime-hype",
  });
}

export function RegimePanel() {
  const live = useDashboardStore((s) => s.live);
  const reduce = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  const [book, setBook] = useState<PaperBook>(() => loadPaperBook());
  const [reading, setReading] = useState<RegimeReading | null>(null);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    () => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return "unsupported";
      }
      return Notification.permission;
    },
  );
  const lastRegime = useRef<string | null>(null);
  const lastNotifyAt = useRef(0);

  useEffect(() => {
    setBook(loadPaperBook());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePaperBook(book);
  }, [book, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const snap = regimeLiveFromBoard(live, Date.now());
    const prev = lastRegime.current;
    const next = evaluateHypeRegime(
      snap,
      {},
      prev && isRegimeId(prev) ? prev : null,
    );
    setReading(next);
    const ready = snap.fundingBps.length > 0;
    if (!ready) return;
    setBook((prevBook) =>
      applyPaperStance(prevBook, {
        stance: next.stance,
        regime: next.regime,
        mark: live.priceUsd,
        now: Date.now(),
      }),
    );
    if (
      prev &&
      prev !== next.regime &&
      next.confidence >= 0.5 &&
      Date.now() - lastNotifyAt.current > 5 * 60_000
    ) {
      notifyFlip(
        next,
        isRegimeId(prev) ? REGIME_LABELS[prev] : prev,
      );
      lastNotifyAt.current = Date.now();
    }
    lastRegime.current = next.regime;
  }, [
    hydrated,
    live.baseFeeSeries,
    live.recentTxs,
    live.securityScore,
    live.issuanceProgress,
    live.priceUsd,
  ]);

  const mark = live.priceUsd;
  const equity = paperEquity(book, mark);
  const uPnl = unrealizedPnl(book, mark);
  const totalPnl = book.realizedPnl + uPnl;
  const regimeLabel = reading ? REGIME_LABELS[reading.regime] : "…";
  const stanceLabel = reading ? STANCE_LABELS[reading.stance] : "…";
  const reason = reading?.reasons[0] ?? "Waiting on Funding Tide.";

  const toggleAuto = () => {
    setBook((prev) => {
      const next = { ...prev, auto: !prev.auto };
      if (!next.auto || !reading) return next;
      return applyPaperStance(next, {
        stance: reading.stance,
        regime: reading.regime,
        mark,
        now: Date.now(),
      });
    });
  };

  const enableNudges = async () => {
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setPerm(p);
  };

  return (
    <section id="regime" className="mt-8 border-t border-line/80 pt-5">
      <Hint tip="regime.panel">
        <p className="text-[10px] uppercase tracking-[0.22em] text-accent">
          Paper co-pilot
        </p>
      </Hint>
      <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {reduce ? (
            <h2 className="text-2xl font-bold text-paper">
              {regimeLabel}
              <span className="text-paper-muted"> · {stanceLabel}</span>
            </h2>
          ) : (
            <motion.h2
              key={`${regimeLabel}-${stanceLabel}`}
              className="text-2xl font-bold text-paper"
              initial={{ opacity: 0.35, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {regimeLabel}
              <span className="text-paper-muted"> · {stanceLabel}</span>
            </motion.h2>
          )}
          <p className="mt-1 max-w-xl text-sm text-paper-muted">{reason}</p>
          {reading?.reasons[1] ? (
            <p className="mt-0.5 text-sm text-paper-muted">
              {reading.reasons[1]}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-paper-muted">
              Paper
            </p>
            <p className="mono text-lg text-paper">{formatUsd(equity, 0)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-paper-muted">
              PnL
            </p>
            <p
              className={`mono text-lg ${
                totalPnl > 0.5
                  ? "text-up"
                  : totalPnl < -0.5
                    ? "text-down"
                    : "text-paper"
              }`}
            >
              {formatUsd(totalPnl, 0)}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <label className="flex items-center gap-2 text-paper">
          <input
            type="checkbox"
            checked={book.auto}
            onChange={toggleAuto}
          />
          Auto paper on flips
        </label>
        {perm !== "granted" && perm !== "unsupported" ? (
          <button
            type="button"
            onClick={() => void enableNudges()}
            className="text-xs text-accent hover:underline"
          >
            Allow flip nudges
          </button>
        ) : null}
        <p className="text-xs text-paper-muted">
          Paper only. Not orders. Local to this device.
        </p>
      </div>
      <RegimeHowTo current={reading?.regime ?? null} />
    </section>
  );
}
