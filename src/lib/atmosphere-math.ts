/** Pure mempool-atmosphere mapping. Keeps the mist honest to fee + vsize. */

import { clamp } from "@/lib/viz-scale";

export type FeeLadder = {
  fastest: number | null;
  half: number | null;
  hour: number | null;
  economy: number | null;
};

/** 0 = economy floor … 3 = next-block / fastest. */
export function feeBand(feeRate: number, fees: FeeLadder): number {
  const { fastest, half, hour, economy } = fees;
  if (fastest != null && feeRate >= fastest) return 3;
  if (half != null && feeRate >= half) return 2;
  if (hour != null && feeRate >= hour) return 1;
  if (economy != null && feeRate >= economy) return 0;
  return 0;
}

/**
 * Map fee rate → canvas Y. High fees float near the top (log scale between
 * economy and fastest so quiet mempools still use the full column).
 */
export function altitudeY(
  feeRate: number,
  h: number,
  fees: Pick<FeeLadder, "fastest" | "economy">,
): number {
  const top = fees.fastest ?? Math.max(feeRate, 10);
  const bottom = Math.max(0.1, fees.economy ?? 1);
  const lo = Math.log10(bottom);
  const hi = Math.log10(Math.max(top, bottom * 1.01));
  const t = clamp(
    (Math.log10(Math.max(feeRate, 0.1)) - lo) / (hi - lo || 1),
    0,
    1,
  );
  return (1 - t) * (h * 0.88) + h * 0.06;
}

export type HistLayer = {
  feeRate: number;
  vsize: number;
  /** 0-1 perceptual weight from sqrt(vsize / max) */
  weight: number;
  band: number;
};

/** Soft volumetric layers from mempool fee_histogram [feeRate, vsize]. */
export function buildHistLayers(
  histogram: [number, number][],
  fees: FeeLadder,
): HistLayer[] {
  if (!histogram.length) return [];
  const usable = histogram.filter(([r, v]) => r > 0 && v > 0);
  if (!usable.length) return [];
  const maxV = Math.max(...usable.map(([, v]) => v));
  return usable.map(([feeRate, vsize]) => ({
    feeRate,
    vsize,
    weight: clamp(Math.sqrt(vsize / maxV), 0.04, 1),
    band: feeBand(feeRate, fees),
  }));
}

/** Pending vsize as block-equivalents (1e6 vB ≈ one full block). */
export function pressureBlocks(mempoolVsize: number | null): number | null {
  if (mempoolVsize == null || !Number.isFinite(mempoolVsize)) return null;
  return mempoolVsize / 1_000_000;
}
