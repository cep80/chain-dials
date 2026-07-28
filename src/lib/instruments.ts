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
    subtitle: "Cadence of the timechain",
    narrative:
      "Bitcoin targets a block every ten minutes. This dial is the network’s heartbeat — calm near the mark, tense when the tip goes quiet.",
  },
  atmosphere: {
    title: "Mempool Atmosphere",
    subtitle: "Live transactions as weather",
    narrative:
      "Mist shows the full mempool by fee altitude (from the fee histogram). Bright dots are a recent transaction sample — click one to inspect fee, size, value, and open it on mempool.space.",
  },
  sigil: {
    title: "Tip Sigil",
    subtitle: "Identity of the chain tip",
    narrative:
      "Each block hash folds into a unique glyph. When the tip advances, a new fingerprint is born — the face of consensus.",
  },
  issuance: {
    title: "Issuance Hourglass",
    subtitle: "Toward the 21 million hard cap",
    narrative:
      "Sand below is money already minted. Sand above is what remains. The neck tracks progress through the current subsidy epoch.",
  },
  forge: {
    title: "Hashrate Forge",
    subtitle: "Security as living heat",
    narrative:
      "Ember intensity tracks network hashrate. The outer orbit is the difficulty epoch — where the forge retargets every 2016 blocks.",
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
