const BASE =
  typeof window === "undefined"
    ? "https://mempool.space/api"
    : "/api/mempool";

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`mempool ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function getText(path: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`mempool ${path} → ${res.status}`);
  return (await res.text()).trim();
}

export interface PricesResponse {
  time: number;
  USD: number;
  EUR?: number;
  GBP?: number;
}

export interface MempoolResponse {
  count: number;
  vsize: number;
  total_fee: number;
  fee_histogram?: [number, number][];
}

export interface RecentMempoolTx {
  txid: string;
  fee: number;
  vsize: number;
  value: number;
}

export interface MempoolBlockProjection {
  blockSize: number;
  blockVSize: number;
  nTx: number;
  totalFees: number;
  medianFee: number;
  feeRange: number[];
}

export interface FeesResponse {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

export interface DifficultyAdjustment {
  progressPercent: number;
  difficultyChange: number;
  estimatedRetargetDate: number;
  remainingBlocks: number;
  remainingTime: number;
  previousRetarget: number;
  nextRetargetHeight: number;
  timeAvg: number;
}

export interface HashrateResponse {
  currentHashrate: number;
  currentDifficulty: number;
}

export interface LightningLatest {
  latest: {
    channel_count: number;
    node_count: number;
    total_capacity: number;
    added: string;
  };
}

export interface TipBlock {
  id: string;
  height: number;
  timestamp: number;
}

export const mempoolRest = {
  prices: () => getJson<PricesResponse>("/v1/prices"),
  mempool: () => getJson<MempoolResponse>("/mempool"),
  recentTxs: () => getJson<RecentMempoolTx[]>("/mempool/recent"),
  mempoolBlocks: () => getJson<MempoolBlockProjection[]>("/v1/fees/mempool-blocks"),
  fees: () => getJson<FeesResponse>("/v1/fees/recommended"),
  difficulty: () => getJson<DifficultyAdjustment>("/v1/difficulty-adjustment"),
  hashrate: () => getJson<HashrateResponse>("/v1/mining/hashrate/3d"),
  lightning: () => getJson<LightningLatest>("/v1/lightning/statistics/latest"),
  tipHeight: async () => Number(await getText("/blocks/tip/height")),
  tipHash: async () => getText("/blocks/tip/hash"),
  recentBlocks: () => getJson<TipBlock[]>("/v1/blocks"),
};
