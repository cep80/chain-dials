"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useChain } from "@/lib/chains/context";
import { useDashboardStore } from "@/lib/store";

const KEY = (slug: string) => `chain-dials:local-nudge:${slug}:v1`;
const LAST_KEY = (slug: string) => `chain-dials:local-nudge-last:${slug}:v1`;

const emptySubscribe = () => () => {};

function deliverNudge(title: string, options: NotificationOptions): void {
  try {
    new Notification(title, options);
  } catch {
    // Some mobile browsers expose Notification but require a service worker.
    // A rejected delivery must never interrupt dashboard updates.
  }
}

function readPerm(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Pre-Pro return vector: optional browser notifications for fee spike / quiet block.
 * Local only. No email backend yet.
 */
export function LocalReturnNudge() {
  const chain = useChain();
  const live = useDashboardStore((s) => s.live);
  const now = useDashboardStore((s) => s.now);
  const connection = useDashboardStore((s) => s.connection);
  const [error, setError] = useState<string | null>(null);
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const baselinePerm = useSyncExternalStore(
    emptySubscribe,
    readPerm,
    () => "default" as const,
  );
  const [permOverride, setPerm] = useState<
    NotificationPermission | "unsupported" | null
  >(null);
  const perm = permOverride ?? baselinePerm;
  const [enabled, setEnabled] = useState(false);
  const [enabledSlug, setEnabledSlug] = useState<string | null>(null);
  const lastFeeNudge = useRef(0);
  const lastQuietNudge = useRef(0);
  const feeBaseline = useRef<number | null>(null);

  useEffect(() => {
    feeBaseline.current = null;
    try {
      const stored = JSON.parse(localStorage.getItem(LAST_KEY(chain.slug)) ?? "null") as { fee?: unknown; quiet?: unknown } | null;
      lastFeeNudge.current = typeof stored?.fee === "number" && Number.isFinite(stored.fee) ? stored.fee : 0;
      lastQuietNudge.current = typeof stored?.quiet === "number" && Number.isFinite(stored.quiet) ? stored.quiet : 0;
    } catch {
      lastFeeNudge.current = 0;
      lastQuietNudge.current = 0;
    }
  }, [chain.slug]);

  const rememberNudge = useCallback((kind: "fee" | "quiet", at: number) => {
    if (kind === "fee") lastFeeNudge.current = at;
    else lastQuietNudge.current = at;
    try { localStorage.setItem(LAST_KEY(chain.slug), JSON.stringify({ fee: lastFeeNudge.current, quiet: lastQuietNudge.current })); }
    catch { /* This visit still suppresses repeats. */ }
  }, [chain.slug]);

  if (isClient && enabledSlug !== chain.slug) {
    let next = false;
    try {
      next = localStorage.getItem(KEY(chain.slug)) === "1";
    } catch {
      // ignore
    }
    setEnabled(next);
    setEnabledSlug(chain.slug);
  }

  useEffect(() => {
    if (!enabled || enabledSlug !== chain.slug || perm !== "granted" || document.hidden || connection !== "connected" || live.lastRestAt == null || now - live.lastRestAt > 120_000) return;
    const fee = live.feeFastest;
    if (fee != null) {
      if (feeBaseline.current == null) feeBaseline.current = fee;
      else {
        feeBaseline.current = feeBaseline.current * 0.9 + fee * 0.1;
      }
      const base = feeBaseline.current || fee;
      if (
        fee > base * 1.8 &&
        Date.now() - lastFeeNudge.current > 30 * 60_000
      ) {
        rememberNudge("fee", Date.now());
        deliverNudge(`${chain.shortName} fees heating up`, {
          body: `Hottest fee around ${Math.round(fee)} ${chain.feeUnit}.`,
          tag: `fee-${chain.slug}`,
        });
      }
    }

    const since =
      live.tipTimestamp != null ? (now - live.tipTimestamp) / 1000 : null;
    const quiet =
      chain.id === "sol" || chain.id === "hype"
        ? 30
        : chain.id === "eth"
          ? 90
          : chain.targetBlockSeconds * 2;
    if (
      since != null &&
      since > quiet &&
      Date.now() - lastQuietNudge.current > 45 * 60_000
    ) {
      rememberNudge("quiet", Date.now());
      deliverNudge(`${chain.shortName} tip looks quiet`, {
        body: `No new ${chain.tipNoun} for a while.`,
        tag: `quiet-${chain.slug}`,
      });
    }
  }, [enabled, enabledSlug, perm, connection, live.lastRestAt, live.feeFastest, live.tipTimestamp, now, chain, rememberNudge]);

  const enable = async () => {
    if (!("Notification" in window)) return;
    setError(null);
    try {
      const result = await Notification.requestPermission();
      setPerm(result);
      if (result === "granted") {
        setEnabled(true);
        try { localStorage.setItem(KEY(chain.slug), "1"); }
        catch { setError("Nudges are enabled for this session, but this preference could not be saved."); }
      }
    } catch {
      setError("This browser could not enable notifications. You can try again.");
    }
  };

  const disable = () => {
    setEnabled(false);
    setError(null);
    try { localStorage.setItem(KEY(chain.slug), "0"); }
    catch { setError("Nudges are off for this session, but this preference could not be saved."); }
  };

  if (perm === "unsupported") return null;

  return (
    <div className="mt-6 rounded-[14px] border border-line bg-ink-elevated/80 p-4">
      <p className="text-sm font-semibold text-paper">Local return nudge</p>
      <p className="mt-1 text-xs text-paper-muted">
        Optional browser pings when fees spike or the latest block goes quiet on{" "}
        {chain.name}. Runs while this page is open and visible, using fresh readings.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {!enabled ? (
          <button
            type="button"
            onClick={() => void enable()}
            className="rounded-full border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent"
          >
            Enable local nudges
          </button>
        ) : (
          <button
            type="button"
            onClick={disable}
            className="rounded-full border border-line px-3 py-1.5 text-xs text-paper-muted"
          >
            Turn off
          </button>
        )}
        <span className="self-center text-[10px] uppercase tracking-wider text-paper-muted">
          {enabled ? "Watching" : perm === "denied" ? "Blocked by browser" : "Off"}
        </span>
      </div>
      {error ? <p role="status" className="mt-2 text-xs text-warn">{error}</p> : null}
    </div>
  );
}
