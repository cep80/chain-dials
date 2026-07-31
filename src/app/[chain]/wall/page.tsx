"use client";

import { AppShell } from "@/components/shell/AppShell";
import { ProGate } from "@/components/monetization/ProGate";
import { PulseStrip } from "@/components/shell/PulseStrip";
import { Observatory } from "@/components/viz/Observatory";
import { BlockMetronome } from "@/components/viz/BlockMetronome";
import { SlotLattice } from "@/components/viz/eth/SlotLattice";
import { ClearingClock } from "@/components/viz/hype/ClearingClock";
import { TurbineTach } from "@/components/viz/sol/TurbineTach";
import { useChain } from "@/lib/chains/context";
import Link from "next/link";

function FreeHeartbeat() {
  const chain = useChain();
  if (chain.id === "eth") return <SlotLattice large />;
  if (chain.id === "sol") return <TurbineTach large />;
  if (chain.id === "hype") return <ClearingClock large />;
  return <BlockMetronome large />;
}

export default function WallPage() {
  const chain = useChain();
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-paper">Wall Mode</h1>
        <p className="mt-2 max-w-2xl text-paper-muted">
          Free heartbeat below. The full instrument wall layout is a Pro
          preview for now — checkout isn’t live yet.
        </p>
      </div>

      <section
        aria-labelledby="free-wall-heading"
        className="mb-8 rounded-[14px] border border-line bg-ink p-6 md:p-8"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-accent">
              Free, always
            </p>
            <h2
              id="free-wall-heading"
              className="text-xl font-bold text-paper md:text-2xl"
            >
              Just the heartbeat
            </h2>
          </div>
          <Link
            href={`/${chain.slug}`}
            className="text-sm text-paper-muted hover:text-accent"
          >
            ← Back to the board
          </Link>
        </div>
        <div className="mb-6">
          <PulseStrip />
        </div>
        <div className="flex justify-center">
          <FreeHeartbeat />
        </div>
      </section>

      <ProGate
        title="The whole wall"
        detail="All five instruments, big and quiet. Pro isn’t for sale yet, so hop on the waitlist. This free heartbeat stays either way."
        ctaLabel="Join the Pro waitlist"
        ctaHref={`/${chain.slug}/pro#waitlist`}
      >
        <div className="bg-ink p-6 md:p-10">
          <p className="mb-6 text-center text-5xl font-extrabold tracking-tight text-paper">
            {chain.shortName} Dials
          </p>
          <div className="mb-8">
            <PulseStrip />
          </div>
          <Observatory large />
        </div>
      </ProGate>
    </AppShell>
  );
}
