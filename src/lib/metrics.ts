import type { MetricDef, MetricId, ModuleDef, ModuleId } from "@/types/metrics";

export const MODULES: ModuleDef[] = [
  {
    id: "markets",
    title: "Markets",
    description: "What a bitcoin costs, roughly",
    source: "mempool.space",
    metricIds: ["price_usd", "sats_per_dollar", "market_cap"],
  },
  {
    id: "blockchain",
    title: "Blockchain",
    description: "Where the tip is, and how long it’s been quiet",
    source: "mempool.space",
    metricIds: ["block_height", "time_since_block", "tip_hash"],
  },
  {
    id: "mempool",
    title: "Mempool",
    description: "Unconfirmed txs hanging out in the lobby",
    source: "mempool.space",
    metricIds: ["mempool_count", "mempool_vsize", "mempool_pressure"],
  },
  {
    id: "fees",
    title: "Fee Estimates",
    description: "What people are paying to get confirmed",
    source: "mempool.space",
    metricIds: ["fee_fastest", "fee_half_hour", "fee_hour", "fee_economy"],
  },
  {
    id: "mining",
    title: "Mining",
    description: "Hashpower and the next difficulty tweak",
    source: "mempool.space",
    metricIds: [
      "hashrate",
      "difficulty",
      "retarget_progress",
      "retarget_change",
      "retarget_blocks",
    ],
  },
  {
    id: "halving",
    title: "Halving",
    description: "When the block reward shrinks next",
    source: "derived",
    metricIds: [
      "halving_epoch",
      "halving_blocks",
      "halving_date",
      "halving_progress",
    ],
  },
  {
    id: "lightning",
    title: "Lightning Network",
    description: "The public payment channels we can see",
    source: "mempool.space",
    metricIds: ["ln_capacity", "ln_nodes", "ln_channels"],
  },
  {
    id: "supply",
    title: "Supply",
    description: "Coins minted so far vs the 21M ceiling",
    source: "derived",
    metricIds: ["money_supply", "pct_issued"],
  },
];

export const METRICS: MetricDef[] = [
  {
    id: "price_usd",
    module: "markets",
    label: "Price",
    definition:
      "Spot price in US dollars, pulled from mempool.space’s aggregated feeds. Not your broker, just a pulse.",
    source: "mempool.space",
    format: "usd",
    higherIsBetter: true,
    pinDefault: true,
  },
  {
    id: "sats_per_dollar",
    module: "markets",
    label: "Sats per Dollar",
    definition:
      "How many satoshis (tiny bits of a bitcoin) one US dollar buys right now. Handy if you think in sats.",
    source: "derived",
    format: "sats",
    higherIsBetter: false,
    pinDefault: true,
  },
  {
    id: "market_cap",
    module: "markets",
    label: "Market Cap",
    definition:
      "Price × coins already issued. A big round number people like to argue about.",
    source: "derived",
    format: "usd",
    higherIsBetter: true,
  },
  {
    id: "block_height",
    module: "blockchain",
    label: "Block Height",
    definition:
      "How many blocks deep the chain is, counting from genesis. The tip’s address in block-space.",
    source: "mempool.space",
    format: "integer",
    higherIsBetter: true,
    pinDefault: true,
  },
  {
    id: "time_since_block",
    module: "blockchain",
    label: "Time Since Last Block",
    definition:
      "How long since the latest block showed up. The network aims for ~10 minutes; sometimes it nips, sometimes it naps.",
    source: "mempool.space",
    format: "duration",
    higherIsBetter: false,
    pinDefault: true,
  },
  {
    id: "tip_hash",
    module: "blockchain",
    label: "Tip Hash",
    definition:
      "The fingerprint of the newest block. Unique, ugly, and very important.",
    source: "mempool.space",
    format: "hash",
  },
  {
    id: "mempool_count",
    module: "mempool",
    label: "Pending Transactions",
    definition:
      "How many unconfirmed transactions are sitting in the mempool we’re watching (the queue before a block).",
    source: "mempool.space",
    format: "integer",
    higherIsBetter: false,
    pinDefault: true,
  },
  {
    id: "mempool_vsize",
    module: "mempool",
    label: "Mempool Size",
    definition:
      "Total virtual size of those waiting transactions. Bigger pile = more stuff competing for the next few blocks.",
    source: "mempool.space",
    format: "vsize",
    higherIsBetter: false,
  },
  {
    id: "mempool_pressure",
    module: "mempool",
    label: "Mempool Pressure",
    definition:
      "Rough fullness vs one full block (~1 MB vsize). Over 100% means there’s a backlog: more waiting than one block can clear.",
    source: "derived",
    format: "percent",
    higherIsBetter: false,
  },
  {
    id: "fee_fastest",
    module: "fees",
    label: "Immediate",
    definition:
      "A fee rate that usually aims for the next block when the mempool isn’t completely nuts.",
    source: "mempool.space",
    format: "fee",
    higherIsBetter: false,
    pinDefault: true,
  },
  {
    id: "fee_half_hour",
    module: "fees",
    label: "Half Hour",
    definition: "Estimated fee if you’re okay waiting around half an hour.",
    source: "mempool.space",
    format: "fee",
    higherIsBetter: false,
  },
  {
    id: "fee_hour",
    module: "fees",
    label: "One Hour",
    definition: "Estimated fee for confirmation in about an hour. No rush energy.",
    source: "mempool.space",
    format: "fee",
    higherIsBetter: false,
  },
  {
    id: "fee_economy",
    module: "fees",
    label: "Economy",
    definition:
      "The patient person’s fee. Fine when you’re not in a hurry and the queue isn’t wild.",
    source: "mempool.space",
    format: "fee",
    higherIsBetter: false,
  },
  {
    id: "hashrate",
    module: "mining",
    label: "Hashrate",
    definition:
      "Guess of how much hashing power is securing the network lately. More heat, more security (and more electricity jokes).",
    source: "mempool.space",
    format: "hashrate",
    higherIsBetter: true,
    pinDefault: true,
  },
  {
    id: "difficulty",
    module: "mining",
    label: "Difficulty",
    definition:
      "How hard it is to find a valid block right now. Bitcoin turns this dial so blocks stay ~10 minutes apart.",
    source: "mempool.space",
    format: "eh",
    higherIsBetter: true,
  },
  {
    id: "retarget_progress",
    module: "mining",
    label: "Retarget Progress",
    definition:
      "How far we are through the current 2016-block stretch before difficulty adjusts again.",
    source: "mempool.space",
    format: "percent",
    higherIsBetter: true,
  },
  {
    id: "retarget_change",
    module: "mining",
    label: "Est. Difficulty Change",
    definition:
      "Best guess for how much difficulty will move at the next retarget. Positive usually means blocks have been coming a bit fast.",
    source: "mempool.space",
    format: "percent",
    higherIsBetter: true,
  },
  {
    id: "retarget_blocks",
    module: "mining",
    label: "Blocks to Retarget",
    definition: "Blocks left until that difficulty tweak.",
    source: "mempool.space",
    format: "integer",
    higherIsBetter: false,
  },
  {
    id: "halving_epoch",
    module: "halving",
    label: "Subsidy Epoch",
    definition:
      "Which reward era we’re in. Epoch 1 started at genesis; every halving opens a new one with half the block subsidy.",
    source: "derived",
    format: "integer",
    higherIsBetter: true,
  },
  {
    id: "halving_blocks",
    module: "halving",
    label: "Blocks to Halving",
    definition:
      "Blocks until the mining reward halves again. The big, slow calendar everyone circles.",
    source: "derived",
    format: "integer",
    higherIsBetter: false,
    pinDefault: true,
  },
  {
    id: "halving_date",
    module: "halving",
    label: "Halving Estimate",
    definition:
      "Rough calendar date if blocks keep averaging ~10 minutes. Nature (and luck) may disagree.",
    source: "derived",
    format: "date",
  },
  {
    id: "halving_progress",
    module: "halving",
    label: "Epoch Progress",
    definition:
      "Percent of the way through this 210,000-block subsidy stretch.",
    source: "derived",
    format: "percent",
    higherIsBetter: true,
  },
  {
    id: "ln_capacity",
    module: "lightning",
    label: "Public Capacity",
    definition:
      "Bitcoin parked in Lightning channels that announce themselves publicly. Private channels stay off this guest list.",
    source: "mempool.space",
    format: "btc",
    higherIsBetter: true,
    pinDefault: true,
  },
  {
    id: "ln_nodes",
    module: "lightning",
    label: "Public Nodes",
    definition: "How many Lightning nodes are visible on the public graph.",
    source: "mempool.space",
    format: "integer",
    higherIsBetter: true,
  },
  {
    id: "ln_channels",
    module: "lightning",
    label: "Public Channels",
    definition: "Publicly announced payment channels. Again: what’s advertised, not every whisper.",
    source: "mempool.space",
    format: "integer",
    higherIsBetter: true,
  },
  {
    id: "money_supply",
    module: "supply",
    label: "Money Supply",
    definition:
      "Total BTC issued as block subsidies up through the current tip. Lost coins still count as “issued.” Sorry.",
    source: "derived",
    format: "btc",
    higherIsBetter: true,
  },
  {
    id: "pct_issued",
    module: "supply",
    label: "Percentage Issued",
    definition:
      "How much of the 21 million hard cap has already been minted. Spoiler: most of it.",
    source: "derived",
    format: "percent",
    higherIsBetter: true,
  },
];

export const METRIC_BY_ID: Record<MetricId, MetricDef> = Object.fromEntries(
  METRICS.map((m) => [m.id, m]),
) as Record<MetricId, MetricDef>;

export const MODULE_BY_ID: Record<ModuleId, ModuleDef> = Object.fromEntries(
  MODULES.map((m) => [m.id, m]),
) as Record<ModuleId, ModuleDef>;

export const DEFAULT_FAVORITES: MetricId[] = METRICS.filter((m) => m.pinDefault).map(
  (m) => m.id,
);

export function metricsForModule(moduleId: ModuleId): MetricDef[] {
  return METRICS.filter((m) => m.module === moduleId);
}
