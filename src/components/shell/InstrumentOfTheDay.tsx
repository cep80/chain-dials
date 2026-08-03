"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ShareBar } from "@/components/share/ShareBar";
import { CHAIN_ORDER, CHAINS } from "@/lib/chains/registry";
import type { ChainId } from "@/lib/chains/types";
import type { InstrumentId } from "@/lib/instruments";
import { INSTRUMENT_ORDER } from "@/lib/instruments";

function dayIndex(): number {
  const start = Date.UTC(2026, 0, 1);
  return Math.floor((Date.now() - start) / 86_400_000);
}

function pickOfDay(): { chainId: ChainId; instrument: InstrumentId } {
  const i = Math.abs(dayIndex());
  return {
    chainId: CHAIN_ORDER[i % CHAIN_ORDER.length]!,
    instrument: INSTRUMENT_ORDER[i % INSTRUMENT_ORDER.length]!,
  };
}

/** Rotating shareable dial pointer on the suite hub (no live feed required). */
export function InstrumentOfTheDay() {
  const pick = useMemo(() => pickOfDay(), []);
  const chain = CHAINS[pick.chainId];
  const copy = chain.instruments[pick.instrument];

  return (
    <section
      aria-labelledby="dial-of-day-heading"
      className="mb-10 overflow-hidden rounded-[14px] border border-line bg-ink-elevated/50"
      style={{ boxShadow: `inset 0 0 0 1px ${chain.accent}22` }}
    >
      <div className="flex flex-col gap-6 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-accent">
            Instrument of the day
          </p>
          <h2
            id="dial-of-day-heading"
            className="mt-2 text-2xl font-bold text-paper md:text-3xl"
          >
            {chain.shortName} · {copy.frameTitle}
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-paper-muted">
            {copy.subtitle}. {copy.narrative}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ShareBar
              target={{
                kind: "instrument",
                chainId: pick.chainId,
                instrument: pick.instrument,
              }}
            />
            <Link
              href={`/${chain.slug}`}
              className="rounded-full border border-line px-4 py-2 text-sm text-paper-muted transition hover:border-accent hover:text-paper"
            >
              Open {chain.shortName} board
            </Link>
            <Link
              href={`/${chain.slug}/i/${pick.instrument}`}
              className="text-sm text-accent hover:underline"
            >
              Share page →
            </Link>
          </div>
        </div>
        <div
          className="flex h-36 w-36 shrink-0 flex-col items-center justify-center self-center rounded-full border md:h-40 md:w-40"
          style={{
            borderColor: `${chain.accent}55`,
            background: `${chain.accent}12`,
          }}
          aria-hidden
        >
          <span
            className="text-xs font-bold uppercase tracking-[0.2em]"
            style={{ color: chain.accent }}
          >
            {chain.shortName}
          </span>
          <span className="mt-2 text-center text-sm font-semibold text-paper">
            {copy.frameTitle}
          </span>
        </div>
      </div>
    </section>
  );
}
