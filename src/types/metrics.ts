export type ConnectionStatus = "connecting" | "connected" | "degraded" | "disconnected";

export type MetricId =
  | "price_usd"
  | "sats_per_dollar"
  | "market_cap"
  | "block_height"
  | "time_since_block"
  | "tip_hash"
  | "mempool_count"
  | "mempool_vsize"
  | "mempool_pressure"
  | "fee_fastest"
  | "fee_half_hour"
  | "fee_hour"
  | "fee_economy"
  | "hashrate"
  | "difficulty"
  | "retarget_progress"
  | "retarget_change"
  | "retarget_blocks"
  | "halving_epoch"
  | "halving_blocks"
  | "halving_date"
  | "halving_progress"
  | "ln_capacity"
  | "ln_nodes"
  | "ln_channels"
  | "money_supply"
  | "pct_issued";

export type ModuleId =
  | "markets"
  | "blockchain"
  | "mempool"
  | "fees"
  | "mining"
  | "halving"
  | "lightning"
  | "supply";

export interface HistoryPoint {
  t: number;
  v: number;
}

export interface MetricValue {
  value: number | null;
  display?: string;
  updatedAt: number | null;
  flash?: "up" | "down" | null;
}

export interface MetricDef {
  id: MetricId;
  module: ModuleId;
  label: string;
  definition: string;
  source: string;
  unit?: string;
  /** Prefer higher = good for delta color; invert for fees etc. */
  higherIsBetter?: boolean;
  format: "usd" | "btc" | "sats" | "integer" | "percent" | "hashrate" | "vsize" | "fee" | "duration" | "date" | "hash" | "eh";
  pinDefault?: boolean;
}

export interface ModuleDef {
  id: ModuleId;
  title: string;
  description: string;
  source: string;
  metricIds: MetricId[];
}

export interface BlockToast {
  height: number;
  foundAt: number;
  id: string;
}

/** Live mempool transaction sample for Atmosphere particles. */
export interface AtmosphereTx {
  txid: string;
  fee: number;
  vsize: number;
  value: number;
  feeRate: number;
  seenAt: number;
  fresh: boolean;
}

export interface MempoolBlockProjection {
  nTx: number;
  medianFee: number;
  totalFees: number;
  blockVSize: number;
  feeRange: number[];
}

export interface LiveSnapshot {
  priceUsd: number | null;
  blockHeight: number | null;
  tipHash: string | null;
  tipTimestamp: number | null;
  mempoolCount: number | null;
  mempoolVsize: number | null;
  mempoolTotalFee: number | null;
  feeFastest: number | null;
  feeHalfHour: number | null;
  feeHour: number | null;
  feeEconomy: number | null;
  feeMinimum: number | null;
  hashrate: number | null;
  difficulty: number | null;
  retargetProgress: number | null;
  retargetChange: number | null;
  retargetBlocks: number | null;
  retargetDate: number | null;
  lnCapacitySats: number | null;
  lnNodes: number | null;
  lnChannels: number | null;
  lnUpdatedAt: number | null;
  recentTxs: AtmosphereTx[];
  /** Fee rate histogram from /mempool: [feeRate, vsize] bins for density viz. */
  feeHistogram: [number, number][];
  mempoolBlocks: MempoolBlockProjection[];
  lastRestAt: number | null;
  lastWsAt: number | null;
}
