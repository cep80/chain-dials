"use client";

import dynamic from "next/dynamic";

function LoadingInstrument() {
  return <div className="flex min-h-[240px] items-center justify-center rounded-[14px] border border-line bg-ink-elevated text-xs text-paper-muted" role="status">Loading instrument…</div>;
}

export const BlockMetronome = dynamic(() => import("@/components/viz/BlockMetronome").then((module) => module.BlockMetronome), { loading: LoadingInstrument });
export const HashrateForge = dynamic(() => import("@/components/viz/HashrateForge").then((module) => module.HashrateForge), { loading: LoadingInstrument });
export const IssuanceHourglass = dynamic(() => import("@/components/viz/IssuanceHourglass").then((module) => module.IssuanceHourglass), { loading: LoadingInstrument });
export const MempoolAtmosphere = dynamic(() => import("@/components/viz/MempoolAtmosphere").then((module) => module.MempoolAtmosphere), { loading: LoadingInstrument });
export const TipSigil = dynamic(() => import("@/components/viz/TipSigil").then((module) => module.TipSigil), { loading: LoadingInstrument });
export const BaseFeeTide = dynamic(() => import("@/components/viz/eth/BaseFeeTide").then((module) => module.BaseFeeTide), { loading: LoadingInstrument });
export const BlockMosaic = dynamic(() => import("@/components/viz/eth/BlockMosaic").then((module) => module.BlockMosaic), { loading: LoadingInstrument });
export const BurnCandle = dynamic(() => import("@/components/viz/eth/BurnCandle").then((module) => module.BurnCandle), { loading: LoadingInstrument });
export const SlotLattice = dynamic(() => import("@/components/viz/eth/SlotLattice").then((module) => module.SlotLattice), { loading: LoadingInstrument });
export const ValidatorConstellation = dynamic(() => import("@/components/viz/eth/ValidatorConstellation").then((module) => module.ValidatorConstellation), { loading: LoadingInstrument });
export const ClearingClock = dynamic(() => import("@/components/viz/hype/ClearingClock").then((module) => module.ClearingClock), { loading: LoadingInstrument });
export const FundingTide = dynamic(() => import("@/components/viz/hype/FundingTide").then((module) => module.FundingTide), { loading: LoadingInstrument });
export const HashTape = dynamic(() => import("@/components/viz/hype/HashTape").then((module) => module.HashTape), { loading: LoadingInstrument });
export const OiVault = dynamic(() => import("@/components/viz/hype/OiVault").then((module) => module.OiVault), { loading: LoadingInstrument });
export const VolumeFountain = dynamic(() => import("@/components/viz/hype/VolumeFountain").then((module) => module.VolumeFountain), { loading: LoadingInstrument });
export const InflationFountain = dynamic(() => import("@/components/viz/sol/InflationFountain").then((module) => module.InflationFountain), { loading: LoadingInstrument });
export const LeaderRibbon = dynamic(() => import("@/components/viz/sol/LeaderRibbon").then((module) => module.LeaderRibbon), { loading: LoadingInstrument });
export const PriorityJets = dynamic(() => import("@/components/viz/sol/PriorityJets").then((module) => module.PriorityJets), { loading: LoadingInstrument });
export const StakeReef = dynamic(() => import("@/components/viz/sol/StakeReef").then((module) => module.StakeReef), { loading: LoadingInstrument });
export const TurbineTach = dynamic(() => import("@/components/viz/sol/TurbineTach").then((module) => module.TurbineTach), { loading: LoadingInstrument });
