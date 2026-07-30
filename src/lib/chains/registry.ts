import type { ChainConfig, ChainId } from "@/lib/chains/types";

export const CHAIN_ORDER: ChainId[] = ["btc", "eth", "sol", "hype"];

export const CHAINS: Record<ChainId, ChainConfig> = {
  btc: {
    id: "btc",
    slug: "btc",
    name: "Bitcoin",
    shortName: "BTC",
    ticker: "BTC",
    blurb: "The original ten-minute heartbeat. Full observatory, live.",
    hero: "The boring-important bits of Bitcoin, live.",
    accent: "#f7931a",
    accentDim: "#c46e0a",
    targetBlockSeconds: 600,
    cadenceLabel: "block",
    feeUnit: "sat/vB",
    tipNoun: "block",
    explorerTx: (id) => `https://mempool.space/tx/${id}`,
    explorerBlock: (h) => `https://mempool.space/block/${h}`,
    dataStatus: "live",
    coingeckoId: "bitcoin",
    modules: "full",
    observatoryTitle: "Five weird little dials",
    observatoryBlurb:
      "Cadence, mempool weather, tip face, halvings, and hashrate. Click to go big. On Atmosphere, a bright dot inspects a tx; empty space opens the stage.",
    instruments: {
      metronome: {
        frameTitle: "Metronome",
        title: "Block Metronome",
        subtitle: "Is the chain still humming?",
        narrative:
          "Bitcoin aims for a new block about every ten minutes, give or take. When the hand sits near the mark, miners are on schedule. When it keeps going… well, sometimes the network just takes a long breath.",
      },
      atmosphere: {
        frameTitle: "Atmosphere",
        title: "Mempool Atmosphere",
        subtitle: "What’s waiting to get in a block",
        narrative:
          "The mist is the whole waiting room, stacked by how much people are paying (fee rate). The bright dots are a handful of recent transactions. Click one to peek at fees and size, or poke empty space to open this fullscreen.",
      },
      sigil: {
        frameTitle: "Tip Sigil",
        title: "Tip Sigil",
        subtitle: "A doodle of the latest block",
        narrative:
          "Every block has a fingerprint (its hash). We fold that into a little glyph so the tip has a face you can recognize. New block? New doodle. Click it if you want the full hash on your clipboard.",
      },
      issuance: {
        frameTitle: "Issuance",
        title: "Issuance Hourglass",
        subtitle: "Countdown to the next halving",
        narrative:
          "Sand tracks this subsidy era: how far we are through the stretch until miners’ block reward halves again. The tiny ring in the neck is the long story: how much of the 21 million is already out in the world.",
      },
      forge: {
        frameTitle: "Forge",
        title: "Hashrate Forge",
        subtitle: "How hard the network is working",
        narrative:
          "Brighter heat means more hashing power securing the chain. The outer ring is the difficulty epoch. Every 2016 blocks, Bitcoin adjusts how hard it is to find the next one.",
      },
    },
  },
  eth: {
    id: "eth",
    slug: "eth",
    name: "Ethereum",
    shortName: "ETH",
    ticker: "ETH",
    blurb: "Slots, gas tides, and validators in a night sky.",
    hero: "Ethereum as itself: a lattice of slots, a fee tide, a constellation of stake.",
    accent: "#627eea",
    accentDim: "#4b63c4",
    targetBlockSeconds: 12,
    cadenceLabel: "slot",
    feeUnit: "gwei",
    tipNoun: "block",
    explorerTx: (id) => `https://etherscan.io/tx/${id}`,
    explorerBlock: (h) => `https://etherscan.io/block/${h}`,
    dataStatus: "partial",
    coingeckoId: "ethereum",
    modules: "core",
    observatoryTitle: "Beacon room",
    observatoryBlurb:
      "Not Bitcoin’s dials. Lattice, base-fee tide, mosaic tip, burn candle, validator sky. Tide: click anywhere to expand (foam is decor). Snapshot feed ~15s, with faster tip polls.",
    instruments: {
      metronome: {
        frameTitle: "Lattice",
        title: "Slot Lattice",
        subtitle: "32 slots to an epoch",
        narrative:
          "Ethereum’s clock is a grid, not a circle. We map execution height mod 32 onto thirty-two cells. The lit cell is now. When height jumps more than one, skipped cells keep a scar for this epoch window.",
      },
      atmosphere: {
        frameTitle: "Tide",
        title: "Base Fee Tide",
        subtitle: "EIP-1559 base fee wave + tip foam",
        narrative:
          "The wave is the recent base fee series (what gets burned). Soft foam on the crest is priority tip mood - decorative, not clickable. High tide means a pricey base. Click anywhere on the pane to go fullscreen.",
      },
      sigil: {
        frameTitle: "Mosaic",
        title: "Block Mosaic",
        subtitle: "Tip hash as stained glass",
        narrative:
          "We shatter the tip hash into colored tiles. New block, new window. Click to copy the full hash if you collect that sort of thing.",
      },
      issuance: {
        frameTitle: "Candle",
        title: "Burn Candle",
        subtitle: "Burn flame, supply wax",
        narrative:
          "Flame height tracks ETH burned in the latest block (base fee × gas used). Wax is a circulating-supply clock vs a soft 120M mark - not mint rate. Sometimes the flame wins. That’s the joke and the point.",
      },
      forge: {
        frameTitle: "Sky",
        title: "Validator Constellation",
        subtitle: "Stake as a night sky",
        narrative:
          "No ASICs. Security is a sky of bonded validators. Brighter sky means more stake warmth. The orbit ring is epoch progress.",
      },
    },
  },
  sol: {
    id: "sol",
    slug: "sol",
    name: "Solana",
    shortName: "SOL",
    ticker: "SOL",
    blurb: "A tachometer, priority jets, and a reef of stake.",
    hero: "Solana at slot speed: loud, fast, and a little ridiculous on purpose.",
    accent: "#14f195",
    accentDim: "#0dbf74",
    targetBlockSeconds: 0.4,
    cadenceLabel: "slot",
    feeUnit: "µLamports",
    tipNoun: "slot",
    explorerTx: (id) => `https://solscan.io/tx/${id}`,
    explorerBlock: (h) => `https://solscan.io/block/${h}`,
    dataStatus: "partial",
    coingeckoId: "solana",
    modules: "core",
    observatoryTitle: "Turbine bay",
    observatoryBlurb:
      "Tachometer, priority jets, leader ribbon, inflation fountain, stake reef. Jets: click a sample; empty opens stage. Tip polls every few seconds; heavy snapshot ~15s.",
    instruments: {
      metronome: {
        frameTitle: "Tach",
        title: "Turbine Tach",
        subtitle: "~400ms between heartbeats",
        narrative:
          "Forget ten minutes. Solana’s cadence is a tachometer. The needle tracks time since the last slot (block time when RPC gives it). Near the redline means slots are healthy.",
      },
      atmosphere: {
        frameTitle: "Jets",
        title: "Priority Jets",
        subtitle: "Prioritization fee samples",
        narrative:
          "These rockets are recent prioritization fee samples (µLamports), not full transactions. Taller jets paid more. Click a jet to peek at the sample; empty space opens this fullscreen.",
      },
      sigil: {
        frameTitle: "Ribbon",
        title: "Leader Ribbon",
        subtitle: "Blockhash on a ticker tape",
        narrative:
          "The tip blockhash scrolls by like stadium ribbon. New slot, new parade. Click to snag the full hash.",
      },
      issuance: {
        frameTitle: "Fountain",
        title: "Inflation Fountain",
        subtitle: "Epoch water, inflation spray",
        narrative:
          "Basin water is how far we are through the epoch. Spray intensity comes from the on-chain inflation rate. Rewards splash out over the epoch - watch, don’t drink.",
      },
      forge: {
        frameTitle: "Reef",
        title: "Stake Reef",
        subtitle: "Vote accounts as kelp",
        narrative:
          "Validators are a reef. Denser kelp means more activated stake. The current (orbit) is epoch progress. Touch nothing; just watch it sway.",
      },
    },
  },
  hype: {
    id: "hype",
    slug: "hype",
    name: "Hyperliquid",
    shortName: "HYPE",
    ticker: "HYPE",
    blurb: "Clearing clock, funding tide, and an open-interest vault.",
    hero: "Hyperliquid as a clearing house: HyperEVM heartbeats, funding weather, OI heat.",
    accent: "#97FCE4",
    accentDim: "#5fd4bc",
    targetBlockSeconds: 1,
    cadenceLabel: "block",
    feeUnit: "gwei",
    tipNoun: "block",
    explorerTx: (id) => `https://www.hyperscan.com/tx/${id}`,
    explorerBlock: (h) => `https://www.hyperscan.com/block/${h}`,
    dataStatus: "partial",
    coingeckoId: "hyperliquid",
    modules: "core",
    observatoryTitle: "Clearing house",
    observatoryBlurb:
      "Clock, funding tide, hash tape, volume fountain, OI vault. Tip cadence is HyperEVM (~1s), not HyperCore L1. Tide: click to expand. Snapshot ~15s.",
    instruments: {
      metronome: {
        frameTitle: "Clock",
        title: "Clearing Clock",
        subtitle: "~1s HyperEVM heartbeats",
        narrative:
          "HyperEVM aims for roughly one-second blocks. The hand tracks time since the tip. Near the mark means the clearing clock is humming.",
      },
      atmosphere: {
        frameTitle: "Tide",
        title: "Funding Tide",
        subtitle: "Perp funding across the book",
        narrative:
          "The wave is recent funding rates across top markets (bps). Foam is gas tip mood from HyperEVM. High tide means longs are paying. Click the pane to go fullscreen.",
      },
      sigil: {
        frameTitle: "Tape",
        title: "Hash Tape",
        subtitle: "Tip hash on a ticker",
        narrative:
          "The tip block hash scrolls like exchange tape. New block, new print. Click to copy the full hash.",
      },
      issuance: {
        frameTitle: "Fountain",
        title: "Volume Fountain",
        subtitle: "24h notional spray",
        narrative:
          "Basin water is HYPE circulating vs the 1B max. Spray intensity comes from 24h perp notional volume. Watch the flow; don’t trade the fountain.",
      },
      forge: {
        frameTitle: "Vault",
        title: "OI Vault",
        subtitle: "Open interest as heat",
        narrative:
          "Denser vault means more open interest locked across perps. The orbit ring is HyperEVM gas-used mood - how busy recent blocks feel.",
      },
    },
  },
};

export function isChainId(v: string): v is ChainId {
  return (CHAIN_ORDER as string[]).includes(v);
}

export function getChain(id: ChainId): ChainConfig {
  return CHAINS[id];
}

export function freshnessLabel(chain: ChainConfig): string {
  if (chain.id === "btc") return "Live stream";
  return "~15s snapshot";
}

export const SUITE = {
  name: "Chain Dials",
  tagline: "Four chains. Four different toys.",
  description:
    "A calm suite of network boards for Bitcoin, Ethereum, Solana, and Hyperliquid. Each chain gets its own visual language.",
} as const;
