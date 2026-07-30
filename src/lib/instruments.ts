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
    subtitle: "Is the chain still humming?",
    narrative:
      "Bitcoin aims for a new block about every ten minutes, give or take. When the hand sits near the mark, miners are on schedule. When it keeps going… well, sometimes the network just takes a long breath.",
  },
  atmosphere: {
    title: "Mempool Atmosphere",
    subtitle: "What’s waiting to get in a block",
    narrative:
      "The mist is the whole waiting room, stacked by how much people are paying (fee rate). The bright dots are a handful of recent transactions. Click one to peek at fees and size, or poke empty space to open this fullscreen.",
  },
  sigil: {
    title: "Tip Sigil",
    subtitle: "A doodle of the latest block",
    narrative:
      "Every block has a fingerprint (its hash). We fold that into a little glyph so the tip has a face you can recognize. New block? New doodle. Click it if you want the full hash on your clipboard.",
  },
  issuance: {
    title: "Issuance Hourglass",
    subtitle: "Countdown to the next halving",
    narrative:
      "Sand tracks this subsidy era: how far we are through the stretch until miners’ block reward halves again. The tiny ring in the neck is the long story: how much of the 21 million is already out in the world.",
  },
  forge: {
    title: "Hashrate Forge",
    subtitle: "How hard the network is working",
    narrative:
      "Brighter heat means more hashing power securing the chain. The outer ring is the difficulty epoch. Every 2016 blocks, Bitcoin adjusts how hard it is to find the next one.",
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
