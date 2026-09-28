"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ReadingStatus } from "@/components/status/ReadingStatus";
import { CHAIN_ORDER, CHAINS } from "@/lib/chains/registry";
import type { ChainId } from "@/lib/chains/types";
import {
  flattenWatched,
  loadAllWatched,
  subscribeWatched,
  type WatchedWallet,
} from "@/lib/wallet/watch";

function shortAddr(a: string): string {
  if (a.length <= 20) return a;
  return `${a.slice(0, 10)}…${a.slice(-8)}`;
}

function formatNative(n: number | null, unit: string): string {
  if (n == null || !Number.isFinite(n)) return "-";
  const abs = Math.abs(n);
  const d = abs === 0 ? 0 : abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
  return `${n.toLocaleString("en-US", {
    maximumFractionDigits: d,
    minimumFractionDigits: 0,
  })} ${unit}`;
}

type Row = { chainId: ChainId; item: WatchedWallet };

/** Device-local watched addresses, all chains. Hidden when the list is empty. */
export function SuiteWalletWatchStrip() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    const sync = () => setRows(flattenWatched(loadAllWatched(), CHAIN_ORDER));
    const timer = setTimeout(sync, 0);
    const stop = subscribeWatched(sync);
    return () => { clearTimeout(timer); stop(); };
  }, []);

  if (!rows?.length) return null;

  return (
    <section aria-label="Watched addresses" className="mb-8">
      <div className="mb-3">
        <h2 className="text-lg font-bold text-paper">Watched addresses</h2>
        <p className="text-sm text-paper-muted">
          Saved on this device. Open a chain to refresh the reading.
        </p>
      </div>
      <ul className="divide-y divide-line/70 overflow-hidden rounded-[14px] border border-line">
        {rows.map(({ chainId, item }) => {
          const c = CHAINS[chainId];
          return (
            <li key={`${chainId}-${item.address}`}>
              <Link
                href={`/${c.slug}/wallet?a=${encodeURIComponent(item.address)}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-ink-soft/40"
              >
                <span className="min-w-0">
                  <span className="mr-2 text-[10px] font-bold uppercase tracking-wider text-accent">
                    {c.shortName}
                  </span>
                  <span className="text-sm text-paper">
                    {item.label || shortAddr(item.address)}
                  </span>
                  {item.label ? (
                    <span className="mono ml-2 text-[11px] text-paper-muted">
                      {shortAddr(item.address)}
                    </span>
                  ) : null}
                </span>
                <span className="mono text-sm text-paper">
                  {formatNative(item.balanceNative, item.unit || c.ticker)}
                  <span className="mt-1 block"><ReadingStatus updatedAt={item.fetchedAt} staleMs={120_000} /></span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
