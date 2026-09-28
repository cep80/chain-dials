"use client";
import { BlockMetronome, HashrateForge, IssuanceHourglass, MempoolAtmosphere, TipSigil, BaseFeeTide, BlockMosaic, BurnCandle, SlotLattice, ValidatorConstellation, ClearingClock, FundingTide, HashTape, OiVault, VolumeFountain, InflationFountain, LeaderRibbon, PriorityJets, StakeReef, TurbineTach } from "@/components/viz/lazy-instruments";

import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { ShareBar } from "@/components/share/ShareBar";




















import { CHAINS } from "@/lib/chains/registry";
import type { ChainId } from "@/lib/chains/types";
import type { InstrumentId } from "@/lib/instruments";

/** Renders the live dial for a chain + instrument slot (board, share, suite hub). */
export function InstrumentBody({
  chainId,
  instrument,
  large = true,
}: {
  chainId: ChainId;
  instrument: InstrumentId;
  large?: boolean;
}) {
  if (chainId === "eth") {
    switch (instrument) {
      case "metronome":
        return <SlotLattice large={large} />;
      case "atmosphere":
        return <BaseFeeTide large={large} />;
      case "sigil":
        return <BlockMosaic large={large} />;
      case "issuance":
        return <BurnCandle large={large} />;
      case "forge":
        return <ValidatorConstellation large={large} />;
    }
  }
  if (chainId === "sol") {
    switch (instrument) {
      case "metronome":
        return <TurbineTach large={large} />;
      case "atmosphere":
        return <PriorityJets large={large} />;
      case "sigil":
        return <LeaderRibbon large={large} />;
      case "issuance":
        return <InflationFountain large={large} />;
      case "forge":
        return <StakeReef large={large} />;
    }
  }
  if (chainId === "hype") {
    switch (instrument) {
      case "metronome":
        return <ClearingClock large={large} />;
      case "atmosphere":
        return <FundingTide large={large} />;
      case "sigil":
        return <HashTape large={large} />;
      case "issuance":
        return <VolumeFountain large={large} />;
      case "forge":
        return <OiVault large={large} />;
    }
  }
  switch (instrument) {
    case "metronome":
      return <BlockMetronome large={large} />;
    case "atmosphere":
      return <MempoolAtmosphere large={large} />;
    case "sigil":
      return <TipSigil large={large} />;
    case "issuance":
      return <IssuanceHourglass large={large} />;
    case "forge":
      return <HashrateForge large={large} />;
  }
}

export function ShareInstrumentClient({
  chainId,
  instrument,
  headline,
  sub,
}: {
  chainId: ChainId;
  instrument: InstrumentId;
  headline: string;
  sub: string;
}) {
  const chain = CHAINS[chainId];
  const meta = chain.instruments[instrument];

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-accent">
          Shared dial · {chain.shortName}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-paper md:text-4xl">
          {meta.title}
        </h1>
        <p className="mt-2 text-paper-muted">{meta.subtitle}</p>
        <p className="mono mt-4 text-2xl text-accent md:text-3xl">{headline}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-paper-muted">
          {sub}
        </p>

        <div className="mt-8 overflow-hidden rounded-[16px] border border-line bg-ink-elevated/80 p-4">
          <InstrumentBody chainId={chainId} instrument={instrument} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <ShareBar
            target={{
              kind: "instrument",
              chainId,
              instrument,
              reading: headline,
            }}
          />
          <Link
            href={`/${chain.slug}?i=${instrument}`}
            className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-paper-muted transition hover:border-accent hover:text-paper"
          >
            Open full board
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
