"use client";

import Link from "next/link";
import { WalletWatchlist } from "@/components/wallet/WalletWatchlist";
import { ReadingStatus } from "@/components/status/ReadingStatus";
import { ShareBar } from "@/components/share/ShareBar";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useChain } from "@/lib/chains/context";
import type { ChainId } from "@/lib/chains/types";
import {
  formatCompactUsd,
  formatHash,
  formatRelativeAge,
  formatUsdSmart,
} from "@/lib/format";
import { useDashboardStore } from "@/lib/store";
import {
  looksLikeSecret,
  normalizeWalletAddress,
  walletPlaceholder,
} from "@/lib/wallet/address";
import type { WalletHolding, WalletLookup, WalletTx } from "@/lib/wallet/types";
import { activityCsv, activityStatus, filterActivity, type ActivityFilter } from "@/lib/wallet/activity";
import {
  loadWatched,
  recordWalletReading,
  subscribeWatched,
  watchStorageError,
  retryWatchSave,
  removeWatched,
  upsertWatched,
  WALLET_WATCH_CAP,
  walletAddressKey,
  type WatchedWallet,
} from "@/lib/wallet/watch";

const RECENT_KEY = "chain-dials:wallet-recent:v1";
const RECENT_CAP = 8;
const emptySubscribe = () => () => {};

function shortAddr(a: string): string {
  if (a.length <= 20) return a;
  return `${a.slice(0, 10)}…${a.slice(-8)}`;
}

function formatNative(
  n: number | null | undefined,
  unit: string,
  digits = 6,
): string {
  if (n == null || !Number.isFinite(n)) return "-";
  const abs = Math.abs(n);
  const d = abs === 0 ? 0 : abs >= 1000 ? 2 : abs >= 1 ? 4 : digits;
  return `${n.toLocaleString("en-US", {
    maximumFractionDigits: d,
    minimumFractionDigits: 0,
  })} ${unit}`;
}

function signedClass(n: number | null): string {
  if (n == null || n === 0) return "text-paper";
  return n > 0 ? "text-up" : "text-down";
}

function signedNative(n: number | null, unit: string): string {
  if (n == null || !Number.isFinite(n)) return "-";
  const sign = n > 0 ? "+" : "";
  return `${sign}${formatNative(n, unit)}`;
}

function loadRecent(chainId: string): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const list = parsed[chainId];
    if (!Array.isArray(list)) return [];
    return list.filter((x): x is string => typeof x === "string").slice(0, RECENT_CAP);
  } catch {
    return [];
  }
}

function saveRecent(chainId: string, address: string) {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const prev = Array.isArray(parsed[chainId])
      ? (parsed[chainId] as unknown[]).filter(
          (x): x is string => typeof x === "string",
        )
      : [];
    const next = [address, ...prev.filter((a) => a !== address)].slice(
      0,
      RECENT_CAP,
    );
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify({ ...parsed, [chainId]: next }),
    );
  } catch {
    // ignore
  }
}

function failCopy(reason: WalletLookup["reason"]): string {
  switch (reason) {
    case "empty":
      return "Paste an address first.";
    case "secret":
      return "That looks like a seed or private key. Never paste those. We did not send it anywhere.";
    case "shape":
      return "That does not look like an address for this chain.";
    case "upstream":
      return "The explorer feed missed this one. Try again, or open the public explorer.";
    default:
      return "Lookup failed.";
  }
}

function blankLookup(
  chain: { id: ChainId; ticker: string },
  query: string,
  patch: Partial<WalletLookup>,
): WalletLookup {
  return {
    fetchedAt: Date.now(),
    chainId: chain.id,
    query,
    normalized: null,
    valid: false,
    source: "",
    explorers: [],
    unit: chain.ticker,
    balanceNative: null,
    pendingNative: null,
    receivedNative: null,
    sentNative: null,
    txCount: null,
    note: null,
    tag: null,
    txs: [],
    holdings: [],
    perp: null,
    ...patch,
  };
}

function formatHolding(h: WalletHolding): string {
  const digits = Math.abs(h.amount) >= 1000 ? 2 : Math.abs(h.amount) >= 1 ? 4 : 6;
  const amt = h.amount.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
  return h.usd != null
    ? `${h.symbol} ${amt} · ${formatUsdSmart(h.usd)}`
    : `${h.symbol} ${amt}`;
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string | null;
}) {
  return (
    <div className="rounded-[10px] border border-line bg-ink px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-paper-muted">
        {label}
      </div>
      <div className="mono mt-1 truncate text-lg text-paper">{value}</div>
      {note ? <div className="mt-1 text-[11px] text-paper-muted">{note}</div> : null}
    </div>
  );
}

function txHref(
  chainId: string,
  tx: WalletTx,
  explorerTx: (id: string) => string,
): string | null {
  if (!tx.id || tx.id === "0x0" || tx.id.includes(" ")) return null;
  if (chainId === "hype" && tx.kind === "fill") {
    return `https://app.hyperliquid.xyz/explorer/tx/${tx.id}`;
  }
  return explorerTx(tx.id);
}

function ActivityRow({
  tx,
  unit,
  chainId,
  explorerTx,
}: {
  tx: WalletTx;
  unit: string;
  chainId: string;
  explorerTx: (id: string) => string;
}) {
  const href = txHref(chainId, tx, explorerTx);
  return (
    <tr className="border-t border-line/70">
      <td className="py-2 pr-3">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="mono text-xs text-accent hover:underline"
          >
            {formatHash(tx.id)}
          </a>
        ) : (
          <span className="mono text-xs text-paper">{formatHash(tx.id)}</span>
        )}
        {tx.label ? (
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-paper-muted">
            {tx.label}
          </div>
        ) : null}
      </td>
      <td className="py-2 pr-3 text-xs text-paper-muted">
        {tx.at ? formatRelativeAge(tx.at) : "—"}
      </td>
      <td className="py-2 pr-3 text-xs text-paper-muted">
        {activityStatus(tx, chainId)}
      </td>
      <td className={`mono py-2 pr-3 text-xs ${signedClass(tx.valueNative)}`}>
        {tx.kind === "fill" && tx.valueNative != null
          ? formatCompactUsd(tx.valueNative)
          : signedNative(tx.valueNative, unit)}
      </td>
      <td className="hidden py-2 text-xs text-paper-muted sm:table-cell">
        {tx.counterparty ? shortAddr(tx.counterparty) : "—"}
      </td>
    </tr>
  );
}

export function WalletExplorer() {
  const chain = useChain();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const priceUsd = useDashboardStore((s) => s.live.priceUsd);
  const fromUrl = params.get("a") ?? "";
  const [draft, setDraft] = useState(fromUrl);
  const [draftSource, setDraftSource] = useState(fromUrl);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WalletLookup | null>(null);
  const [copied, setCopied] = useState<"addr" | "link" | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [watched, setWatched] = useState<WatchedWallet[]>([]);
  const watchSaveError = useSyncExternalStore(subscribeWatched, watchStorageError, () => null);
  const [labelDraft, setLabelDraft] = useState("");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [activityQuery, setActivityQuery] = useState("");
  const activeLookup = useRef<AbortController | null>(null);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (fromUrl !== draftSource) {
    setDraftSource(fromUrl);
    setDraft(fromUrl);
  }

  useEffect(() => {
    if (!mounted) return;
    const sync = () => setWatched(loadWatched(chain.id));
    const t = window.setTimeout(() => {
      setRecent(loadRecent(chain.id));
      sync();
    }, 0);
    const unsubscribe = subscribeWatched(sync);
    return () => {
      unsubscribe();
      window.clearTimeout(t);
    };
  }, [mounted, chain.id]);

  const fetchLookup = useCallback(
    async (raw: string) => {
      activeLookup.current?.abort();
      const controller = new AbortController();
      activeLookup.current = controller;
      const parsed = normalizeWalletAddress(chain.id, raw);
      if (!parsed.ok) {
        setResult(blankLookup(chain, raw, { reason: parsed.reason }));
        setBusy(false);
        return;
      }
      setBusy(true);
      setResult(null);
      setActivityFilter("all");
      setActivityQuery("");
      try {
        const res = await fetch(
          `/api/suite/wallet/${chain.id}?address=${encodeURIComponent(parsed.address)}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (res.status === 429) {
          setResult(
            blankLookup(chain, raw, {
              normalized: parsed.address,
              valid: false,
              reason: "upstream",
              error: "Too many lookups. Give it a minute.",
            }),
          );
          return;
        }
        if (!res.ok) throw new Error("Lookup failed");
        const data = (await res.json()) as WalletLookup;
        if (controller.signal.aborted) return;
        setResult(data);
        if (data.valid && data.normalized && data.reason !== "upstream") {
          saveRecent(chain.id, data.normalized);
          setRecent(loadRecent(chain.id));
          if (
            loadWatched(chain.id).some(
              (w) => walletAddressKey(chain.id, w.address) === walletAddressKey(chain.id, data.normalized!),
            )
          ) {
            setWatched(
              recordWalletReading(chain.id, data.normalized, {
                balanceNative: data.balanceNative,
                unit: data.unit,
                fetchedAt: data.fetchedAt,
              }),
            );
          }
        }
      } catch {
        if (controller.signal.aborted) return;
        setResult(
          blankLookup(chain, raw, {
            normalized: parsed.address,
            valid: false,
            reason: "upstream",
            error: "Network error",
          }),
        );
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    },
    [chain],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (fromUrl.trim()) void fetchLookup(fromUrl);
      else {
        setResult(null);
        setBusy(false);
      }
    }, 0);
    return () => {
      window.clearTimeout(t);
      activeLookup.current?.abort();
    };
  }, [fromUrl, chain.id, fetchLookup]);

  const commit = (raw: string) => {
    activeLookup.current?.abort();
    setBusy(false);
    setResult(null);
    const trimmed = raw.trim();
    if (looksLikeSecret(trimmed)) {
      void fetchLookup(trimmed);
      return;
    }
    const parsed = normalizeWalletAddress(chain.id, trimmed);
    const nextVal = parsed.ok ? parsed.address : trimmed;
    if (!trimmed) {
      router.replace(pathname, { scroll: false });
      setResult(null);
      return;
    }
    if (fromUrl === nextVal || fromUrl === trimmed) {
      void fetchLookup(trimmed);
      return;
    }
    const next = new URLSearchParams();
    next.set("a", nextVal);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const usd =
    result?.balanceNative != null && priceUsd != null
      ? result.balanceNative * priceUsd
      : null;

  const blurb = useMemo(() => {
    switch (chain.id) {
      case "btc":
        return "Paste a Bitcoin address. Live balance and recent txs from mempool.space. A reading, not a wallet.";
      case "eth":
        return "Paste an Ethereum address. Native ETH, top ERC-20s when the public explorer answers, and recent txs.";
      case "sol":
        return "Paste a Solana account. Native SOL, the largest token accounts this RPC lists, and recent signatures.";
      case "hype":
        return "Paste a 0x user. HyperEVM gas plus the HyperCore perp account, if there is one.";
    }
  }, [chain.id]);

  const copy = async (kind: "addr" | "link", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      // ignore
    }
  };

  const watchCurrent = () => {
    if (!result?.normalized || watched.length >= WALLET_WATCH_CAP) return;
    setWatched(
      upsertWatched(chain.id, {
        address: result.normalized,
        label: labelDraft.trim(),
        addedAt: Date.now(),
        balanceNative: result.balanceNative,
        unit: result.unit,
        fetchedAt: result.fetchedAt,
      }),
    );
    setLabelDraft("");
  };

  const unwatch = (address: string) => {
    setWatched(removeWatched(chain.id, address));
  };

  const watching =
    !!result?.normalized &&
    watched.some(
      (w) => walletAddressKey(chain.id, w.address) === walletAddressKey(chain.id, result.normalized!),
    );

  const visibleActivity = filterActivity(result?.txs ?? [], activityFilter, activityQuery);
  const exportActivity = () => {
    if (!result || !visibleActivity.length) return;
    const url = URL.createObjectURL(new Blob(["\uFEFF", activityCsv(visibleActivity, chain.id, result.unit)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${chain.id}-recent-activity.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!mounted) {
    return <p className="text-paper-muted">Loading wallet explorer…</p>;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-accent">
            {chain.name} · public chain data
          </p>
          <h1 className="text-3xl font-extrabold text-paper md:text-4xl">
            Wallet explorer
          </h1>
          <p className="max-w-2xl text-paper-muted">{blurb}</p>
          <p className="text-xs text-paper-muted">
            Never paste a seed phrase or private key. We only fetch what’s already
            public.
          </p>
        </div>
        <ShareBar
          target={{
            kind: "wallet",
            chainId: chain.id,
            address: result?.normalized ?? (fromUrl.trim() || null),
            reading:
              result?.valid && result.balanceNative != null
                ? formatNative(result.balanceNative, result.unit, 4)
                : null,
          }}
        />
      </header>

      {watchSaveError ? <div role="status" className="rounded-xl border border-warn/40 p-4 text-sm text-warn">{watchSaveError}<button type="button" onClick={retryWatchSave} className="ml-2 min-h-11 underline">Retry saving</button></div> : null}
      <WalletWatchlist items={watched} chainId={chain.id} ticker={chain.ticker} onOpen={(address) => { setDraft(address); commit(address); }} onRemove={unwatch} />

      <section className="rounded-[14px] border border-line bg-ink-elevated p-5 md:p-6">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            commit(draft);
          }}
        >
          <label className="sr-only" htmlFor="wallet-address">
            {chain.name} address
          </label>
          <input
            id="wallet-address"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={walletPlaceholder(chain.id)}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            className="mono min-h-11 flex-1 rounded-[10px] border border-line bg-ink px-3 text-sm text-paper outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy}
            className="btn-cta min-h-11 rounded-[10px] px-4 text-sm disabled:opacity-60"
          >
            {busy ? "Looking…" : "Look up"}
          </button>
        </form>

        {recent.length > 0 ? (
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-wider text-paper-muted">
              Recent on this device
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {recent.map((a) => (
                <li key={a}>
                  <button
                    type="button"
                    className="mono rounded-full border border-line px-2.5 py-1 text-[11px] text-paper-muted hover:border-accent hover:text-paper"
                    onClick={() => {
                      setDraft(a);
                      commit(a);
                    }}
                  >
                    {shortAddr(a)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {result ? (
          <div className="mt-6 space-y-5">
            <ReadingStatus updatedAt={result.valid && result.reason !== "upstream" ? result.fetchedAt : null} error={result.error ?? null} />
            {!result.valid || result.reason === "secret" || result.reason === "shape" || result.reason === "empty" ? (
              <p
                className={
                  result.reason === "secret" ? "text-warn" : "text-down"
                }
              >
                {result.error ?? failCopy(result.reason)}
              </p>
            ) : (
              <>
                {result.reason === "upstream" ? (
                  <p className="text-down">
                    {result.error ?? failCopy("upstream")}
                  </p>
                ) : null}

                {result.tag ? (
                  <p className="rounded-[10px] border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
                    {result.tag.label}.{" "}
                    <Link href={result.tag.href} className="text-accent hover:underline">
                      Open Trace
                    </Link>
                  </p>
                ) : null}

                {result.normalized ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="mono break-all text-sm text-paper">
                      {result.normalized}
                    </p>
                    <button
                      type="button"
                      className="text-[11px] uppercase tracking-wider text-paper-muted hover:text-accent"
                      onClick={() => void copy("addr", result.normalized!)}
                    >
                      {copied === "addr" ? "Copied" : "Copy"}
                    </button>
                    <button
                      type="button"
                      className="text-[11px] uppercase tracking-wider text-paper-muted hover:text-accent"
                      onClick={() =>
                        void copy(
                          "link",
                          `${window.location.origin}${pathname}?a=${encodeURIComponent(result.normalized!)}`,
                        )
                      }
                    >
                      {copied === "link" ? "Link copied" : "Copy link"}
                    </button>
                    {watching ? (
                      <button
                        type="button"
                        className="text-[11px] uppercase tracking-wider text-paper-muted hover:text-down"
                        onClick={() => unwatch(result.normalized!)}
                      >
                        Unwatch
                      </button>
                    ) : (
                      <span className="flex flex-wrap items-center gap-2">
                        <input
                          value={labelDraft}
                          onChange={(e) => setLabelDraft(e.target.value)}
                          placeholder="label"
                          aria-label="Watch label"
                          maxLength={40}
                          className="h-8 w-28 rounded-[8px] border border-line bg-ink px-2 text-xs text-paper outline-none focus:border-accent"
                        />
                        <button
                          type="button"
                          className="text-[11px] uppercase tracking-wider text-accent hover:underline"
                          disabled={watched.length >= WALLET_WATCH_CAP}
                          title={watched.length >= WALLET_WATCH_CAP ? "Remove a watched address to make room." : undefined}
                          onClick={watchCurrent}
                        >
                          {watched.length >= WALLET_WATCH_CAP ? "Watchlist full" : "Watch"}
                        </button>
                      </span>
                    )}
                  </div>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-3">
                  <Stat
                    label={
                      chain.id === "hype" ? "HyperEVM HYPE" : "Balance"
                    }
                    value={formatNative(result.balanceNative, result.unit)}
                    note={usd != null ? formatUsdSmart(usd) : null}
                  />
                  {result.receivedNative != null || result.sentNative != null ? (
                    <Stat
                      label="Received / sent"
                      value={formatNative(result.receivedNative, result.unit, 4)}
                      note={`Sent ${formatNative(result.sentNative, result.unit, 4)}`}
                    />
                  ) : (
                    <Stat
                      label={
                        chain.id === "eth" || chain.id === "hype"
                          ? "Nonce"
                          : "Tx count"
                      }
                      value={
                        result.txCount != null
                          ? result.txCount.toLocaleString()
                          : "-"
                      }
                      note={
                        result.pendingNative
                          ? `Mempool ${formatNative(result.pendingNative, result.unit)}`
                          : result.source
                            ? result.source
                            : null
                      }
                    />
                  )}
                  <Stat
                    label="Explorers"
                    value={
                      result.explorers.length > 1
                        ? `${result.explorers[0]?.label} +${result.explorers.length - 1}`
                        : (result.explorers[0]?.label ?? chain.explorerName)
                    }
                    note="Opens in a new tab"
                  />
                </div>

                {result.receivedNative != null && result.txCount != null ? (
                  <p className="text-xs text-paper-muted">
                    {result.txCount.toLocaleString()} txs
                    {result.pendingNative
                      ? ` · mempool ${formatNative(result.pendingNative, result.unit)}`
                      : ""}
                    {result.source ? ` · ${result.source}` : ""}
                  </p>
                ) : null}

                {result.explorers.length > 0 ? (
                  <p className="flex flex-wrap gap-3 text-sm">
                    {result.explorers.map((ex) => (
                      <a
                        key={ex.url}
                        href={ex.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:underline"
                      >
                        Open on {ex.label} →
                      </a>
                    ))}
                  </p>
                ) : null}

                {result.note ? (
                  <p className="text-xs text-paper-muted">{result.note}</p>
                ) : null}

                {result.holdings.length > 0 ? (
                  <div>
                    <h2 className="text-sm font-bold text-paper">Tokens</h2>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {result.holdings.map((h) => (
                        <li
                          key={`${h.symbol}-${h.amount}`}
                          className="rounded-full border border-line px-2.5 py-1 text-xs text-paper-muted"
                        >
                          {formatHolding(h)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {result.perp ? (
                  <div className="rounded-[12px] border border-line bg-ink p-4">
                    <h2 className="text-sm font-bold text-paper">
                      HyperCore account
                    </h2>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <Stat
                        label="Account value"
                        value={formatUsdSmart(result.perp.accountValueUsd)}
                      />
                      <Stat
                        label="Withdrawable"
                        value={formatUsdSmart(result.perp.withdrawableUsd)}
                      />
                      <Stat
                        label="Notional"
                        value={formatUsdSmart(result.perp.totalNtlPos)}
                      />
                    </div>
                    {result.perp.positions.length > 0 ? (
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="text-[10px] uppercase tracking-wider text-paper-muted">
                              <th className="pb-2 font-medium">Coin</th>
                              <th className="pb-2 font-medium">Size</th>
                              <th className="pb-2 font-medium">Entry</th>
                              <th className="pb-2 font-medium">uPnL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.perp.positions.map((p) => (
                              <tr key={p.coin} className="border-t border-line/70">
                                <td className="py-2 pr-3 font-semibold">{p.coin}</td>
                                <td className={`mono py-2 pr-3 ${signedClass(p.size)}`}>
                                  {p.size}
                                </td>
                                <td className="mono py-2 pr-3 text-paper-muted">
                                  {p.entryPx != null ? formatUsdSmart(p.entryPx) : "—"}
                                </td>
                                <td
                                  className={`mono py-2 ${signedClass(p.unrealizedPnl)}`}
                                >
                                  {formatUsdSmart(p.unrealizedPnl)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-paper-muted">
                        No open perp positions.
                      </p>
                    )}
                    {result.perp.spot.length > 0 && result.holdings.length === 0 ? (
                      <ul className="mt-3 flex flex-wrap gap-2 text-xs text-paper-muted">
                        {result.perp.spot.map((s) => (
                          <li
                            key={s.coin}
                            className="rounded-full border border-line px-2.5 py-1"
                          >
                            {s.coin} {s.total}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <h2 className="text-sm font-bold text-paper">
                    {chain.id === "hype" ? "Recent fills" : "Recent activity"}
                  </h2>
                  {result.txs.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          aria-label="Search recent activity"
                          placeholder="Search ID, counterparty or label"
                          value={activityQuery}
                          onChange={(e) => setActivityQuery(e.target.value)}
                          className="min-h-11 min-w-0 flex-1 rounded-[8px] border border-line bg-ink px-3 text-sm text-paper focus:border-accent"
                        />
                        <select aria-label="Filter activity" value={activityFilter} onChange={(e) => setActivityFilter(e.target.value as ActivityFilter)} className="min-h-11 rounded-[8px] border border-line bg-ink px-3 text-sm text-paper">
                          <option value="all">All activity</option>
                          {chain.id !== "hype" ? <option value="incoming">Incoming</option> : null}
                          {chain.id !== "hype" ? <option value="outgoing">Outgoing</option> : null}
                          {chain.id === "btc" ? <option value="pending">Pending</option> : null}
                        </select>
                        <button type="button" disabled={!visibleActivity.length} onClick={exportActivity} className="min-h-11 rounded-[8px] border border-line px-3 text-sm text-accent disabled:opacity-40">Export CSV</button>
                      </div>
                      <p role="status" className="text-xs text-paper-muted">{visibleActivity.length} of {result.txs.length} loaded entries · Export includes filtered results only. Public explorers provide full history.</p>
                    </div>
                  ) : null}
                  {result.txs.length === 0 ? (
                    <p className="mt-2 text-sm text-paper-muted">
                      Nothing recent to show here. The public explorer still has
                      the full history.
                    </p>
                  ) : visibleActivity.length === 0 ? (
                    <p className="mt-3 text-sm text-paper-muted">No activity matches these filters.</p>
                  ) : (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-wider text-paper-muted">
                            <th className="pb-2 font-medium">Id</th>
                            <th className="pb-2 font-medium">When</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 font-medium">
                              {chain.id === "hype" ? "Notional" : "Amount"}
                            </th>
                            <th className="hidden pb-2 font-medium sm:table-cell">
                              {chain.id === "hype" ? "Coin" : "Counterparty"}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleActivity.map((tx, i) => (
                            <ActivityRow
                              key={`${tx.id}-${tx.at ?? i}-${i}`}
                              tx={tx}
                              unit={result.unit}
                              chainId={chain.id}
                              explorerTx={chain.explorerTx}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
