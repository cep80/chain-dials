"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CHAIN_ORDER, CHAINS, freshnessLabel } from "@/lib/chains/registry";
import type { ChainId } from "@/lib/chains/types";
import { formatDuration, formatFee, formatRelativeAge } from "@/lib/format";

interface TipRow {
  height: number | null;
  timestamp: number | null;
  source: string;
  feeFastest: number | null;
  fetchedAt: number;
}

type TipMap = Partial<Record<ChainId, TipRow>>;

export function SuitePulseStrip() {
  const [tips, setTips] = useState<TipMap>({});
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const next: TipMap = {};
      await Promise.all(
        CHAIN_ORDER.map(async (id) => {
          try {
            const [tipRes, snapRes] =
              id === "btc"
                ? [
                    await fetch(`/api/suite/tip/${id}`, { cache: "no-store" }),
                    null as Response | null,
                  ]
                : await Promise.all([
                    fetch(`/api/suite/tip/${id}`, { cache: "no-store" }),
                    fetch(`/api/suite/snapshot/${id}`, { cache: "no-store" }),
                  ]);
            if (!tipRes.ok) return;
            const tip = (await tipRes.json()) as {
              height: number | null;
              timestamp: number | null;
              source: string;
            };
            let feeFastest: number | null = null;
            if (snapRes?.ok) {
              const snap = (await snapRes.json()) as {
                feeFastest?: number | null;
              };
              feeFastest = snap.feeFastest ?? null;
            } else if (id === "btc") {
              try {
                const fees = await fetch("/api/mempool/v1/fees/recommended", {
                  cache: "no-store",
                });
                if (fees.ok) {
                  const body = (await fees.json()) as { fastestFee?: number };
                  feeFastest = body.fastestFee ?? null;
                }
              } catch {
                // optional
              }
            }
            next[id] = {
              height: tip.height,
              timestamp: tip.timestamp,
              source: tip.source,
              feeFastest,
              fetchedAt: Date.now(),
            };
          } catch {
            // skip chain
          }
        }),
      );
      if (!cancelled) setTips(next);
    };
    void load();
    const poll = window.setInterval(() => void load(), 12_000);
    const clock = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, []);

  return (
    <section aria-label="Compare heartbeat across chains" className="mb-10">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
            Compare heartbeat
          </h2>
          <p className="mt-1 text-xs text-paper-muted">
            Since tip, hottest fee, and feed age. Hop to whichever board is
            interesting right now.
          </p>
        </div>
      </div>
      <ul className="grid gap-2 sm:grid-cols-3">
        {CHAIN_ORDER.map((id) => {
          const c = CHAINS[id];
          const row = tips[id];
          const since =
            row?.timestamp != null ? (now - row.timestamp) / 1000 : null;
          return (
            <li key={id}>
              <Link
                href={`/${c.slug}`}
                className="flex flex-col rounded-[12px] border border-line bg-ink-elevated/70 px-3.5 py-3 transition hover:border-accent/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink"
                    style={{ background: c.accent }}
                  >
                    {c.shortName}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-paper-muted">
                    {freshnessLabel(c)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 mono text-[11px]">
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-paper-muted">
                      Since tip
                    </div>
                    <div className="mt-0.5 text-paper">
                      {formatDuration(since)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-paper-muted">
                      Fee
                    </div>
                    <div className="mt-0.5 text-paper">
                      {formatFee(row?.feeFastest ?? null, c.feeUnit)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-paper-muted">
                      Updated
                    </div>
                    <div className="mt-0.5 text-paper">
                      {formatRelativeAge(row?.fetchedAt)}
                    </div>
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
