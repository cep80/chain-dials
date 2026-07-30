"use client";

import { useEffect, useRef, useState } from "react";
import { useChain } from "@/lib/chains/context";
import { useDashboardStore } from "@/lib/store";

const KEY = (slug: string) => `chain-dials:local-nudge:${slug}:v1`;

/**
 * Pre-Pro return vector: optional browser notifications for fee spike / quiet tip.
 * Local only - no email backend yet.
 */
export function LocalReturnNudge() {
  const chain = useChain();
  const live = useDashboardStore((s) => s.live);
  const now = useDashboardStore((s) => s.now);
  const [enabled, setEnabled] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const lastFeeNudge = useRef(0);
  const lastQuietNudge = useRef(0);
  const feeBaseline = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPerm("unsupported");
      return;
    }
    setPerm(Notification.permission);
    try {
      setEnabled(localStorage.getItem(KEY(chain.slug)) === "1");
    } catch {
      // ignore
    }
  }, [chain.slug]);

  useEffect(() => {
    if (!enabled || perm !== "granted") return;
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
        lastFeeNudge.current = Date.now();
        new Notification(`${chain.shortName} fees heating up`, {
          body: `Hottest fee around ${Math.round(fee)} ${chain.feeUnit}. Open the board if you care.`,
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
      lastQuietNudge.current = Date.now();
      new Notification(`${chain.shortName} tip looks quiet`, {
        body: `No new ${chain.tipNoun} for a bit. Worth a glance?`,
        tag: `quiet-${chain.slug}`,
      });
    }
  }, [enabled, perm, live.feeFastest, live.tipTimestamp, now, chain]);

  const enable = async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPerm(result);
    if (result === "granted") {
      setEnabled(true);
      localStorage.setItem(KEY(chain.slug), "1");
    }
  };

  const disable = () => {
    setEnabled(false);
    localStorage.setItem(KEY(chain.slug), "0");
  };

  if (perm === "unsupported") return null;

  return (
    <div className="mt-6 rounded-[14px] border border-line bg-ink-elevated/80 p-4">
      <p className="text-sm font-semibold text-paper">Local return nudge</p>
      <p className="mt-1 text-xs text-paper-muted">
        Optional browser pings when fees spike or the tip goes quiet on{" "}
        {chain.name}. Stays on this device - not email, not Pro yet.
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
    </div>
  );
}
