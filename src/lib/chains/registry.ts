import type { ChainConfig, ChainId } from "@/lib/chains/types";

export const CHAIN_ORDER: ChainId[] = ["btc", "eth", "sol", "hype"];

export const CHAINS: Record<ChainId, ChainConfig> = {
  btc: {
    id: "btc",
    slug: "btc",
    name: "Bitcoin",
    shortName: "BTC",
    ticker: "BTC",
    blurb: "Ten-minute cadence, mempool weather, and hashrate — live.",
    hero: "Bitcoin’s quiet vitals: block time, fees, tip, halvings, and hashrate.",
    accent: "#f7931a",
    accentDim: "#c46e0a",
    targetBlockSeconds: 600,
    cadenceLabel: "block",
    feeUnit: "sat/vB",
    tipNoun: "block",
    explorerTx: (id) => `https://mempool.space/tx/${id}`,
    explorerBlock: (h) => `https://mempool.space/block/${h}`,
    explorerAddress: (a) => `https://mempool.space/address/${a}`,
    dataStatus: "live",
    coingeckoId: "bitcoin",
    modules: "full",
    observatoryTitle: "Instruments",
    observatoryBlurb:
      "Cadence, mempool, tip glyph, halvings, and hashrate. Open one to expand. On Atmosphere, select a bright sample for a transaction; empty space opens the stage.",
    instruments: {
      metronome: {
        frameTitle: "Metronome",
        title: "Block Metronome",
        subtitle: "Time since the latest block",
        narrative:
          "Bitcoin targets a new block about every ten minutes. When the hand sits near the mark, miners are on schedule. When it runs past, the network is simply taking longer between tips.",
      },
      atmosphere: {
        frameTitle: "Atmosphere",
        title: "Mempool Atmosphere",
        subtitle: "Unconfirmed transactions waiting for a block",
        narrative:
          "The mist is the mempool, stacked by fee rate. Bright dots are recent sample transactions. Select one for detail, or click empty space to expand fullscreen.",
      },
      sigil: {
        frameTitle: "Tip Sigil",
        title: "Tip Sigil",
        subtitle: "A glyph from the tip hash",
        narrative:
          "Every block has a hash. We fold that fingerprint into a glyph so the tip is easy to recognize. A new block brings a new glyph. Click to copy the full hash.",
      },
      issuance: {
        frameTitle: "Issuance",
        title: "Issuance Hourglass",
        subtitle: "Countdown to the next halving",
        narrative:
          "Sand tracks this subsidy era: progress until the next block-reward halving. The ring in the neck shows how much of the 21 million supply is already issued.",
      },
      forge: {
        frameTitle: "Forge",
        title: "Hashrate Forge",
        subtitle: "Network hashing power",
        narrative:
          "Brighter heat means more hashing power securing the chain. The outer ring is the difficulty epoch: every 2016 blocks, Bitcoin retargets how hard the next stretch should be.",
      },
    },
  },
  eth: {
    id: "eth",
    slug: "eth",
    name: "Ethereum",
    shortName: "ETH",
    ticker: "ETH",
    blurb: "Slots, fee tides, burn, and validator stake.",
    hero: "Ethereum as instruments: slot lattice, base-fee tide, burn, and stake sky.",
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
      "Its own instruments — not Bitcoin’s board. Click Tide to expand (foam is decorative). Snapshots refresh about every 15s; tip updates sooner.",
    instruments: {
      metronome: {
        frameTitle: "Lattice",
        title: "Slot Lattice",
        subtitle: "Thirty-two slots per epoch",
        narrative:
          "Ethereum’s clock is a grid. Thirty-two cells for the current epoch stretch; the lit cell is now. If height jumps ahead, skipped cells keep a mark so missed time stays visible.",
      },
      atmosphere: {
        frameTitle: "Tide",
        title: "Base Fee Tide",
        subtitle: "Base fee wave, tip foam on top",
        narrative:
          "The wave is recent base fee (what gets burned). Soft foam on the crest shows priority-tip mood — decorative, not clickable. High tide means a higher base. Click the pane to expand.",
      },
      sigil: {
        frameTitle: "Mosaic",
        title: "Block Mosaic",
        subtitle: "Tip hash as colored tiles",
        narrative:
          "The tip hash breaks into colored tiles. New block, new mosaic. Click to copy the full hash.",
      },
      issuance: {
        frameTitle: "Candle",
        title: "Burn Candle",
        subtitle: "Burn flame, supply wax",
        narrative:
          "Flame height is ETH burned in the latest block. Wax is circulating supply against a soft 120M mark (not mint rate). When the flame runs hot, more ETH left the supply that block.",
      },
      forge: {
        frameTitle: "Sky",
        title: "Validator Constellation",
        subtitle: "Stake as a night sky",
        narrative:
          "Security here is bonded validators, not ASICs. A brighter sky means warmer stake. The orbit ring shows progress through the current epoch.",
      },
    },
  },
  sol: {
    id: "sol",
    slug: "sol",
    name: "Solana",
    shortName: "SOL",
    ticker: "SOL",
    blurb: "Slot-speed cadence, priority fees, and stake in motion.",
    hero: "Solana at slot speed: tach, priority jets, inflation, and vote stake.",
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
      "A tach bay, not a ten-minute clock. Select a jet for a fee sample; empty space expands. Tips poll often. The fuller snapshot lands about every 15s.",
    instruments: {
      metronome: {
        frameTitle: "Tach",
        title: "Turbine Tach",
        subtitle: "About 400ms between slots",
        narrative:
          "Solana’s cadence is a tachometer, not a ten-minute hand. The needle tracks time since the last slot. Near the redline means slots are arriving on pace.",
      },
      atmosphere: {
        frameTitle: "Jets",
        title: "Priority Jets",
        subtitle: "Prioritization fee samples",
        narrative:
          "Each jet is a recent prioritization-fee sample (not a full transaction). Taller jets paid more. Select one for detail; empty space expands fullscreen.",
      },
      sigil: {
        frameTitle: "Ribbon",
        title: "Leader Ribbon",
        subtitle: "Blockhash on a ticker",
        narrative:
          "The tip blockhash scrolls like a ticker ribbon. New slot, new print. Click to copy the full hash.",
      },
      issuance: {
        frameTitle: "Fountain",
        title: "Inflation Fountain",
        subtitle: "Epoch water, inflation spray",
        narrative:
          "Basin water is progress through the epoch. Spray intensity follows the on-chain inflation rate — rewards issuing over time.",
      },
      forge: {
        frameTitle: "Reef",
        title: "Stake Reef",
        subtitle: "Vote accounts as reef",
        narrative:
          "Validators form a reef. Denser growth means more activated stake. The slow current at the edge is epoch progress.",
      },
    },
  },
  hype: {
    id: "hype",
    slug: "hype",
    name: "Hyperliquid",
    shortName: "HYPE",
    ticker: "HYPE",
    blurb: "Funding history, open interest, volume, and a one-second clock.",
    hero: "A clearing-house board: funding weather, OI heat, volume, and HyperEVM cadence.",
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
      "Clock, tide, tape, fountain, vault. Tip cadence is HyperEVM (~1s), not HyperCore L1. Click Tide to expand; the fuller snapshot lands about every 15s.",
    instruments: {
      metronome: {
        frameTitle: "Clock",
        title: "Clearing Clock",
        subtitle: "About one-second HyperEVM blocks",
        narrative:
          "HyperEVM targets roughly one-second blocks. The hand tracks time since the tip. Near the mark means the clock is on pace. This is HyperEVM, not HyperCore L1.",
      },
      atmosphere: {
        frameTitle: "Tide",
        title: "Funding Tide",
        subtitle: "HYPE hourly funding history",
        narrative:
          "The wave is HYPE’s hourly funding history from Hyperliquid (~48h). Foam is HyperEVM gas-tip mood. High tide means longs are paying. Click the pane to expand.",
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
        subtitle: "Twenty-four-hour notional spray",
        narrative:
          "Basin water is HYPE circulating supply versus the 1B max. Spray intensity comes from 24h perp notional — flow, not a trade signal.",
      },
      forge: {
        frameTitle: "Vault",
        title: "OI Vault",
        subtitle: "Open interest as heat",
        narrative:
          "A denser vault means more open interest across perps. The orbit ring is HyperEVM gas-used mood: how busy recent blocks feel.",
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
  tagline: "Live network dials for a clear glance.",
  description:
    "Watch Bitcoin, Ethereum, Solana, and Hyperliquid on one suite. Each board has its own instruments; the habit is the same.",
} as const;
