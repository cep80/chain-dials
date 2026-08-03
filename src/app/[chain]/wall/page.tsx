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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-accent">
            Free, always
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-paper">Wall Mode</h1>
          <p className="mt-2 max-w-2xl text-paper-muted">
            Big quiet layout for {chain.name}. Same instruments as the board,
            stretched for a TV or a second monitor.
          </p>
        </div>
        <Link
          href={`/${chain.slug}`}
          className="text-sm text-paper-muted hover:text-accent"
        >
          ← Back to the board
        </Link>
      </div>

      <section className="rounded-[14px] border border-line bg-ink p-6 md:p-10">
        <p className="mb-6 text-center text-5xl font-extrabold tracking-tight text-paper">
          {chain.shortName} Dials
        </p>
        <div className="mb-8">
          <PulseStrip />
        </div>
        <Observatory large />
      </section>
    </AppShell>
  );
}
