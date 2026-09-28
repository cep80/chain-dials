"use client";

import { useEffect, useState } from "react";
import { useJsonResource } from "@/hooks/useJsonResource";
import { ReadingStatus } from "@/components/status/ReadingStatus";
import type { ChainId } from "@/lib/chains/types";
import type { WalletLookup } from "@/lib/wallet/types";
import { patchWatched, recordWalletReading, sortWatched, walletAddressKey, WALLET_WATCH_CAP, type WatchedWallet, type WatchSort } from "@/lib/wallet/watch";

const shortAddress = (address: string) => `${address.slice(0, 10)}…${address.slice(-8)}`;
const amount = (value: number | null, unit: string) => value == null ? "—" : `${value.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${unit}`;

function WatchRow({ item, chainId, ticker, onOpen, onRemove }: {
  item: WatchedWallet; chainId: ChainId; ticker: string; onOpen: (address: string) => void; onRemove: (address: string) => void;
}) {
  const { data, loading, error, reload, retryAt } = useJsonResource<WalletLookup>(
    `/api/suite/wallet/${chainId}?address=${encodeURIComponent(item.address)}`, { staleMs: 30_000, pollMs: 60_000 },
  );
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const lookupError = error ?? (data && (!data.valid || data.reason === "upstream" || data.balanceNative == null) ? "The provider could not refresh this balance." : null);
  useEffect(() => {
    if (!data || !data.valid || data.reason === "upstream" || !data.normalized || walletAddressKey(chainId, data.normalized) !== walletAddressKey(chainId, item.address)) return;
    recordWalletReading(chainId, item.address, data);
  }, [data, chainId, item.address]);
  const unit = item.unit || ticker;
  const delta = item.balanceNative != null && item.previousBalanceNative != null ? item.balanceNative - item.previousBalanceNative : null;
  return (
    <li className="space-y-3 py-4" data-testid="watched-wallet">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <form className="flex flex-wrap items-center gap-2" onSubmit={(event) => { event.preventDefault(); patchWatched(chainId, item.address, { label }); setEditing(false); }}>
              <input autoFocus aria-label={`Label for ${item.address}`} value={label} onChange={(event) => setLabel(event.target.value)} maxLength={40} className="min-h-11 min-w-0 rounded-lg border border-line bg-ink px-3 text-sm text-paper" />
              <button type="submit" className="min-h-11 px-3 text-sm text-accent">Save label</button>
              <button type="button" onClick={() => setEditing(false)} className="min-h-11 px-3 text-sm text-paper-muted">Cancel</button>
            </form>
          ) : (
            <button type="button" onClick={() => onOpen(item.address)} className="min-h-11 max-w-full text-left hover:text-accent">
              <span className="block break-words text-sm font-semibold">{item.label || shortAddress(item.address)}</span>
              {item.label ? <span className="mono block text-xs text-paper-muted">{shortAddress(item.address)}</span> : null}
            </button>
          )}
          <ReadingStatus updatedAt={item.fetchedAt} loading={loading} error={lookupError} staleMs={120_000} />
        </div>
        <div className="text-right">
          <p className="mono text-sm text-paper">{amount(item.balanceNative, unit)}</p>
          {delta != null ? <p className={`mono mt-1 text-xs ${delta > 0 ? "text-up" : delta < 0 ? "text-down" : "text-paper-muted"}`} title={item.previousFetchedAt ? `Compared with ${new Date(item.previousFetchedAt).toLocaleString()}` : undefined}>{delta > 0 ? "+" : ""}{amount(delta, unit)} since last check</p> : <p className="mt-1 text-xs text-paper-muted">First reading</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" disabled={loading || retryAt != null} onClick={() => void reload()} className="min-h-11 rounded-lg border border-line px-3 text-xs text-paper-muted hover:text-paper disabled:opacity-50">{loading ? "Refreshing…" : "Refresh balance"}</button>
        <button type="button" onClick={() => { setLabel(item.label); setEditing(true); }} className="min-h-11 px-3 text-xs text-paper-muted hover:text-paper">Edit label</button>
        <button type="button" onClick={() => onRemove(item.address)} aria-label={`Stop watching ${item.label || shortAddress(item.address)}`} className="min-h-11 px-3 text-xs text-paper-muted hover:text-down">Remove</button>
        {lookupError ? <p role="status" className="text-xs text-warn">{lookupError} {retryAt ? "Automatic retry scheduled." : "Try refreshing again."}</p> : null}
      </div>
    </li>
  );
}

export function WalletWatchlist({ items, chainId, ticker, onOpen, onRemove }: {
  items: WatchedWallet[]; chainId: ChainId; ticker: string; onOpen: (address: string) => void; onRemove: (address: string) => void;
}) {
  const [sort, setSort] = useState<WatchSort>("newest");
  if (!items.length) return null;
  return (
    <section aria-labelledby="wallet-watch-heading" className="rounded-[14px] border border-line bg-ink-elevated p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 id="wallet-watch-heading" className="text-xl font-bold text-paper">Watching <span className="mono text-xs font-normal text-paper-muted">{items.length}/{WALLET_WATCH_CAP}</span></h2><p className="mt-1 text-sm text-paper-muted">Saved on this device. Balances refresh every minute while this page is visible.</p></div>
        <label className="flex items-center gap-2 text-xs text-paper-muted">Sort by<select value={sort} onChange={(event) => setSort(event.target.value as WatchSort)} className="min-h-11 rounded-lg border border-line bg-ink px-3 text-sm text-paper"><option value="newest">Newest</option><option value="label">Label</option><option value="balance">Balance</option><option value="changed">Largest change</option></select></label>
      </div>
      <ul className="mt-3 divide-y divide-line/70">{sortWatched(items, sort).map((item) => <WatchRow key={item.address} item={item} chainId={chainId} ticker={ticker} onOpen={onOpen} onRemove={onRemove} />)}</ul>
    </section>
  );
}
