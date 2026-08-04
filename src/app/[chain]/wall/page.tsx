"use client";

import { AppShell } from "@/components/shell/AppShell";
import { PulseStrip } from "@/components/shell/PulseStrip";
import { Observatory } from "@/components/viz/Observatory";
import { useChain } from "@/lib/chains/context";
import Link from "next/link";

export default function WallPage() {
  const chain = useChain();
  return (
    <AppShell>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-accent">
            Free, always · TV ready
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-paper md:text-4xl">
            Wall Mode
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-paper-muted md:text-base">
            Gallery layout for {chain.name}. Big readings, deep glass, instruments
            that hold a room from across the office.
          </p>
        </div>
        <Link
          href={`/${chain.slug}`}
          className="text-sm text-paper-muted transition hover:text-accent"
        >
          ← Back to the board
        </Link>
      </div>

      <section className="wall-theater" aria-label="Wall instruments">
        <p className="wall-theater-title mb-2">{chain.shortName} Dials</p>
        <p className="mb-8 text-center text-[11px] uppercase tracking-[0.28em] text-paper-muted">
          Live chain instruments
        </p>
        <div className="mb-8">
          <PulseStrip />
        </div>
        <Observatory large wall />
      </section>
    </AppShell>
  );
}
