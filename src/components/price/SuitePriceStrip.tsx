"use client";
import Link from "next/link";
import { Sparkline } from "@/components/metrics/Sparkline";
import { CHAIN_ORDER, CHAINS } from "@/lib/chains/registry";
import type { ChainId } from "@/lib/chains/types";
import { formatPercent, formatUsdSmart } from "@/lib/format";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { ReadingStatus } from "@/components/status/ReadingStatus";

function PriceCard({ id }: { id: ChainId }) {
  const { data, loading, error } = usePriceHistory(id, "7D");
  const s = {
    close: data?.stats?.close ?? data?.points.at(-1)?.price ?? null,
    changePct: data?.stats?.changePct ?? null,
    spark: (data?.points ?? []).map((point) => ({ t: point.t, v: point.price })),
  };
          const c = CHAINS[id];
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
                    {formatPercent(s.changePct)}
                  </span>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="mono text-xl font-medium text-paper group-hover:text-accent">
                      {formatUsdSmart(s.close)}
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
                <ReadingStatus updatedAt={data?.updatedAt ?? null} loading={loading} error={error} staleMs={360_000} />
              </Link>
            </li>
          );
}

export function SuitePriceStrip() {
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
        {CHAIN_ORDER.map((id) => <PriceCard key={id} id={id} />)}
      </ul>
    </section>
  );
}
