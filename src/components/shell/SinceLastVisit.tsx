"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useChain } from "@/lib/chains/context";
import { useDashboardStore } from "@/lib/store";
import { compareVisits, parseVisitReading, type VisitReading } from "@/lib/changes";
import { loadWatched, subscribeWatched } from "@/lib/wallet/watch";
import { evaluateHypeRegime, regimeLiveFromBoard } from "@/lib/regime/evaluate";
import { ReadingStatus } from "@/components/status/ReadingStatus";

export function SinceLastVisit() {
  const chain = useChain();
  const [baseline, setBaseline] = useState<VisitReading | null>(null);
  const [current, setCurrent] = useState<VisitReading | null>(null);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const key = `chain-dials:visit:${chain.id}:v1`;
    let latest: VisitReading | null = null;
    let previous: VisitReading | null = null;
    try { previous = parseVisitReading(JSON.parse(localStorage.getItem(key) ?? "null")); } catch { /* first visit */ }
    const persist = () => {
      if (!latest) return;
      try { localStorage.setItem(key, JSON.stringify(latest)); setSaved(true); } catch { setSaved(false); }
    };
    const sample = () => {
      const { live, connection } = useDashboardStore.getState();
      if (document.visibilityState === "hidden") return;
      const at = live.lastRestAt;
      if (!at || Date.now() - at > 120_000 || connection !== "connected") {
        setError(connection === "connecting" ? null : "Waiting for a fresh network snapshot.");
        return;
      }
      const regimeLive = chain.id === "hype" ? regimeLiveFromBoard(live, Date.now()) : null;
      const regime = regimeLive && regimeLive.fundingBps.length ? evaluateHypeRegime(regimeLive, {}, null).regime : null;
      latest = {
        at, fee: live.feeFastest, pending: live.mempoolCount, price: live.priceUsd, regime,
        wallets: loadWatched(chain.id).flatMap((wallet) => wallet.balanceNative != null && wallet.fetchedAt != null ? [{ address: wallet.address, label: wallet.label, balance: wallet.balanceNative, at: wallet.fetchedAt }] : []),
      };
      setCurrent(latest);
      setError(null);
      persist();
    };
    const initial = setTimeout(() => { setBaseline(previous); setReady(true); sample(); }, 0);
    const timer = setInterval(() => { if (document.visibilityState !== "hidden") sample(); }, 5000);
    const stop = subscribeWatched(sample);
    const stopStore = useDashboardStore.subscribe((state, previousState) => {
      if (state.live.lastRestAt !== previousState.live.lastRestAt || state.connection !== previousState.connection) sample();
    });
    window.addEventListener("pagehide", persist);
    return () => { clearTimeout(initial); clearInterval(timer); stop(); stopStore(); window.removeEventListener("pagehide", persist); };
  }, [chain.id]);
  const changes = baseline && current ? compareVisits(baseline, current, chain.id, chain.feeUnit, chain.ticker) : [];
  return (
    <section aria-labelledby="since-last-visit-heading" className="mb-6 rounded-[14px] border border-line bg-ink-elevated/60 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 id="since-last-visit-heading" className="text-lg font-bold text-paper">Since your last visit</h2><p className="mt-1 text-xs text-paper-muted">{baseline ? `Compared with ${new Date(baseline.at).toLocaleString()}.` : "Your first successful reading creates a comparison for next time."}</p></div>
        <ReadingStatus updatedAt={current?.at ?? null} loading={!current && !error} error={error} staleMs={120_000} />
      </div>
      {changes.length > 0 ? <ul className="mt-4 grid gap-2 sm:grid-cols-2">{changes.map((change) => <li key={change.id}><Link href={change.href} className="block rounded-lg border border-line px-3 py-3 hover:border-accent"><span className="block text-sm font-semibold text-paper">{change.title} <span aria-hidden className="text-accent">→</span></span><span className="mono mt-1 block text-xs text-paper-muted">{change.detail}</span></Link></li>)}</ul> : <p className="mt-3 text-sm text-paper-muted">{!ready || !current ? "Waiting for current readings…" : baseline ? "No significant changes in the available readings." : saved ? "Baseline saved for your next visit." : "Current reading available for this session."}</p>}
      <p className="mt-3 text-[11px] text-paper-muted">Highlights fees and pending activity moving 20%+, price moving 2%+, regime changes, and watched balance changes. Wallet comparisons use saved readings; open Wallet to refresh.</p>
      {!saved ? <p role="status" className="mt-2 text-xs text-warn">Device storage is unavailable. This comparison cannot be saved for your next visit.</p> : null}
    </section>
  );
}
