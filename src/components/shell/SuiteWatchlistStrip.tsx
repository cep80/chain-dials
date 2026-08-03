"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CHAIN_ORDER, CHAINS, freshnessLabel } from "@/lib/chains/registry";
import type { ChainId } from "@/lib/chains/types";
import {
  formatFee,
  formatInteger,
  formatPercent,
  formatUsdSmart,
} from "@/lib/format";
import type { PriceHistoryPayload } from "@/lib/price/types";

interface Row {
  price: number | null;
  changePct: number | null;
  height: number | null;
  fee: number | null;
}

const empty: Row = {
  price: null,
  changePct: null,
  height: null,
  fee: null,
};

/** Cross-chain glance strip: price Δ, tip height, fee. */
export function SuiteWatchlistStrip() {
  const [rows, setRows] = useState<Record<ChainId, Row>>({
    btc: { ...empty },
    eth: { ...empty },
    sol: { ...empty },
    hype: { ...empty },
  });

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    async function load(id: ChainId) {
      try {
        const [histRes, tipRes, snapRes] = await Promise.all([
          fetch(`/api/suite/price-history?chain=${id}&range=24H`, {
            cache: "no-store",
            signal: ac.signal,
          }),
          fetch(`/api/suite/tip/${id}`, {
            cache: "no-store",
            signal: ac.signal,
          }),
          id === "btc"
            ? Promise.resolve(null)
            : fetch(`/api/suite/snapshot/${id}`, {
                cache: "no-store",
                signal: ac.signal,
              }),
        ]);

        let price: number | null = null;
        let changePct: number | null = null;
        if (histRes.ok) {
          const hist = (await histRes.json()) as PriceHistoryPayload;
          price = hist.stats?.close ?? null;
          changePct = hist.stats?.changePct ?? null;
        }

        let height: number | null = null;
        if (tipRes.ok) {
          const tip = (await tipRes.json()) as { height?: number | null };
          height = tip.height ?? null;
        }

        let fee: number | null = null;
        if (id === "btc") {
          try {
            const fees = await fetch("/api/mempool/v1/fees/recommended", {
              cache: "no-store",
              signal: ac.signal,
            });
            if (fees.ok) {
              const body = (await fees.json()) as { fastestFee?: number };
              fee = body.fastestFee ?? null;
            }
          } catch {
            // optional
          }
        } else if (snapRes && "ok" in snapRes && snapRes.ok) {
          const snap = (await snapRes.json()) as { feeFastest?: number | null };
          fee = snap.feeFastest ?? null;
        }

        if (cancelled) return;
        setRows((prev) => ({
          ...prev,
          [id]: { price, changePct, height, fee },
        }));
      } catch {
        // leave empty
      }
    }

    void (async () => {
      for (const id of CHAIN_ORDER) {
        if (cancelled) return;
        await load(id);
        await new Promise((r) => setTimeout(r, 80));
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  return (
    <section aria-label="Cross-chain watchlist" className="mb-8">
      <div className="mb-3">
        <h2 className="text-lg font-bold text-paper">Watchlist</h2>
        <p className="text-sm text-paper-muted">
          Price (24h), tip height, and fee across boards.
        </p>
      </div>
      <div className="overflow-x-auto rounded-[14px] border border-line">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-line bg-ink-elevated/80 text-[10px] uppercase tracking-[0.14em] text-paper-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Chain</th>
              <th className="px-4 py-2.5 font-medium">Price</th>
              <th className="px-4 py-2.5 font-medium">24h</th>
              <th className="px-4 py-2.5 font-medium">Tip</th>
              <th className="px-4 py-2.5 font-medium">Fee</th>
              <th className="px-4 py-2.5 font-medium">Feed</th>
            </tr>
          </thead>
          <tbody>
            {CHAIN_ORDER.map((id) => {
              const c = CHAINS[id];
              const r = rows[id];
              const up =
                r.changePct == null
                  ? null
                  : r.changePct === 0
                    ? null
                    : r.changePct > 0;
              return (
                <tr
                  key={id}
                  className="border-b border-line/70 last:border-0 hover:bg-ink-soft/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/${c.slug}`}
                      className="font-semibold text-paper hover:text-accent"
                    >
                      {c.shortName}
                    </Link>
                  </td>
                  <td className="mono px-4 py-3 text-paper">
                    {formatUsdSmart(r.price)}
                  </td>
                  <td
                    className="mono px-4 py-3"
                    style={{
                      color:
                        up == null
                          ? "var(--paper-muted)"
                          : up
                            ? "var(--up)"
                            : "var(--down)",
                    }}
                  >
                    {formatPercent(r.changePct)}
                  </td>
                  <td className="mono px-4 py-3 text-paper-muted">
                    {r.height != null ? formatInteger(r.height) : "—"}
                  </td>
                  <td className="mono px-4 py-3 text-paper-muted">
                    {formatFee(r.fee, c.feeUnit)}
                  </td>
                  <td className="px-4 py-3 text-[10px] uppercase tracking-wider text-paper-muted">
                    {freshnessLabel(c)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
