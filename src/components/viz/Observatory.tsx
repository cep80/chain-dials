"use client";

import { BlockMetronome, HashrateForge, IssuanceHourglass, MempoolAtmosphere, TipSigil, BaseFeeTide, BlockMosaic, BurnCandle, SlotLattice, ValidatorConstellation, ClearingClock, FundingTide, HashTape, OiVault, VolumeFountain, InflationFountain, LeaderRibbon, PriorityJets, StakeReef, TurbineTach } from "@/components/viz/lazy-instruments";

import { motion } from "framer-motion";
import { useSyncExternalStore } from "react";




















import { InstrumentActivity } from "@/components/viz/InstrumentActivity";
import { useChainOptional } from "@/lib/chains/context";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";

const emptySubscribe = () => () => {};

function BtcGrid({ large }: { large: boolean }) {
  return (
    <>
      <InstrumentActivity className="sm:col-span-1 xl:col-span-2">
        <BlockMetronome large={large} />
      </InstrumentActivity>
      <InstrumentActivity className="sm:col-span-1 xl:col-span-2">
        <MempoolAtmosphere large={large} />
      </InstrumentActivity>
      <InstrumentActivity className="sm:col-span-2 xl:col-span-2">
        <TipSigil large={large} />
      </InstrumentActivity>
      <InstrumentActivity className="sm:col-span-1 xl:col-span-3">
        <IssuanceHourglass large={large} />
      </InstrumentActivity>
      <InstrumentActivity className="sm:col-span-1 xl:col-span-3">
        <HashrateForge large={large} />
      </InstrumentActivity>
    </>
  );
}

function EthGrid({ large }: { large: boolean }) {
  return (
    <>
      <InstrumentActivity className="sm:col-span-1 xl:col-span-2">
        <SlotLattice large={large} />
      </InstrumentActivity>
      <InstrumentActivity className="sm:col-span-1 xl:col-span-2">
        <BaseFeeTide large={large} />
      </InstrumentActivity>
      <InstrumentActivity className="sm:col-span-2 xl:col-span-2">
        <BlockMosaic large={large} />
      </InstrumentActivity>
      <InstrumentActivity className="sm:col-span-1 xl:col-span-3">
        <BurnCandle large={large} />
      </InstrumentActivity>
      <InstrumentActivity className="sm:col-span-1 xl:col-span-3">
        <ValidatorConstellation large={large} />
      </InstrumentActivity>
    </>
  );
}

function SolGrid({ large }: { large: boolean }) {
  return (
    <>
      <InstrumentActivity className="sm:col-span-1 xl:col-span-2">
        <TurbineTach large={large} />
      </InstrumentActivity>
      <InstrumentActivity className="sm:col-span-1 xl:col-span-2">
        <PriorityJets large={large} />
      </InstrumentActivity>
      <InstrumentActivity className="sm:col-span-2 xl:col-span-2">
        <LeaderRibbon large={large} />
      </InstrumentActivity>
      <InstrumentActivity className="sm:col-span-1 xl:col-span-3">
        <InflationFountain large={large} />
      </InstrumentActivity>
      <InstrumentActivity className="sm:col-span-1 xl:col-span-3">
        <StakeReef large={large} />
      </InstrumentActivity>
    </>
  );
}

function HypeGrid({ large }: { large: boolean }) {
  return (
    <>
      <InstrumentActivity className="sm:col-span-1 xl:col-span-2">
        <ClearingClock large={large} />
      </InstrumentActivity>
      <InstrumentActivity className="sm:col-span-1 xl:col-span-2">
        <FundingTide large={large} />
      </InstrumentActivity>
      <InstrumentActivity className="sm:col-span-2 xl:col-span-2">
        <HashTape large={large} />
      </InstrumentActivity>
      <InstrumentActivity className="sm:col-span-1 xl:col-span-3">
        <VolumeFountain large={large} />
      </InstrumentActivity>
      <InstrumentActivity className="sm:col-span-1 xl:col-span-3">
        <OiVault large={large} />
      </InstrumentActivity>
    </>
  );
}

export function Observatory({
  large = false,
  wall = false,
}: {
  large?: boolean;
  wall?: boolean;
}) {
  const reduce = useAppReducedMotion();
  const chain = useChainOptional();
  const id = chain?.id ?? "btc";
  // Instruments use motion, tips, and live clocks. Mount the grid only after
  // hydrate so those client-only trees cannot disagree with SSR HTML.
  const gridReady = useSyncExternalStore(emptySubscribe, () => true, () => false);

  return (
    <section
      aria-labelledby="observatory-heading"
      className={wall ? "mt-0" : "mt-6"}
    >
      {!wall && (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-accent">
              Observatory
            </p>
            <h2
              id="observatory-heading"
              className="text-2xl font-bold tracking-tight text-paper md:text-3xl"
            >
              {chain?.observatoryTitle ?? "Instruments"}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-paper-muted">
              {chain?.observatoryBlurb ??
                "Cadence, mempool, block glyph, halvings, and hashrate. Open one to expand."}
            </p>
          </div>
        </div>
      )}
      {wall && (
        <h2 id="observatory-heading" className="sr-only">
          {chain?.observatoryTitle ?? "Instruments"}
        </h2>
      )}

      {gridReady ? (
        <motion.div
          className={`observatory-grid grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6 ${
            large ? "gap-3.5 xl:gap-4" : ""
          }`}
          initial={false}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {id === "eth" ? (
            <EthGrid large={large} />
          ) : id === "sol" ? (
            <SolGrid large={large} />
          ) : id === "hype" ? (
            <HypeGrid large={large} />
          ) : (
            <BtcGrid large={large} />
          )}
        </motion.div>
      ) : (
        <div
          className={`observatory-grid grid min-h-[18rem] gap-3 sm:grid-cols-2 xl:grid-cols-6 ${
            large ? "gap-3.5 xl:gap-4" : ""
          }`}
          aria-hidden
        />
      )}
    </section>
  );
}
