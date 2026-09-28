"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CHAIN_ORDER, CHAINS } from "@/lib/chains/registry";
import type { ChainId } from "@/lib/chains/types";
import type { TipSnapshot } from "@/lib/chains/fetch";
import type { ChainSnapshot } from "@/lib/chains/snapshot";
import { formatDuration, formatFee } from "@/lib/format";
import { useJsonResource } from "@/hooks/useJsonResource";
import { ReadingStatus } from "@/components/status/ReadingStatus";

function PulseCard({ id }: { id: ChainId }) {
  const c = CHAINS[id];
  const tipMs = id === "sol" || id === "hype" ? 2500 : 5000;
  const tip = useJsonResource<TipSnapshot>(`/api/suite/tip/${id}`, { staleMs: tipMs, pollMs: tipMs });
  const snapshot = useJsonResource<ChainSnapshot>(id === "btc" ? null : `/api/suite/snapshot/${id}`, { staleMs: 15_000, pollMs: 15_000 });
  const fees = useJsonResource<{ fastestFee: number }>(id === "btc" ? "/api/mempool/v1/fees/recommended" : null, { staleMs: 30_000, pollMs: 30_000 });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState !== "hidden") setNow(Date.now()); }, 1000);
    return () => clearInterval(timer);
  }, []);
  const fee = id === "btc" ? fees.data?.fastestFee : snapshot.data?.feeFastest;
  const feeState = id === "btc" ? fees : snapshot;
  return (
    <li><Link href={`/${c.slug}`} className="flex h-full flex-col gap-3 rounded-[12px] border border-line bg-ink-elevated/70 px-3.5 py-3 transition hover:border-accent/50">
      <span className="w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink" style={{ background: c.accent }}>{c.shortName}</span>
      <div><p className="text-[10px] uppercase tracking-wider text-paper-muted">Since {c.cadenceLabel === "slot" ? "slot" : "block"}</p><p className="mono text-sm text-paper">{formatDuration(tip.data?.timestamp != null ? Math.max(0, (now - tip.data.timestamp) / 1000) : null)}</p><ReadingStatus updatedAt={tip.updatedAt} loading={tip.loading} error={tip.error} staleMs={30_000} /></div>
      <div><p className="text-[10px] uppercase tracking-wider text-paper-muted">{id === "sol" ? "Priority" : id === "btc" ? "Fee" : "Gas p90"}</p><p className="mono text-sm text-paper">{formatFee(fee ?? null, c.feeUnit)}</p><ReadingStatus updatedAt={fee != null ? feeState.updatedAt : null} loading={feeState.loading} error={feeState.error} staleMs={60_000} /></div>
    </Link></li>
  );
}

export function SuitePulseStrip() {
  return <section aria-label="Compare heartbeat across chains" className="mb-10">
    <div className="mb-3"><h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Compare heartbeat</h2><p className="mt-1 text-xs text-paper-muted">Network cadence and fees, each with its own freshness reading.</p></div>
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{CHAIN_ORDER.map((id) => <PulseCard key={id} id={id} />)}</ul>
  </section>;
}
