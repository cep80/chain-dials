"use client";

import { useJsonResource } from "@/hooks/useJsonResource";
import { ReadingStatus } from "@/components/status/ReadingStatus";
import Link from "next/link";
import { ForensicsCaseTabs } from "@/components/forensics/ForensicsCaseTabs";
import { formatBtc, formatCompactUsd, formatRelativeAge } from "@/lib/format";
import { CHAINS } from "@/lib/chains/registry";
import {
  LIQUID_FORWARDED_SATS,
  LIQUID_RETURNED_SATS,
  liquidTimeline,
} from "@/lib/forensics/liquid";
import type { WatchResponse } from "@/lib/forensics/types";

function satsToBtc(sats: number): number {
  return sats / 100_000_000;
}

function shortAddr(a: string): string {
  if (a.length <= 20) return a;
  return `${a.slice(0, 10)}…${a.slice(-8)}`;
}

export function LiquidForensics() {
  const { data: watch, error: watchError, loading, reload: refresh, retryAt } = useJsonResource<WatchResponse>("/api/forensics/watch?case=liquid", { staleMs: 60_000, pollMs: 60_000 });

  const price = watch?.priceUsd ?? null;
  const actor = watch?.watched.find((row) => row.role === "actor");
  const peg = watch?.watched.find((row) => row.role === "federation-peg");
  const outstanding = actor?.live ? satsToBtc(actor.live.balanceSats) : null;
  const pegBtc = peg?.live ? satsToBtc(peg.live.balanceSats) : null;

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-accent">
          Bitcoin only · public chain data
        </p>
        <ForensicsCaseTabs active="liquid" />
        <h1 className="text-3xl font-extrabold text-paper md:text-4xl">
          Liquid peg drain
        </h1>
        <p className="max-w-3xl text-paper-muted">
          6 September 2026: an Elements range-proof cache bug minted about 4,000
          unbacked L-BTC. SideSwap pegged it out as a normal withdrawal. About
          3,996 BTC left the federation wallet. 3,400 BTC came back the next
          day. About 598.5 BTC is still with the actor. Bitcoin main chain was
          not affected. Keys were not stolen. The remainder is outstanding, not
          a confirmed bounty.
        </p>
      </header>

      <ReadingStatus updatedAt={watch?.fetchedAt ?? null} loading={loading} error={watchError} staleMs={120_000} />
      <section className="rounded-[14px] border border-line bg-ink-elevated p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-paper">Cluster</h2>
            <p className="mt-1 text-sm text-paper-muted">
              Balances refresh every minute while this page is visible.
              {watch
                ? ` Last ${formatRelativeAge(watch.fetchedAt)}.`
                : ""}
            </p>
          </div>
          <button
            type="button"
            disabled={loading || retryAt != null}
            onClick={() => {
              void refresh();
            }}
            className="rounded-[10px] border border-line px-3 py-2 text-xs text-paper-muted hover:text-paper"
          >
            Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Outstanding"
            value={
              outstanding == null
                ? "…"
                : `${formatBtc(outstanding, 2)}${price != null ? ` · ${formatCompactUsd(outstanding * price)}` : ""}`
            }
          />
          <Stat
            label="Peg reserve"
            value={
              pegBtc == null
                ? "…"
                : `${formatBtc(pegBtc, 2)}${price != null ? ` · ${formatCompactUsd(pegBtc * price)}` : ""}`
            }
          />
          <Stat
            label="Returned 7 Sep"
            value={formatBtc(satsToBtc(LIQUID_RETURNED_SATS), 2)}
          />
        </div>

        {watchError ? (
          <p className="mt-4 text-sm text-down">{watchError}</p>
        ) : null}

        <ul className="mt-5 space-y-3">
          {loading && !watch ? (
            <li className="text-sm text-paper-muted">Loading live balances…</li>
          ) : null}
          {watch?.watched.map((row) => {
            const bal = row.live ? satsToBtc(row.live.balanceSats) : null;
            return (
              <li
                key={row.address}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/70 pb-3"
              >
                <div>
                  <a
                    href={CHAINS.btc.explorerAddress(row.address)}
                    target="_blank"
                    rel="noreferrer"
                    className="mono text-xs text-paper hover:text-accent"
                  >
                    {shortAddr(row.address)}
                  </a>
                  <div className="text-[11px] text-paper-muted">
                    {row.label}
                  </div>
                </div>
                <div className="text-right">
                  <div className="mono text-xs text-paper">
                    {bal == null ? "…" : formatBtc(bal, 4)}
                  </div>
                  {row.moved ? (
                    <div className="text-[11px] font-semibold text-warn">
                      moved
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-paper-muted">
          Curated cash-out {formatBtc(satsToBtc(LIQUID_FORWARDED_SATS), 2)}.{" "}
          <Link href="/btc/wallet" className="text-accent hover:underline">
            Wallet lookup
          </Link>{" "}
          tags these addresses. Hop tracing still lives on the Coldcard board
          and will label this cluster.
        </p>
      </section>

      <section className="rounded-[14px] border border-line bg-ink-elevated p-5 md:p-6">
        <h2 className="text-xl font-bold text-paper">Timeline</h2>
        <ol className="mt-4 space-y-4">
          {liquidTimeline.map((event) => (
            <li key={`${event.at}-${event.title}`} className="text-sm">
              <p className="text-[11px] uppercase tracking-[0.16em] text-paper-muted">
                {new Date(event.at).toUTCString()}
              </p>
              <p className="mt-1 font-semibold text-paper">{event.title}</p>
              <p className="mt-1 text-paper-muted">{event.detail}</p>
              {event.href ? (
                <a
                  href={event.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs text-accent hover:underline"
                >
                  Open record
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-line bg-ink px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-paper-muted">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-paper">{value}</div>
    </div>
  );
}
