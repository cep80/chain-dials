"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AppShell } from "@/components/shell/AppShell";
import { BlockFoundToast } from "@/components/shell/BlockFoundToast";
import { PulseStrip } from "@/components/shell/PulseStrip";
import { FavoritesBoard } from "@/components/favorites/FavoritesBoard";
import { ModuleGrid } from "@/components/metrics/ModuleGrid";
import { PartnerSlot } from "@/components/monetization/PartnerSlot";
import { TipJar } from "@/components/monetization/TipJar";
import { ProTeaser } from "@/components/monetization/ProTeaser";
import { Observatory } from "@/components/viz/Observatory";
import { useDashboardStore } from "@/lib/store";

export default function HomePage() {
  const boardPulse = useDashboardStore((s) => s.boardPulse);
  const reduce = useReducedMotion();

  return (
    <AppShell>
      <div className="relative rounded-[14px]">
        {!reduce && boardPulse > 0 && (
          <motion.div
            key={boardPulse}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 rounded-[14px] border-2 border-accent"
            initial={{ opacity: 0.55 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        )}

        <header className="mb-8 md:mb-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.22em] text-accent">
                Network instrument panel
              </p>
              <h1 className="text-4xl font-extrabold tracking-tight text-paper md:text-5xl lg:text-6xl">
                BTC Dash
              </h1>
              <p className="mt-3 max-w-xl text-base text-paper-muted md:text-lg">
                Bitcoin fundamentals, live — denser than a chart, clearer than a
                terminal.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <TipJar />
              <a
              href="/pro#waitlist"
              className="rounded-full border border-line px-4 py-2 text-sm text-paper-muted transition hover:border-accent hover:text-paper"
            >
              Pro
            </a>
            </div>
          </div>
        </header>

        <PulseStrip />

        <Observatory />

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <FavoritesBoard />
          <div className="flex flex-col gap-4">
            <PartnerSlot />
            <ProTeaser />
          </div>
        </div>

        <section className="mt-12" aria-labelledby="catalog-heading">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2
                id="catalog-heading"
                className="text-2xl font-bold text-paper"
              >
                All modules
              </h2>
              <p className="mt-1 text-sm text-paper-muted">
                Pin anything to Network Health. Click a row for definitions.
              </p>
            </div>
          </div>
          <ModuleGrid />
        </section>
      </div>
      <BlockFoundToast />
    </AppShell>
  );
}
