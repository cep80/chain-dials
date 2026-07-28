"use client";

import { AppShell } from "@/components/shell/AppShell";
import { ProGate } from "@/components/monetization/ProGate";
import { PulseStrip } from "@/components/shell/PulseStrip";
import { BlockMetronome } from "@/components/viz/BlockMetronome";
import { HashrateForge } from "@/components/viz/HashrateForge";
import { IssuanceHourglass } from "@/components/viz/IssuanceHourglass";
import { MempoolAtmosphere } from "@/components/viz/MempoolAtmosphere";
import { TipSigil } from "@/components/viz/TipSigil";
import Link from "next/link";

export default function WallPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-paper">Wall Mode</h1>
        <p className="mt-2 max-w-2xl text-paper-muted">
          Free heartbeat below. Full five-instrument kiosk layout is a Pro preview
          for now — checkout isn’t live yet.
        </p>
      </div>

      {/* Free partial wall — cadence ritual without a paywall */}
      <section
        aria-labelledby="free-wall-heading"
        className="mb-8 rounded-[14px] border border-line bg-ink p-6 md:p-8"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-accent">
              Free forever
            </p>
            <h2
              id="free-wall-heading"
              className="text-xl font-bold text-paper md:text-2xl"
            >
              Cadence wall
            </h2>
          </div>
          <Link href="/" className="text-sm text-paper-muted hover:text-accent">
            ← Observatory board
          </Link>
        </div>
        <div className="mb-6">
          <PulseStrip />
        </div>
        <div className="flex justify-center">
          <BlockMetronome large />
        </div>
      </section>

      <ProGate
        title="Full observatory wall"
        detail="All five instruments in a kiosk grid. Pro isn’t for sale yet — join the waitlist; the free board and cadence wall stay live."
        ctaLabel="Join Pro waitlist"
        ctaHref="/pro#waitlist"
      >
        <div className="bg-ink p-6 md:p-10">
          <p className="mb-6 text-center text-5xl font-extrabold tracking-tight text-paper">
            BTC Dash
          </p>
          <div className="mb-8">
            <PulseStrip />
          </div>
          <div className="grid gap-4 md:grid-cols-6">
            <div className="md:col-span-2">
              <BlockMetronome large />
            </div>
            <div className="md:col-span-2">
              <MempoolAtmosphere large />
            </div>
            <div className="md:col-span-2">
              <TipSigil large />
            </div>
            <div className="md:col-span-3">
              <IssuanceHourglass large />
            </div>
            <div className="md:col-span-3">
              <HashrateForge large />
            </div>
          </div>
        </div>
      </ProGate>
    </AppShell>
  );
}
