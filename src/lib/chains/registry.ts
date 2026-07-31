import type { ChainConfig, ChainId } from "@/lib/chains/types";

export const CHAIN_ORDER: ChainId[] = ["btc", "eth", "sol", "hype"];

export const CHAINS: Record<ChainId, ChainConfig> = {
  btc: {
    id: "btc",
    slug: "btc",
    name: "Bitcoin",
    shortName: "BTC",
    ticker: "BTC",
    blurb: "Ten-minute heartbeat, live dials: the one that started the habit.",
    hero: "The boring-important bits of Bitcoin. Still humming. Still live.",
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
      "Cadence, mempool weather, tip face, halvings, hashrate: the quiet stuff that actually matters. Click one to go big. On Atmosphere, a bright dot peeks at a tx; empty space opens the stage.",
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
          "The mist is the whole waiting room, stacked by how much people are paying. Those bright dots? A handful of recent transactions. Click one to peek, or poke the empty space to go fullscreen.",
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
          "Sand tracks this subsidy era: how far we are until miners’ block reward halves again. That tiny ring in the neck? The long story: how much of the 21 million is already out in the world.",
      },
      forge: {
        frameTitle: "Forge",
        title: "Hashrate Forge",
        subtitle: "How hard the network is working",
        narrative:
          "Brighter heat means more hashing power securing the chain. The outer ring is the difficulty epoch: every 2016 blocks, Bitcoin quietly decides how hard the next stretch should be.",
      },
    },
  },
  eth: {
    id: "eth",
    slug: "eth",
    name: "Ethereum",
    shortName: "ETH",
    ticker: "ETH",
    blurb: "Slots, fee tides, and a sky full of validators.",
    hero: "Ethereum drawn as itself: slots in a lattice, fees as tide, stake as stars.",
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
      "Not Bitcoin’s dials: a dimmer room with its own mood. Click Tide anywhere to stretch out (the foam’s just decor). The board refreshes about every 15s; tip updates a little faster.",
    instruments: {
      metronome: {
        frameTitle: "Lattice",
        title: "Slot Lattice",
        subtitle: "Thirty-two slots, then an epoch",
        narrative:
          "Ethereum’s clock is a grid, not a circle. Thirty-two cells for the current stretch; the lit one is now. If height jumps ahead, skipped cells keep a little scar, so you can see where time hiccuped.",
      },
      atmosphere: {
        frameTitle: "Tide",
        title: "Base Fee Tide",
        subtitle: "Base fee wave, tip foam on top",
        narrative:
          "The wave is recent base fee (what gets burned). Soft foam on the crest is priority-tip mood (pretty, not clickable). High tide? Pricey base. Click anywhere on the pane to go fullscreen.",
      },
      sigil: {
        frameTitle: "Mosaic",
        title: "Block Mosaic",
        subtitle: "Tip hash as stained glass",
        narrative:
          "We shatter the tip hash into colored tiles. New block, new window. Click to copy the full hash, if you collect that sort of thing.",
      },
      issuance: {
        frameTitle: "Candle",
        title: "Burn Candle",
        subtitle: "Burn flame, supply wax",
        narrative:
          "Flame height is ETH burned in the latest block. Wax is circulating supply against a soft 120M mark (not mint rate). Sometimes the flame wins. That’s the joke, and kind of the point.",
      },
      forge: {
        frameTitle: "Sky",
        title: "Validator Constellation",
        subtitle: "Stake as a night sky",
        narrative:
          "No ASICs here. Security is a sky of bonded validators. Brighter sky, warmer stake. The orbit ring? Just how far we are through the epoch.",
      },
    },
  },
  sol: {
    id: "sol",
    slug: "sol",
    name: "Solana",
    shortName: "SOL",
    ticker: "SOL",
    blurb: "Loud, fast, a little ridiculous, on purpose.",
    hero: "Solana at slot speed: loud, fast, and a little ridiculous on purpose.",
    accent: "#14f195",
    accentDim: "#0dbf74",
    targetBlockSeconds: 0.4,
    cadenceLabel: "slot",
    feeUnit: "µLamports/CU",
    tipNoun: "slot",
    explorerTx: (id) => `https://solscan.io/tx/${id}`,
    explorerBlock: (h) => `https://solscan.io/block/${h}`,
    dataStatus: "partial",
    coingeckoId: "solana",
    modules: "core",
    observatoryTitle: "Turbine bay",
    observatoryBlurb:
      "A tach bay, not a ten-minute clock. Tap a jet to peek; empty space goes fullscreen. Tips poll often. The heavier snapshot lands about every 15s.",
    instruments: {
      metronome: {
        frameTitle: "Tach",
        title: "Turbine Tach",
        subtitle: "About 400ms between heartbeats",
        narrative:
          "Forget ten minutes. Solana’s cadence is a tachometer. The needle tracks time since the last slot. Near the redline? Slots are healthy.Relax: it’s supposed to look dramatic.",
      },
      atmosphere: {
        frameTitle: "Jets",
        title: "Priority Jets",
        subtitle: "Who paid extra to cut the line",
        narrative:
          "These rockets are recent prioritization fee samples (not full transactions). Taller jets paid more. Click one to peek; empty space opens this fullscreen.",
      },
      sigil: {
        frameTitle: "Ribbon",
        title: "Leader Ribbon",
        subtitle: "Blockhash on a ticker tape",
        narrative:
          "The tip blockhash scrolls by like stadium ribbon. New slot, new parade. Click if you want to snag the full hash.",
      },
      issuance: {
        frameTitle: "Fountain",
        title: "Inflation Fountain",
        subtitle: "Epoch water, inflation spray",
        narrative:
          "Basin water is how far we are through the epoch. Spray intensity comes from the on-chain inflation rate. Rewards splash out over time. Watch, don’t drink.",
      },
      forge: {
        frameTitle: "Reef",
        title: "Stake Reef",
        subtitle: "Vote accounts as kelp",
        narrative:
          "Validators are a reef. Denser kelp means more activated stake. That slow current around the edge is epoch progress. Touch nothing. Just watch it sway.",
      },
    },
  },
  hype: {
    id: "hype",
    slug: "hype",
    name: "Hyperliquid",
    shortName: "HYPE",
    ticker: "HYPE",
    blurb: "Clearing-house vibes: funding weather, OI heat, a one-second clock.",
    hero: "Not a spot chart: a little clearing house. Heartbeats, funding weather, open-interest heat.",
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
      "Clock, tide, tape, fountain, vault. Tip cadence is HyperEVM (~1s), not HyperCore L1, so don’t mix those up. Click Tide to stretch out; the heavier snapshot lands about every 15s.",
    instruments: {
      metronome: {
        frameTitle: "Clock",
        title: "Clearing Clock",
        subtitle: "About one-second HyperEVM heartbeats",
        narrative:
          "HyperEVM aims for roughly one-second blocks. The hand tracks time since the tip. Near the mark means the clearing clock is humming. This isn’t HyperCore L1, and that’s on purpose.",
      },
      atmosphere: {
        frameTitle: "Tide",
        title: "Funding Tide",
        subtitle: "Perp funding across the book",
        narrative:
          "The wave is a funding profile across top markets. Foam is HyperEVM gas-tip mood. High tide means longs are paying. Click the pane if you want the fullscreen version.",
      },
      sigil: {
        frameTitle: "Tape",
        title: "Hash Tape",
        subtitle: "Tip hash on a ticker",
        narrative:
          "The tip block hash scrolls like exchange tape. New block, new print. Click to copy the full hash, if you’re into that.",
      },
      issuance: {
        frameTitle: "Fountain",
        title: "Volume Fountain",
        subtitle: "Twenty-four-hour notional spray",
        narrative:
          "Basin water is HYPE circulating versus the 1B max. Spray intensity comes from 24h perp notional. Watch the flow; don’t trade the fountain.",
      },
      forge: {
        frameTitle: "Vault",
        title: "OI Vault",
        subtitle: "Open interest as heat",
        narrative:
          "Denser vault means more open interest locked across perps. The orbit ring is HyperEVM gas-used mood: how busy recent blocks feel.",
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
  if (chain.id === "btc") return "Live";
  return "About every 15s";
}

export const SUITE = {
  name: "Chain Dials",
  tagline: "Live network dials you can actually glance at.",
  description:
    "A quiet place to watch Bitcoin, Ethereum, Solana, and Hyperliquid. Each board with its own instruments, same habit of looking.",
} as const;
