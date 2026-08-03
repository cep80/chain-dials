"use client";

import { Suspense } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { BlockFoundToast } from "@/components/shell/BlockFoundToast";
import { PulseStrip } from "@/components/shell/PulseStrip";
import { DeepLinkStage } from "@/components/share/DeepLinkStage";
import { ShareBar } from "@/components/share/ShareBar";
import { FavoritesBoard } from "@/components/favorites/FavoritesBoard";
import { CoreTermHints } from "@/components/metrics/CoreTermHints";
import { ModuleGrid } from "@/components/metrics/ModuleGrid";
import { PartnerSlot } from "@/components/monetization/PartnerSlot";
import { TipJar } from "@/components/monetization/TipJar";
import { ProTeaser } from "@/components/monetization/ProTeaser";
import { SavedLayoutsPanel } from "@/components/pro/SavedLayoutsPanel";
import { Observatory } from "@/components/viz/Observatory";
import { PriceChartPanel } from "@/components/price/PriceChartPanel";
import { freshnessLabel } from "@/lib/chains/registry";
import { useChain } from "@/lib/chains/context";
import { formatDuration, formatFee } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

export default function ChainBoardPage() {
  const chain = useChain();
  const boardPulse = useDashboardStore((s) => s.boardPulse);
  const live = useDashboardStore((s) => s.live);
  const now = useDashboardStore((s) => s.now);
  const reduce = useReducedMotion();
  const since =
    live.tipTimestamp != null
      ? formatDuration(Math.max(0, (now - live.tipTimestamp) / 1000))
      : null;

  return (
    <AppShell>
      <Suspense fallback={null}>
        <DeepLinkStage />
      </Suspense>
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
                {chain.name} board · {freshnessLabel(chain)}
              </p>
              <h1 className="text-4xl font-extrabold tracking-tight text-paper md:text-5xl lg:text-6xl">
                {chain.shortName}{" "}
                <span className="text-paper-muted">Dials</span>
              </h1>
              <p className="mt-3 max-w-xl text-base text-paper-muted md:text-lg">
                {chain.hero}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ShareBar
                target={{
                  kind: "board",
                  chainId: chain.id,
                  fee: formatFee(live.feeFastest, chain.feeUnit),
                  since,
                }}
              />
              <TipJar
                label={
                  chain.id === "btc" ? "Send sats" : "Support the suite"
                }
              />
              <Link
                href={`/${chain.slug}/pro`}
                className="rounded-full border border-line px-4 py-2 text-sm text-paper-muted transition hover:border-accent hover:text-paper"
              >
                Pro
              </Link>
            </div>
          </div>
        </header>

        <PulseStrip />

            <PriceChartPanel />

        <Observatory />

        {chain.modules === "full" ? (
          <>
            <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
              <FavoritesBoard />
              <div className="flex flex-col gap-4">
                <PartnerSlot />
                <ProTeaser />
              </div>
            </div>

            <SavedLayoutsPanel />

            <section className="mt-12" aria-labelledby="catalog-heading">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2
                    id="catalog-heading"
                    className="text-2xl font-bold text-paper"
                  >
                    Everything else
                  </h2>
                  <p className="mt-1 text-sm text-paper-muted">
                    Pin what you care about up top. Expand a row for the
                    plain-language definition.
                  </p>
                </div>
              </div>
              <ModuleGrid />
            </section>
          </>
        ) : (
          <>
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <PartnerSlot />
              <ProTeaser />
            </div>
            <CoreTermHints />
          </>
        )}
      </div>
      <BlockFoundToast />
    </AppShell>
  );
}
