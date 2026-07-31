import { fetchTip, type TipSnapshot } from "@/lib/chains/fetch";
import type { ChainId } from "@/lib/chains/types";
import type { AtmosphereTx } from "@/types/metrics";

export interface ChainSnapshot {
  tip: TipSnapshot;
  feeFastest: number | null;
  feeHalfHour: number | null;
  feeHour: number | null;
  feeEconomy: number | null;
  /**
   * ETH: EIP-1559 base fee series (gwei), newest last.
   * HYPE: hourly HYPE perp funding (bps), newest last.
   * SOL: recent prioritization fee samples.
   */
  baseFeeSeries: number[];
  /** Priority tip series (gwei), newest last */
  prioritySeries: number[];
  mempoolCount: number | null;
  mempoolPressure: number | null;
  feeHistogram: [number, number][];
  recentTxs: AtmosphereTx[];
  securityRaw: number | null;
  securityScore: number | null;
  epochProgress: number | null;
  epochBlocksLeft: number | null;
  /**
   * ETH: burn intensity 0-100.
   * SOL: epoch progress 0-100 (basin).
   */
  issuanceProgress: number | null;
  supplyProgress: number | null;
  /** SOL inflation percent; HYPE: 24h notional $B */
  inflationRate: number | null;
  /** ETH: estimated ETH burned in latest block */
  burnEthPerBlock: number | null;
  /** Optional spot seed when suite prices API is down */
  priceUsd?: number | null;
  forgeLabel: string | null;
  source: string;
}

async function jsonRpc(
  url: string,
  method: string,
  params: unknown[] = [],
): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  const body = (await res.json()) as { result?: unknown; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message ?? "RPC error");
  return body.result;
}

function hexToNumber(hex: string): number {
  return Number.parseInt(hex, 16);
}

function weiToGwei(weiHex: string): number {
  return hexToNumber(weiHex) / 1e9;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((p / 100) * sorted.length)),
  );
  return sorted[i]!;
}

function histogramFromFees(fees: number[]): [number, number][] {
  if (!fees.length) return [];
  const max = Math.max(...fees, 1);
  const bins = 12;
  const counts = Array.from({ length: bins }, () => 0);
  for (const f of fees) {
    const idx = Math.min(bins - 1, Math.floor((f / max) * bins));
    counts[idx]! += 1;
  }
  return counts.map((c, i) => {
    const feeRate = ((i + 0.5) / bins) * max;
    return [feeRate, Math.max(1, c * 8)] as [number, number];
  });
}

function feeSamples(fees: number[], prefix: string): AtmosphereTx[] {
  const now = Date.now();
  return fees.slice(0, 24).map((feeRate, i) => ({
    txid: `${prefix}-sample-${i}-${Math.round(feeRate * 1000)}`,
    fee: feeRate,
    vsize: 1,
    value: 0,
    feeRate,
    seenAt: now - i * 400,
    fresh: i < 6,
    kind: "sample" as const,
  }));
}

/** Rough ETH burned in a block: baseFee × gasUsed (30M gas limit × ratio). */
function ethBurnedInBlock(baseGwei: number, gasUsedRatio: number): number {
  const gasLimit = 30_000_000;
  return (baseGwei * 1e9 * gasUsedRatio * gasLimit) / 1e18;
}

/**
 * Return the consensus-layer slot of the canonical beacon head when a public
 * Beacon API is available. Execution block numbers are not consensus slots.
 */
async function fetchEthConsensusSlot(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://ethereum-beacon-api.publicnode.com/eth/v2/beacon/blocks/head",
      {
        headers: { accept: "application/json" },
        next: { revalidate: 0 },
      },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: { message?: { slot?: string | number } };
    };
    const slot = Number(body.data?.message?.slot);
    return Number.isSafeInteger(slot) && slot >= 0 ? slot : null;
  } catch {
    return null;
  }
}

async function fetchEth(tip: TipSnapshot): Promise<ChainSnapshot> {
  const rpc = "https://ethereum.publicnode.com";

  const [feeHistory, consensusSlot] = await Promise.all([
    jsonRpc(rpc, "eth_feeHistory", ["0x18", "latest", [10, 50, 90]]) as Promise<{
      baseFeePerGas?: string[];
      gasUsedRatio?: number[];
      reward?: string[][];
    }>,
    fetchEthConsensusSlot(),
  ]);

  const bases = (feeHistory.baseFeePerGas ?? []).map(weiToGwei);
  const ratios = feeHistory.gasUsedRatio ?? [];
  const rewards = feeHistory.reward ?? [];
  const tips90 = rewards.map((r) => (r[2] ? weiToGwei(r[2]) : 0));
  const tips50 = rewards.map((r) => (r[1] ? weiToGwei(r[1]) : 0));
  const tips10 = rewards.map((r) => (r[0] ? weiToGwei(r[0]) : 0));

  // bases includes next-block estimate as last; executed bases align with ratios
  const executedBases = bases.slice(0, -1);
  const base = executedBases[executedBases.length - 1] ?? bases[bases.length - 1] ?? 0;
  const tipP90 = tips90[tips90.length - 1] ?? 0;
  const tipP50 = tips50[tips50.length - 1] ?? 0;
  const tipP10 = tips10[tips10.length - 1] ?? 0;

  const feeFastest = base + tipP90;
  const feeHalfHour = base + tipP50;
  const feeHour = base + tipP10;
  const feeEconomy = Math.max(base * 0.95, base + tipP10 * 0.5);

  const avgRatio =
    ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0.5;

  const burns = ratios.map((r, i) =>
    ethBurnedInBlock(executedBases[i] ?? base, r),
  );
  let burnEthPerBlock = burns[burns.length - 1] ?? 0;

  const sampleFees = tips90
    .map((t, i) => (executedBases[i] ?? base) + t)
    .filter((n) => n > 0);
  const feeHistogram = histogramFromFees(
    sampleFees.length ? sampleFees : [feeFastest],
  );

  const blockHex =
    tip.height != null ? `0x${tip.height.toString(16)}` : "latest";
  let recentTxs: AtmosphereTx[] = [];
  let mempoolCount: number | null = null;
  try {
    const block = (await jsonRpc(rpc, "eth_getBlockByNumber", [
      blockHex,
      true,
    ])) as {
      transactions?: Array<{
        hash?: string;
        gasPrice?: string;
        maxFeePerGas?: string;
        maxPriorityFeePerGas?: string;
        value?: string;
        gas?: string;
        gasUsed?: string;
        baseFeePerGas?: string;
      }>;
      gasUsed?: string;
      baseFeePerGas?: string;
    } | null;
    const exactGasUsed = block?.gasUsed ? hexToNumber(block.gasUsed) : null;
    const exactBaseGwei = block?.baseFeePerGas
      ? weiToGwei(block.baseFeePerGas)
      : null;
    if (exactGasUsed != null && exactBaseGwei != null) {
      burnEthPerBlock = (exactBaseGwei * exactGasUsed) / 1e9;
    }
    const txs = block?.transactions ?? [];
    mempoolCount = txs.length;
    recentTxs = txs.slice(0, 32).map((tx, i) => {
      const maxFee = tx.maxFeePerGas
        ? weiToGwei(tx.maxFeePerGas)
        : tx.gasPrice
          ? weiToGwei(tx.gasPrice)
          : feeHalfHour;
      const priority = tx.maxPriorityFeePerGas
        ? weiToGwei(tx.maxPriorityFeePerGas)
        : 0;
      return {
        txid: tx.hash ?? `eth-tx-${i}`,
        fee: Math.max(maxFee, base + priority),
        vsize: tx.gas ? hexToNumber(tx.gas) / 1000 : 1,
        value: tx.value ? hexToNumber(tx.value) / 1e18 : 0,
        feeRate: Math.max(maxFee, base + priority),
        seenAt: Date.now() - i * 300,
        fresh: i < 8,
        kind: "tx" as const,
      };
    });
  } catch {
    recentTxs = feeSamples(sampleFees.slice(-16), "eth");
  }

  let securityRaw: number | null = avgRatio * 100;
  let securityScore: number | null = Math.max(0.2, Math.min(1, avgRatio));
  let forgeLabel: string | null = `${(avgRatio * 100).toFixed(0)}% gas used`;
  let source = "eth+fees";

  try {
    const res = await fetch("https://beaconcha.in/api/v1/epoch/latest", {
      headers: { accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (res.ok) {
      const body = (await res.json()) as {
        data?: {
          validatorscount?: number;
          totalvalidatorbalance?: number;
        };
      };
      const v = body.data?.validatorscount ?? null;
      const balGwei = body.data?.totalvalidatorbalance ?? null;
      const stakeEth = balGwei != null ? balGwei / 1e9 : null;
      securityRaw = stakeEth ?? securityRaw;
      securityScore =
        stakeEth != null
          ? Math.max(0.15, Math.min(1, stakeEth / 40_000_000))
          : v != null
            ? Math.max(0.15, Math.min(1, v / 1_200_000))
            : securityScore;
      forgeLabel =
        stakeEth != null
          ? `${(stakeEth / 1e6).toFixed(1)}M ETH staked`
          : v != null
            ? `${v.toLocaleString()} validators`
            : forgeLabel;
      source = "eth+beaconcha.in";
    }
  } catch {
    // keep gas fallback
  }

  let supplyProgress: number | null = null;
  try {
    const res = await fetch("https://ultrasound.money/api/v2/fees/supply", {
      headers: { accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (res.ok) {
      const body = (await res.json()) as { supply?: number };
      if (body.supply != null) {
        supplyProgress = Math.min(99.5, (body.supply / 120_000_000) * 100);
      }
      source = `${source}+ultrasound`;
    }
  } catch {
    // Keep unavailable rather than presenting a fixed supply value as a reading.
  }

  const slotInEpoch = consensusSlot != null ? consensusSlot % 32 : null;
  const epochProgress =
    slotInEpoch != null ? (slotInEpoch / 32) * 100 : null;
  const epochBlocksLeft =
    slotInEpoch != null ? 32 - slotInEpoch : null;
  if (consensusSlot != null) source = `${source}+beacon-slot`;
  // Scale: ~2 ETH burned in an execution block → full flame.
  const issuanceProgress = Math.min(100, (burnEthPerBlock / 2) * 100);

  return {
    tip,
    feeFastest,
    feeHalfHour,
    feeHour,
    feeEconomy,
    baseFeeSeries: executedBases.length ? executedBases : bases,
    prioritySeries: tips50,
    mempoolCount,
    mempoolPressure: avgRatio * 100,
    feeHistogram,
    recentTxs,
    securityRaw,
    securityScore,
    epochProgress,
    epochBlocksLeft,
    issuanceProgress,
    supplyProgress,
    inflationRate: null,
    burnEthPerBlock,
    forgeLabel,
    source,
  };
}

async function fetchSol(tip: TipSnapshot): Promise<ChainSnapshot> {
  const rpc = "https://api.mainnet-beta.solana.com";

  const [feesRaw, epochInfo, voteAccounts, inflation, supply] =
    await Promise.all([
      jsonRpc(rpc, "getRecentPrioritizationFees", []) as Promise<
        Array<{ slot: number; prioritizationFee: number }>
      >,
      jsonRpc(rpc, "getEpochInfo", []) as Promise<{
        slotIndex?: number;
        slotsInEpoch?: number;
      }>,
      jsonRpc(rpc, "getVoteAccounts", []) as Promise<{
        current?: Array<{ activatedStake?: number }>;
        delinquent?: Array<{ activatedStake?: number }>;
      }>,
      jsonRpc(rpc, "getInflationRate", []).catch(() => null) as Promise<{
        total?: number;
      } | null>,
      jsonRpc(rpc, "getSupply", [{ commitment: "confirmed" }]).catch(
        () => null,
      ) as Promise<{
        value?: { total?: number; circulating?: number };
      } | null>,
    ]);

  const fees = (feesRaw ?? [])
    .map((f) => f.prioritizationFee)
    .filter((n) => Number.isFinite(n));
  const nonzero = fees.filter((n) => n > 0).sort((a, b) => a - b);
  const sorted = [...fees].sort((a, b) => a - b);
  const pool =
    nonzero.length > 0
      ? nonzero
      : sorted.length
        ? sorted
        : [0, 0, 500, 1000, 2500];

  const feeFastest = percentile(pool, 90);
  const feeHalfHour = percentile(pool, 50);
  const feeHour = percentile(pool, 25);
  const feeEconomy = percentile(pool, 10);

  const slotIndex = epochInfo.slotIndex ?? 0;
  const slotsInEpoch = epochInfo.slotsInEpoch ?? 432_000;
  const epochProgress = (slotIndex / slotsInEpoch) * 100;
  const epochBlocksLeft = Math.max(0, slotsInEpoch - slotIndex);

  const stakes = [
    ...(voteAccounts.current ?? []),
    ...(voteAccounts.delinquent ?? []),
  ].map((v) => v.activatedStake ?? 0);
  const totalStakeLamports = stakes.reduce((a, b) => a + b, 0);
  const stakeSol = totalStakeLamports / 1e9;
  const securityScore = Math.max(0.15, Math.min(1, stakeSol / 400_000_000));

  let supplyProgress: number | null = null;
  const supplyVal = supply?.value;
  if (supplyVal && typeof supplyVal === "object") {
    const total = supplyVal.total ?? 0;
    const circ = supplyVal.circulating ?? 0;
    if (total > 0) supplyProgress = (circ / total) * 100;
  }

  const inflationPct = inflation?.total != null ? inflation.total * 100 : null;
  const busyShare = nonzero.length / Math.max(1, fees.length);

  return {
    tip,
    feeFastest,
    feeHalfHour,
    feeHour,
    feeEconomy,
    baseFeeSeries: pool.slice(-24),
    prioritySeries: pool.slice(-24),
    mempoolCount: fees.length,
    mempoolPressure: busyShare * 100,
    feeHistogram: histogramFromFees(pool.slice(-80)),
    recentTxs: feeSamples(pool.slice(-24).reverse(), "sol"),
    securityRaw: stakeSol,
    securityScore,
    epochProgress,
    epochBlocksLeft,
    issuanceProgress: epochProgress,
    supplyProgress,
    inflationRate: inflationPct,
    burnEthPerBlock: null,
    forgeLabel:
      stakeSol > 0
        ? `${(stakeSol / 1e6).toFixed(0)}M SOL staked${
            inflationPct != null ? ` · ${inflationPct.toFixed(1)}% infl.` : ""
          }`
        : null,
    source: "solana-rpc",
  };
}

async function fetchHype(tip: TipSnapshot): Promise<ChainSnapshot> {
  const rpc = "https://rpc.hyperliquid.xyz/evm";
  const fundingHistoryStart = Date.now() - 48 * 60 * 60 * 1000;

  const [feeHistory, metaRes, fundingHistRes] = await Promise.all([
    jsonRpc(rpc, "eth_feeHistory", ["0x18", "latest", [10, 50, 90]]) as Promise<{
      baseFeePerGas?: string[];
      gasUsedRatio?: number[];
      reward?: string[][];
    }>,
    fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      next: { revalidate: 0 },
    }),
    fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "fundingHistory",
        coin: "HYPE",
        startTime: fundingHistoryStart,
      }),
      next: { revalidate: 0 },
    }),
  ]);

  const bases = (feeHistory.baseFeePerGas ?? []).map(weiToGwei);
  const ratios = feeHistory.gasUsedRatio ?? [];
  const rewards = feeHistory.reward ?? [];
  const tips90 = rewards.map((r) => (r[2] ? weiToGwei(r[2]) : 0));
  const tips50 = rewards.map((r) => (r[1] ? weiToGwei(r[1]) : 0));
  const tips10 = rewards.map((r) => (r[0] ? weiToGwei(r[0]) : 0));

  const executedBases = bases.slice(0, -1);
  const base =
    executedBases[executedBases.length - 1] ??
    bases[bases.length - 1] ??
    0;
  const tipP90 = tips90[tips90.length - 1] ?? 0;
  const tipP50 = tips50[tips50.length - 1] ?? 0;
  const tipP10 = tips10[tips10.length - 1] ?? 0;

  const feeFastest = base + tipP90;
  const feeHalfHour = base + tipP50;
  const feeHour = base + tipP10;
  const feeEconomy = Math.max(base * 0.95, base + tipP10 * 0.5);

  const avgRatio =
    ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0.35;

  let fundingBps: number[] = [];
  let fundingHistoryBps: number[] = [];
  let recentTxs: AtmosphereTx[] = [];
  let totalOiUsd = 0;
  let dayVlmUsd = 0;
  let marketCount = 0;
  let hypeMark: number | null = null;
  let source = "hyperevm+fees";

  if (fundingHistRes.ok) {
    try {
      const hist = (await fundingHistRes.json()) as Array<{
        fundingRate?: string;
        time?: number;
      }>;
      fundingHistoryBps = hist
        .map((row) => (Number.parseFloat(row.fundingRate ?? "") || 0) * 10_000)
        .filter((v) => Number.isFinite(v));
      if (fundingHistoryBps.length) source = "hyperevm+funding-history";
    } catch {
      // fall back to cross-market snapshot below
    }
  }

  if (metaRes.ok) {
    try {
      const body = (await metaRes.json()) as [
        { universe?: Array<{ name?: string }> },
        Array<{
          funding?: string;
          openInterest?: string;
          markPx?: string;
          dayNtlVlm?: string;
          premium?: string;
        }>,
      ];
      const universe = body[0]?.universe ?? [];
      const ctxs = body[1] ?? [];
      marketCount = universe.length;

      const rows: Array<{
        name: string;
        fundingBps: number;
        oiUsd: number;
        dayVlm: number;
      }> = [];
      for (let i = 0; i < universe.length; i++) {
        const ctx = ctxs[i];
        if (!ctx) continue;
        const name = universe[i]?.name ?? `m${i}`;
        const mark = Number.parseFloat(ctx.markPx ?? "0") || 0;
        const oi = Number.parseFloat(ctx.openInterest ?? "0") || 0;
        const day = Number.parseFloat(ctx.dayNtlVlm ?? "0") || 0;
        const funding = Number.parseFloat(ctx.funding ?? "0") || 0;
        const oiUsd = oi * mark;
        totalOiUsd += oiUsd;
        dayVlmUsd += day;
        if (name === "HYPE" && mark > 0) hypeMark = mark;
        rows.push({
          name,
          fundingBps: funding * 10_000,
          oiUsd,
          dayVlm: day,
        });
      }

      rows.sort((a, b) => b.dayVlm - a.dayVlm);
      const top = rows.slice(0, 24);
      fundingBps = top.map((r) => r.fundingBps);
      recentTxs = top.slice(0, 20).map((r, i) => ({
        txid: `hype-${r.name}`,
        fee: Math.abs(r.fundingBps),
        vsize: 1,
        value: r.oiUsd,
        feeRate: r.fundingBps,
        seenAt: Date.now() - i * 400,
        fresh: i < 6,
        kind: "sample" as const,
      }));
      source = fundingHistoryBps.length
        ? `${source}+info`
        : "hyperevm+info";
    } catch {
      // keep fee-only / history-only
    }
  }

  const seriesForTide = fundingHistoryBps.length
    ? fundingHistoryBps
    : fundingBps;
  const fundingAbs = (
    fundingBps.length ? fundingBps : seriesForTide
  ).map((f) => Math.abs(f));
  const feeHistogram = histogramFromFees(
    fundingAbs.length ? fundingAbs : [Math.abs(feeFastest)],
  );

  // Volume heat: ~$5B day notional → full spray
  const issuanceProgress = Math.min(100, (dayVlmUsd / 5_000_000_000) * 100);
  // Do not substitute an assumed circulating supply when the feed is unavailable.
  let supplyProgress: number | null = null;
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/hyperliquid?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false",
      {
        headers: { accept: "application/json" },
        next: { revalidate: 0 },
      },
    );
    if (res.ok) {
      const body = (await res.json()) as {
        market_data?: {
          circulating_supply?: number;
          max_supply?: number;
        };
      };
      const circ = body.market_data?.circulating_supply;
      const max = body.market_data?.max_supply ?? 1_000_000_000;
      if (circ != null && max > 0) {
        supplyProgress = Math.min(99.5, (circ / max) * 100);
        source = `${source}+cg-supply`;
      }
    }
  } catch {
    // Keep unavailable.
  }

  const securityScore = Math.max(
    0.12,
    Math.min(1, totalOiUsd / 12_000_000_000),
  );
  const forgeLabel =
    totalOiUsd > 0
      ? `$${(totalOiUsd / 1e9).toFixed(1)}B OI · $${(dayVlmUsd / 1e9).toFixed(1)}B/24h`
      : `${(avgRatio * 100).toFixed(0)}% gas used`;

  return {
    tip,
    feeFastest,
    feeHalfHour,
    feeHour,
    feeEconomy,
    baseFeeSeries: seriesForTide.length
      ? seriesForTide
      : executedBases.length
        ? executedBases
        : bases,
    prioritySeries: tips50,
    mempoolCount: marketCount || null,
    mempoolPressure: avgRatio * 100,
    feeHistogram,
    recentTxs:
      recentTxs.length > 0
        ? recentTxs
        : feeSamples(
            (fundingAbs.length ? fundingAbs : tips90).slice(-16),
            "hype",
          ),
    securityRaw: totalOiUsd > 0 ? totalOiUsd : avgRatio * 100,
    securityScore,
    // HyperEVM does not use Ethereum consensus epochs. Leave these unset
    // rather than presenting an arbitrary 32-block window as an epoch.
    epochProgress: null,
    epochBlocksLeft: null,
    issuanceProgress,
    supplyProgress,
    inflationRate: dayVlmUsd > 0 ? dayVlmUsd / 1e9 : null,
    burnEthPerBlock: null,
    priceUsd: hypeMark,
    forgeLabel,
    source,
  };
}

export async function fetchChainSnapshot(
  chain: ChainId,
): Promise<ChainSnapshot> {
  if (chain === "btc") {
    throw new Error("BTC uses mempool store, not suite snapshot");
  }
  const tip = await fetchTip(chain);
  if (chain === "eth") return fetchEth(tip);
  if (chain === "sol") return fetchSol(tip);
  return fetchHype(tip);
}
