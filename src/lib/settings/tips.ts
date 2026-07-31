import type { ChainId } from "@/lib/chains/types";

export type TipId =
  | "pulse.price"
  | "pulse.height"
  | "pulse.slot"
  | "pulse.mempool"
  | "pulse.last_block"
  | "pulse.fee_samples"
  | "pulse.perps"
  | "pulse.fee"
  | "pulse.since_tip"
  | "pulse.feed"
  | "nav.board"
  | "nav.alerts"
  | "nav.wall"
  | "nav.pro"
  | "nav.settings"
  | "nav.suite"
  | "status.connection"
  | "instrument.expand"
  | "instrument.metronome"
  | "instrument.atmosphere"
  | "instrument.sigil"
  | "instrument.issuance"
  | "instrument.forge"
  | "chart.range"
  | "chart.mode"
  | "chart.source"
  | "suite.card"
  | "suite.pulse"
  | "metric.pin"
  | "metric.row"
  | "share.bar"
  | "tip.jar"
  | "settings.newbie"
  | "settings.terms"
  | "settings.toasts"
  | "settings.motion"
  | "settings.density"
  | "settings.chain"
  | "settings.range";

type TipBody = {
  title: string;
  body: string;
};

const BASE: Record<TipId, TipBody> = {
  "pulse.price": {
    title: "Price",
    body: "Live spot price in US dollars for this chain’s main ticker. A pulse, not a brokerage quote.",
  },
  "pulse.height": {
    title: "Height",
    body: "How many blocks have been added since the chain began. Bigger number = newer tip of the chain.",
  },
  "pulse.slot": {
    title: "Slot",
    body: "Solana’s heartbeat unit. Slots advance very fast (~0.4s). Think of it as a micro-block index.",
  },
  "pulse.mempool": {
    title: "Mempool",
    body: "Unconfirmed transactions waiting for a block. When it’s busy, fees usually climb.",
  },
  "pulse.last_block": {
    title: "Last block",
    body: "How many transactions landed in the most recent block we inspected, not a pending mempool count.",
  },
  "pulse.fee_samples": {
    title: "Fee samples",
    body: "Recent fee/priority samples from the network: a mood check, not every pending tx.",
  },
  "pulse.perps": {
    title: "Perps",
    body: "How many perpetual markets Hyperliquid currently lists. The trading book’s universe size.",
  },
  "pulse.fee": {
    title: "Fee",
    body: "A “pay this to get in soon” estimate for the active chain’s fee unit (sat/vB, gwei, µLamports…).",
  },
  "pulse.since_tip": {
    title: "Since tip",
    body: "Time since the newest block (the chain tip). Amber means it’s been quiet longer than usual for this chain. On Hyperliquid this is HyperEVM block time, not the faster HyperCore L1 clock.",
  },
  "pulse.feed": {
    title: "Feed",
    body: "How fresh this board’s data is. Bitcoin streams live; other chains refresh on a short snapshot cadence.",
  },
  "nav.board": {
    title: "Board",
    body: "The main dials view for this chain: instruments, price, and live pulse.",
  },
  "nav.alerts": {
    title: "Alerts",
    body: "Preview of fee and tip nudges. Local browser nudges work today; full rules are still coming.",
  },
  "nav.wall": {
    title: "Wall",
    body: "Big-screen layout for the instruments. Free heartbeat always; full wall is a Pro preview.",
  },
  "nav.pro": {
    title: "Pro",
    body: "What’s coming for power users. Boards stay free; Pro is optional extras (not sold yet).",
  },
  "nav.settings": {
    title: "Settings",
    body: "Tooltips, motion, density, and other preferences. Stored only on this device.",
  },
  "nav.suite": {
    title: "Suite home",
    body: "Overview of every chain board in Chain Dials.",
  },
  "status.connection": {
    title: "Connection",
    body: "Live = feeds are healthy. Spotty/Offline means we’re retrying public APIs.",
  },
  "instrument.expand": {
    title: "Expand",
    body: "Open this instrument fullscreen for a closer look.",
  },
  "instrument.metronome": {
    title: "Cadence",
    body: "Tracks time since the latest block or slot.",
  },
  "instrument.atmosphere": {
    title: "Fee weather",
    body: "How busy or pricey the network feels right now: mempool mist, fee tide, jets, or funding.",
  },
  "instrument.sigil": {
    title: "Tip face",
    body: "A visual fingerprint of the latest block hash — glyph, mosaic, ribbon, or tape.",
  },
  "instrument.issuance": {
    title: "Issuance",
    body: "Supply and reward story for this chain: halvings, burns, inflation, or volume spray.",
  },
  "instrument.forge": {
    title: "Security heat",
    body: "How hard the network is working to stay secure: hashrate, stake, or open interest.",
  },
  "chart.range": {
    title: "Range",
    body: "How far back the price history window looks. Shorter ranges refresh more often.",
  },
  "chart.mode": {
    title: "Chart mode",
    body: "Line = continuous path. Candles = open/high/low/close buckets when the feed provides them.",
  },
  "chart.source": {
    title: "Price source",
    body: "Which public market feed filled this history (Coinbase, Binance, or CoinGecko).",
  },
  "suite.card": {
    title: "Chain board",
    body: "Open this chain’s board — same glance habit, its own instruments and feed.",
  },
  "suite.pulse": {
    title: "Suite pulse",
    body: "A quick tip and fee reading across every chain.",
  },
  "metric.pin": {
    title: "Pin",
    body: "Keep this metric on your favorites strip so it stays at the top of the board.",
  },
  "metric.row": {
    title: "Metric",
    body: "Tap to expand the plain-language definition and data source.",
  },
  "share.bar": {
    title: "Share",
    body: "Copy a link or post a reading to X / Nostr without leaving the board.",
  },
  "tip.jar": {
    title: "Support",
    body: "Optional Lightning support. Voluntary — boards stay free either way.",
  },
  "settings.newbie": {
    title: "Guidance tooltips",
    body: "When on, hover or focus labels for plain-language explanations.",
  },
  "settings.terms": {
    title: "Term hints",
    body: "Shows the glossary section under core (non-Bitcoin) boards.",
  },
  "settings.toasts": {
    title: "Block toasts",
    body: "Brief notices when a new block or slot lands while you’re watching.",
  },
  "settings.motion": {
    title: "Motion",
    body: "System follows your OS setting. Reduce calms animations. Full keeps the dials lively.",
  },
  "settings.density": {
    title: "Density",
    body: "Compact shrinks instrument frames and spacing for laptop walls.",
  },
  "settings.chain": {
    title: "Preferred chain",
    body: "Used for shortcuts like “Open board” from the suite when we need a default.",
  },
  "settings.range": {
    title: "Default price range",
    body: "Which window the price chart opens with on chain boards.",
  },
};

/** Chain-aware overrides for pulse fee unit language, etc. */
export function resolveTip(
  id: TipId,
  ctx?: { chainId?: ChainId; feeUnit?: string },
): TipBody {
  const tip = BASE[id];
  if (id === "pulse.fee" && ctx?.feeUnit) {
    if (ctx.chainId === "sol") {
      return {
        ...tip,
        body: "The p90 recent prioritization-fee price in micro-lamports per compute unit. It is not the total transaction fee or a confirmation-time promise.",
      };
    }
    if (ctx.chainId === "eth") {
      return {
        ...tip,
        body: "The p90 effective gas price across recent execution blocks. It is a recent-block reading, not a pending-mempool or confirmation-time estimate.",
      };
    }
    if (ctx.chainId === "hype") {
      return {
        ...tip,
        body: "The p90 effective HyperEVM gas price across recent blocks. It does not describe HyperCore trading fees.",
      };
    }
    return {
      ...tip,
      body: `A “pay this to get in soon” estimate, shown in ${ctx.feeUnit}.`,
    };
  }
  if (id === "pulse.since_tip" && ctx?.chainId === "sol") {
    return {
      ...tip,
      body: "Time since the latest slot. Amber means slots look quieter than Solana’s usual pace (or the poll lagged).",
    };
  }
  if (id === "pulse.since_tip" && ctx?.chainId === "hype") {
    return {
      ...tip,
      body: "Time since the latest HyperEVM block. Amber means the clearing clock looks late.",
    };
  }
  if (id === "pulse.since_tip" && ctx?.chainId === "eth") {
    return {
      ...tip,
      body: "Time since the latest execution block (~12s target). Amber means it’s been quiet longer than usual.",
    };
  }
  if (id === "instrument.forge" && ctx?.chainId === "hype") {
    return {
      title: "Open interest",
      body: "Aggregate open interest across sampled perpetual markets. It measures trading exposure, not network security.",
    };
  }
  return tip;
}

export const TIP_COPY = BASE;
