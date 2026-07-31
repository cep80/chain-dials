"use client";

import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { SuitePulseStrip } from "@/components/shell/SuitePulseStrip";
import { SuitePriceStrip } from "@/components/price/SuitePriceStrip";
import { ShareBar } from "@/components/share/ShareBar";
import { Hint } from "@/components/ui/Hint";
import { CHAIN_ORDER, CHAINS, SUITE, freshnessLabel } from "@/lib/chains/registry";

export default function SuiteHomePage() {
  return (
    <AppShell suiteHome>
      <header className="mb-10 max-w-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.22em] text-accent">
              Suite
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-paper md:text-6xl">
              {SUITE.name}
            </h1>
          </div>
          <ShareBar target={{ kind: "suite" }} />
        </div>
        <p className="mt-4 text-lg text-paper-muted">{SUITE.tagline}</p>
        <p className="mt-3 text-sm leading-relaxed text-paper-muted">
          {SUITE.description} Pick a chain below. For plain-language labels, turn
          on{" "}
          <Link href="/settings" className="text-accent hover:underline">
            guidance tooltips
          </Link>{" "}
          in Settings.
        </p>
      </header>

      <Hint tip="suite.pulse" as="div" className="mb-2 block w-full">
        <SuitePulseStrip />
      </Hint>

      <SuitePriceStrip />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CHAIN_ORDER.map((id) => {
          const c = CHAINS[id];
          return (
            <li key={id}>
              <Hint tip="suite.card" as="div" className="block h-full w-full">
                <Link
                  href={`/${c.slug}`}
                  className="group flex h-full flex-col rounded-[14px] border border-line bg-ink-elevated/80 p-5 transition hover:border-accent/50"
                  style={{ boxShadow: `inset 0 0 0 1px ${c.accent}22` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink"
                      style={{ background: c.accent }}
                    >
                      {c.shortName}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-paper-muted">
                      {freshnessLabel(c)}
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-bold text-paper group-hover:text-accent">
                    {c.name}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-paper-muted">
                    {c.blurb}
                  </p>
                  <span className="mt-4 text-xs font-semibold text-accent">
                    Open board →
                  </span>
                </Link>
              </Hint>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
