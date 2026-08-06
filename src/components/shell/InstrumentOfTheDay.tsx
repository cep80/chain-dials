"use client";

import Link from "next/link";
import { useEffect, useMemo, type CSSProperties } from "react";
import { ShareBar } from "@/components/share/ShareBar";
import { InstrumentBody } from "@/components/share/ShareInstrumentClient";
import { InstrumentPreviewProvider } from "@/components/viz/instrument-preview";
import { useAltChainStore } from "@/lib/chains/alt-store";
import { ChainProvider } from "@/lib/chains/context";
import { CHAINS } from "@/lib/chains/registry";
import { pickInstrumentOfDay } from "@/lib/instrument-of-the-day";
import { useDashboardStore } from "@/lib/store";

/** Rotating live dial on the suite hub. */
export function InstrumentOfTheDay() {
  const pick = useMemo(() => pickInstrumentOfDay(), []);
  const chain = CHAINS[pick.chainId];
  const copy = chain.instruments[pick.instrument];
  const boardHref = `/${chain.slug}?i=${pick.instrument}`;
  const shareHref = `/${chain.slug}/i/${pick.instrument}`;

  const hydrate = useDashboardStore((s) => s.hydrate);
  const startBtc = useDashboardStore((s) => s.start);
  const resetLive = useDashboardStore((s) => s.resetLive);
  const patchLive = useDashboardStore((s) => s.patchLive);
  const startAlt = useAltChainStore((s) => s.start);

  // Suite hub skips chain feeds; bootstrap just the featured chain so the dial moves.
  useEffect(() => {
    hydrate();
    if (pick.chainId === "btc") {
      resetLive();
      return startBtc();
    }

    resetLive();
    const stopAlt = startAlt(pick.chainId);
    const tickDash = window.setInterval(() => {
      useDashboardStore.getState().tick();
    }, 1_000);

    const sync = (
      s: ReturnType<typeof useAltChainStore.getState>,
      prev?: ReturnType<typeof useAltChainStore.getState>,
    ) => {
      if (s.chainId !== pick.chainId) return;
      const pulsed =
        !!prev &&
        s.live.blockHeight != null &&
        prev.live.blockHeight != null &&
        s.live.blockHeight > prev.live.blockHeight;
      patchLive(
        {
          priceUsd: s.live.priceUsd,
          blockHeight: s.live.blockHeight,
          tipHash: s.live.tipHash,
          tipTimestamp: s.live.tipTimestamp,
          feeFastest: s.live.feeFastest,
          feeHalfHour: s.live.feeHalfHour,
          feeHour: s.live.feeHour,
          feeEconomy: s.live.feeEconomy,
          mempoolCount: s.live.mempoolCount,
          mempoolPressure: s.live.mempoolPressure,
          mempoolVsize:
            s.live.mempoolPressure != null
              ? Math.round((s.live.mempoolPressure / 100) * 1_000_000)
              : null,
          feeHistogram: s.live.feeHistogram,
          recentTxs: s.live.recentTxs,
          baseFeeSeries: s.live.baseFeeSeries,
          prioritySeries: s.live.prioritySeries,
          securityScore: s.live.securityScore,
          forgeLabel: s.live.forgeLabel,
          issuanceProgress: s.live.issuanceProgress,
          supplyProgress: s.live.supplyProgress,
          inflationRate: s.live.inflationRate,
          burnEthPerBlock: s.live.burnEthPerBlock,
          feedSource: s.live.source,
          retargetProgress: s.live.epochProgress,
          retargetBlocks: s.live.epochBlocksLeft,
          hashrate: null,
          lastRestAt: s.live.lastAt,
        },
        { pulse: pulsed, connection: s.connection },
      );
    };

    const unsub = useAltChainStore.subscribe((s, prev) => sync(s, prev));
    sync(useAltChainStore.getState());
    return () => {
      unsub();
      window.clearInterval(tickDash);
      stopAlt();
    };
  }, [
    pick.chainId,
    hydrate,
    startBtc,
    startAlt,
    resetLive,
    patchLive,
  ]);

  return (
    <section
      aria-labelledby="dial-of-day-heading"
      className="mb-10 overflow-hidden rounded-[14px] border border-line bg-ink-elevated/50"
      style={{ boxShadow: `inset 0 0 0 1px ${chain.accent}22` }}
    >
      <div className="flex flex-col gap-6 p-5 md:flex-row md:items-stretch md:justify-between md:p-6">
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] uppercase tracking-[0.2em] font-semibold"
            style={{ color: chain.accent }}
          >
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
              href={boardHref}
              className="rounded-full px-4 py-2 text-sm font-bold tracking-wide transition hover:brightness-110"
              style={{ background: chain.accent, color: "#0a0c10" }}
            >
              Open this dial
            </Link>
            <Link
              href={shareHref}
              className="text-sm transition hover:underline"
              style={{ color: chain.accent }}
            >
              Share page →
            </Link>
          </div>
        </div>

        <Link
          href={boardHref}
          className="group relative w-full shrink-0 self-center outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink md:w-[300px]"
          aria-label={`Open ${chain.shortName} ${copy.frameTitle} on the board`}
        >
          <div
            className="pointer-events-none transition duration-300 ease-out will-change-transform group-hover:-translate-y-1 group-focus-visible:-translate-y-1"
            style={
              {
                "--accent": chain.accent,
                "--accent-dim": chain.accentDim,
              } as CSSProperties
            }
          >
            <InstrumentPreviewProvider>
              <ChainProvider chainId={pick.chainId}>
                <InstrumentBody
                  chainId={pick.chainId}
                  instrument={pick.instrument}
                  large
                />
              </ChainProvider>
            </InstrumentPreviewProvider>
          </div>
          <span className="mt-3 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-paper-muted transition group-hover:text-paper">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{
                background: chain.accent,
                boxShadow: `0 0 10px ${chain.accent}`,
              }}
              aria-hidden
            />
            Live · open board
          </span>
        </Link>
      </div>
    </section>
  );
}
