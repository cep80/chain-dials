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
  | "nav.forensics"
  | "nav.pro"
  | "nav.account"
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
    body: "The waiting room of unconfirmed transactions. When it’s busy, fees usually climb.",
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
    body: "How fresh this board’s data is. Bitcoin updates live; other chains refresh about every 15 seconds.",
  },
  "nav.board": {
    title: "Board",
    body: "The main dials view for this chain: instruments, price, and live pulse.",
  },
  "nav.alerts": {
    title: "Alerts",
    body: "Preview of fee/tip nudges. Local browser nudges work today; full email rules are still warming up.",
  },
  "nav.wall": {
    title: "Wall",
    body: "Full-size instrument layout for a TV or second screen. Free on every board.",
  },
  "nav.forensics": {
    title: "Trace",
    body: "Coldcard drain watchboard: live attacker holdings, victim lookup, and hop tracing for investigators.",
  },
  "nav.pro": {
    title: "Pro",
    body: "Alerts, longer price history, saved layouts. Boards stay free; Pro is optional extras via Stripe.",
  },
  "nav.account": {
    title: "Account",
    body: "Sign in, manage Pro billing, and refresh your Pro status.",
  },
  "nav.settings": {
    title: "Settings",
    body: "Tips, motion, density, and other preferences. Stored only on this device.",
  },
  "nav.suite": {
    title: "Suite home",
    body: "Overview of every chain board in Chain Dials.",
  },
  "status.connection": {
    title: "Connection",
    body: "Shows feed health. Bitcoin updates live; other boards refresh about every 15s. Spotty or Offline means we’re reconnecting.",
  },
  "instrument.expand": {
    title: "Go bigger",
    body: "Open this instrument fullscreen.",
  },
  "instrument.metronome": {
    title: "Still humming?",
    body: "Tracks time since the latest block or slot.",
  },
  "instrument.atmosphere": {
    title: "Fee weather",
    body: "How busy or pricey the network feels right now: mempool mist, fee tide, jets, or funding.",
  },
  "instrument.sigil": {
    title: "Tip face",
    body: "A visual fingerprint of the latest block hash. New tip, new doodle or tape.",
  },
  "instrument.issuance": {
    title: "Issuance",
    body: "Supply / reward story for this chain: halvings, burns, inflation, or volume spray.",
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
    body: "Open this chain’s board: same layout idea, different dials.",
  },
  "suite.pulse": {
    title: "Suite pulse",
    body: "A quick tip and fee peek across every chain.",
  },
  "metric.pin": {
    title: "Pin",
    body: "Keep this metric on your favorites strip so it stays at the top of the board.",
  },
  "metric.row": {
    title: "Metric",
    body: "Tap for a short definition and where the number comes from.",
  },
  "share.bar": {
    title: "Share",
    body: "Copy a link or post a reading to X / Nostr without leaving the board.",
  },
  "tip.jar": {
    title: "Tip jar",
    body: "Optional Lightning tip when an address is configured. Totally voluntary. Boards stay free either way.",
  },
  "settings.newbie": {
    title: "Label tips",
    body: "When on, hover or focus labels to get short explanations.",
  },
  "settings.terms": {
    title: "Term hints",
    body: "Shows the glossary section under Ethereum, Solana, and Hyperliquid boards.",
  },
  "settings.toasts": {
    title: "Block toasts",
    body: "Little popups when a new block or slot lands while you’re watching.",
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
    body: "Used for shortcuts like Open board from the suite home when a default is needed.",
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
      body: "Time since the latest slot. Amber means slots look quieter than Solana’s usual pace (or the feed is a little behind).",
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
