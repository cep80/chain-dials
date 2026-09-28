import type { WalletHolding } from "@/lib/wallet/types";

export const WALLET_HOLDINGS_CAP = 8;

/** Convert a token raw integer string into a JS number without overflowing first. */
export function tokenAmountFromRaw(raw: string, decimals: number): number {
  const d = Number.isFinite(decimals)
    ? Math.min(Math.max(Math.trunc(decimals), 0), 18)
    : 18;
  try {
    const wei = BigInt(raw);
    const base = BigInt(10) ** BigInt(d);
    const whole = wei / base;
    const frac = wei % base;
    const n = Number(whole) + Number(frac) / 10 ** d;
    return Number.isFinite(n) ? n : 0;
  } catch {
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }
}

/** Prefer priced bags, then size. Drops zero / non-finite / absurd dust. */
export function rankHoldings(
  rows: WalletHolding[],
  cap = WALLET_HOLDINGS_CAP,
): WalletHolding[] {
  const cleaned = rows.filter(
    (h) =>
      Number.isFinite(h.amount) &&
      h.amount > 0 &&
      h.amount < 1e15 &&
      h.symbol.trim().length > 0,
  );
  cleaned.sort(
    (a, b) => (b.usd ?? -1) - (a.usd ?? -1) || b.amount - a.amount,
  );
  const priced = cleaned.filter((h) => h.usd != null && h.usd > 0.01);
  const rest = cleaned.filter((h) => h.usd == null || h.usd <= 0.01);
  return [...priced, ...rest].slice(0, cap);
}
