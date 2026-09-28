import type { OhlcCandle, PricePoint } from "@/lib/price/types";

function ordered<T extends { t: number }>(rows: T[]): T[] {
  return [...new Map(rows.filter((row) => Number.isFinite(row.t)).map((row) => [row.t, row])).values()].sort((a, b) => a.t - b.t);
}

export function chartPoints(rows: PricePoint[]): PricePoint[] {
  return ordered(rows.filter((row) => Number.isFinite(row.price) && row.price > 0));
}

export function chartCandles(rows: OhlcCandle[]): OhlcCandle[] {
  return ordered(rows.filter((row) => [row.o, row.h, row.l, row.c].every((value) => Number.isFinite(value) && value > 0) && row.h >= Math.max(row.o, row.c) && row.l <= Math.min(row.o, row.c)));
}

/** Infer ordinary sample spacing; gaps over three intervals remain unconnected. */
export function sampleInterval(rows: { t: number }[]): number {
  const deltas = rows.slice(1).map((row, i) => row.t - rows[i]!.t).filter((delta) => delta > 0).sort((a, b) => a - b);
  return deltas[Math.floor((deltas.length - 1) / 2)] ?? 0;
}

export function seriesSegments<T extends { t: number }>(rows: T[]): T[][] {
  const interval = sampleInterval(rows);
  const segments: T[][] = [];
  rows.forEach((row, i) => {
    if (i === 0 || (interval > 0 && row.t - rows[i - 1]!.t > interval * 3)) segments.push([]);
    segments[segments.length - 1]!.push(row);
  });
  return segments;
}

export function nearestSample(rows: { t: number }[], timestamp: number): number {
  if (!rows.length) return 0;
  let lo = 0;
  let hi = rows.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (rows[mid]!.t < timestamp) lo = mid + 1;
    else hi = mid;
  }
  return lo > 0 && timestamp - rows[lo - 1]!.t <= rows[lo]!.t - timestamp ? lo - 1 : lo;
}
