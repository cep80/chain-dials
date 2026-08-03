export type ChainId = "btc" | "eth" | "sol" | "hype";

export type InstrumentId =
  | "metronome"
  | "atmosphere"
  | "sigil"
  | "issuance"
  | "forge";

export interface ChainInstrumentCopy {
  title: string;
  subtitle: string;
  narrative: string;
  frameTitle: string;
}

export interface ChainConfig {
  id: ChainId;
  slug: ChainId;
  name: string;
  shortName: string;
  ticker: string;
  blurb: string;
  hero: string;
  accent: string;
  accentDim: string;
  targetBlockSeconds: number;
  cadenceLabel: string;
  feeUnit: string;
  tipNoun: string;
  explorerTx: (id: string) => string;
  explorerBlock: (height: number | string) => string;
  explorerAddress?: (address: string) => string;
  dataStatus: "live" | "partial" | "preview";
  coingeckoId: string;
  modules: "full" | "core";
  instruments: Record<InstrumentId, ChainInstrumentCopy>;
  observatoryTitle: string;
  observatoryBlurb: string;
}
