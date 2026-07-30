"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BlockMetronome } from "@/components/viz/BlockMetronome";
import { HashrateForge } from "@/components/viz/HashrateForge";
import { IssuanceHourglass } from "@/components/viz/IssuanceHourglass";
import { MempoolAtmosphere } from "@/components/viz/MempoolAtmosphere";
import { TipSigil } from "@/components/viz/TipSigil";
import { BaseFeeTide } from "@/components/viz/eth/BaseFeeTide";
import { BlockMosaic } from "@/components/viz/eth/BlockMosaic";
import { BurnCandle } from "@/components/viz/eth/BurnCandle";
import { SlotLattice } from "@/components/viz/eth/SlotLattice";
import { ValidatorConstellation } from "@/components/viz/eth/ValidatorConstellation";
import { ClearingClock } from "@/components/viz/hype/ClearingClock";
import { FundingTide } from "@/components/viz/hype/FundingTide";
import { HashTape } from "@/components/viz/hype/HashTape";
import { OiVault } from "@/components/viz/hype/OiVault";
import { VolumeFountain } from "@/components/viz/hype/VolumeFountain";
import { InflationFountain } from "@/components/viz/sol/InflationFountain";
import { LeaderRibbon } from "@/components/viz/sol/LeaderRibbon";
import { PriorityJets } from "@/components/viz/sol/PriorityJets";
import { StakeReef } from "@/components/viz/sol/StakeReef";
import { TurbineTach } from "@/components/viz/sol/TurbineTach";
import { useChainOptional } from "@/lib/chains/context";

function BtcGrid({ large }: { large: boolean }) {
  return (
    <>
      <div className="sm:col-span-1 xl:col-span-2">
        <BlockMetronome large={large} />
      </div>
      <div className="sm:col-span-1 xl:col-span-2">
        <MempoolAtmosphere large={large} />
      </div>
      <div className="sm:col-span-2 xl:col-span-2">
        <TipSigil large={large} />
      </div>
      <div className="sm:col-span-1 xl:col-span-3">
        <IssuanceHourglass large={large} />
      </div>
      <div className="sm:col-span-1 xl:col-span-3">
        <HashrateForge large={large} />
      </div>
    </>
  );
}

function EthGrid({ large }: { large: boolean }) {
  return (
    <>
      <div className="sm:col-span-1 xl:col-span-2">
        <SlotLattice large={large} />
      </div>
      <div className="sm:col-span-1 xl:col-span-2">
        <BaseFeeTide large={large} />
      </div>
      <div className="sm:col-span-2 xl:col-span-2">
        <BlockMosaic large={large} />
      </div>
      <div className="sm:col-span-1 xl:col-span-3">
        <BurnCandle large={large} />
      </div>
      <div className="sm:col-span-1 xl:col-span-3">
        <ValidatorConstellation large={large} />
      </div>
    </>
  );
}

function SolGrid({ large }: { large: boolean }) {
  return (
    <>
      <div className="sm:col-span-1 xl:col-span-2">
        <TurbineTach large={large} />
      </div>
      <div className="sm:col-span-1 xl:col-span-2">
        <PriorityJets large={large} />
      </div>
      <div className="sm:col-span-2 xl:col-span-2">
        <LeaderRibbon large={large} />
      </div>
      <div className="sm:col-span-1 xl:col-span-3">
        <InflationFountain large={large} />
      </div>
      <div className="sm:col-span-1 xl:col-span-3">
        <StakeReef large={large} />
      </div>
    </>
  );
}

function HypeGrid({ large }: { large: boolean }) {
  return (
    <>
      <div className="sm:col-span-1 xl:col-span-2">
        <ClearingClock large={large} />
      </div>
      <div className="sm:col-span-1 xl:col-span-2">
        <FundingTide large={large} />
      </div>
      <div className="sm:col-span-2 xl:col-span-2">
        <HashTape large={large} />
      </div>
      <div className="sm:col-span-1 xl:col-span-3">
        <VolumeFountain large={large} />
      </div>
      <div className="sm:col-span-1 xl:col-span-3">
        <OiVault large={large} />
      </div>
    </>
  );
}

export function Observatory({ large = false }: { large?: boolean }) {
  const reduce = useReducedMotion();
  const chain = useChainOptional();
  const id = chain?.id ?? "btc";

  return (
    <section aria-labelledby="observatory-heading" className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-accent">
            Observatory
          </p>
          <h2
            id="observatory-heading"
            className="text-2xl font-bold tracking-tight text-paper md:text-3xl"
          >
            {chain?.observatoryTitle ?? "Five weird little dials"}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-paper-muted">
            {chain?.observatoryBlurb ??
              "Cadence, mempool weather, tip face, halvings, and hashrate. Click to go big."}
          </p>
        </div>
      </div>

      <motion.div
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
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
    </section>
  );
}
