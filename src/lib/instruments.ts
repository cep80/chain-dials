export type InstrumentId =
  | "metronome"
  | "atmosphere"
  | "sigil"
  | "issuance"
  | "forge";

export const INSTRUMENT_ORDER: InstrumentId[] = [
  "metronome",
  "atmosphere",
  "sigil",
  "issuance",
  "forge",
];

export const INSTRUMENT_META: Record<
  InstrumentId,
  { title: string; subtitle: string; narrative: string }
> = {
  metronome: {
    title: "Block Metronome",
    subtitle: "Time since the latest block",
    narrative:
      "Bitcoin targets a new block about every ten minutes. When the hand sits near the mark, miners are on schedule. When it runs past, the network is simply taking longer between tips.",
  },
  atmosphere: {
    title: "Mempool Atmosphere",
    subtitle: "Unconfirmed transactions waiting for a block",
    narrative:
      "The mist is the mempool, stacked by fee rate. Bright dots are recent sample transactions. Select one for detail, or click empty space to expand fullscreen.",
  },
  sigil: {
    title: "Tip Sigil",
    subtitle: "A glyph from the tip hash",
    narrative:
      "Every block has a hash. We fold that fingerprint into a glyph so the tip is easy to recognize. A new block brings a new glyph. Click to copy the full hash.",
  },
  issuance: {
    title: "Issuance Hourglass",
    subtitle: "Countdown to the next halving",
    narrative:
      "Sand tracks this subsidy era: progress until the next block-reward halving. The ring in the neck shows how much of the 21 million supply is already issued.",
  },
  forge: {
    title: "Hashrate Forge",
    subtitle: "Network hashing power",
    narrative:
      "Brighter heat means more hashing power securing the chain. The outer ring is the difficulty epoch: every 2016 blocks, Bitcoin retargets how hard the next stretch should be.",
  },
};

export function nextInstrument(id: InstrumentId): InstrumentId {
  const i = INSTRUMENT_ORDER.indexOf(id);
  return INSTRUMENT_ORDER[(i + 1) % INSTRUMENT_ORDER.length];
}

export function prevInstrument(id: InstrumentId): InstrumentId {
  const i = INSTRUMENT_ORDER.indexOf(id);
  return INSTRUMENT_ORDER[(i - 1 + INSTRUMENT_ORDER.length) % INSTRUMENT_ORDER.length];
}
