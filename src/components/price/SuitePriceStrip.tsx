"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkline } from "@/components/metrics/Sparkline";
import { CHAIN_ORDER, CHAINS } from "@/lib/chains/registry";
import type { ChainId } from "@/lib/chains/types";
import { formatPercent, formatUsdSmart } from "@/lib/format";
import type { PriceHistoryPayload } from "@/lib/price/types";
import type { HistoryPoint } from "@/types/metrics";

interface CardState {
  loading: boolean;
  error: string | null;
  close: number | null;
  changePct: number | null;
  spark: HistoryPoint[];
}

const empty: CardState = {
  loading: true,
  error: null,
  close: null,
  changePct: null,
  spark: [],
};

export function SuitePriceStrip() {
  const [byChain, setByChain] = useState<Record<ChainId, CardState>>({
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
        const res = await fetch(
          `/api/suite/price-history?chain=${id}&range=7D`,
          { cache: "no-store", signal: ac.signal },
        );
        const body = (await res.json()) as PriceHistoryPayload & {
          error?: string;
        };
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        if (cancelled) return;
        const pts = body.points ?? [];
        const spark: HistoryPoint[] = pts.map((p) => ({ t: p.t, v: p.price }));
        setByChain((prev) => ({
          ...prev,
          [id]: {
            loading: false,
            error: null,
            close: body.stats?.close ?? pts[pts.length - 1]?.price ?? null,
            changePct: body.stats?.changePct ?? null,
            spark,
          },
        }));
      } catch (e) {
        if (cancelled || ac.signal.aborted) return;
        setByChain((prev) => ({
          ...prev,
          [id]: {
            ...empty,
            loading: false,
            error: e instanceof Error ? e.message : "failed",
          },
        }));
      }
    }

    // Stagger chain requests so free APIs are less likely to 429
    void (async () => {
      for (const id of CHAIN_ORDER) {
        if (cancelled) return;
        await load(id);
        await new Promise((r) => setTimeout(r, 120));
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  return (
    <section aria-label="Seven day price paths" className="mb-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-paper">Seven-day prices</h2>
          <p className="text-sm text-paper-muted">
            Open a board for full history, ranges, and candles.
          </p>
        </div>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {CHAIN_ORDER.map((id) => {
          const c = CHAINS[id];
          const s = byChain[id];
          const up =
            s.changePct == null
              ? null
              : s.changePct === 0
                ? null
                : s.changePct > 0;
          return (
            <li key={id}>
              <Link
                href={`/${c.slug}`}
                className="group flex flex-col gap-3 rounded-[14px] border border-line bg-ink-elevated/70 p-4 transition hover:border-accent/50"
                style={{ boxShadow: `inset 0 0 0 1px ${c.accent}18` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink"
                    style={{ background: c.accent }}
                  >
                    {c.shortName}
                  </span>
                  <span
                    className="mono text-xs"
                    style={{
                      color:
                        up == null
                          ? "var(--paper-muted)"
                          : up
                            ? "var(--up)"
                            : "var(--down)",
                    }}
                  >
                    {s.loading ? "…" : formatPercent(s.changePct)}
                  </span>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="mono text-xl font-medium text-paper group-hover:text-accent">
                      {s.loading ? "-" : formatUsdSmart(s.close)}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-paper-muted">
                      7D USD
                    </div>
                  </div>
                  <div
                    className="text-paper"
                    style={{
                      color:
                        up == null
                          ? c.accent
                          : up
                            ? "var(--up)"
                            : "var(--down)",
                    }}
                  >
                    <Sparkline
                      points={s.spark}
                      width={96}
                      height={36}
                      positive={up}
                    />
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
