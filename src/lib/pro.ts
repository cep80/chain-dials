/** Free chart ranges; Pro unlocks the rest. Re-export for convenience. */
export { FREE_PRICE_RANGES } from "@/lib/price/types";

export type ProStatus =
  | "none"
  | "active"
  | "past_due"
  | "canceled"
  | "trialing";

export function isProActive(
  status: string | null | undefined,
  periodEnd?: Date | string | null,
): boolean {
  if (process.env.NEXT_PUBLIC_PRO_FORCE === "true") return true;
  if (status === "active" || status === "trialing") return true;
  if (status === "past_due") {
    if (!periodEnd) return true;
    const end =
      typeof periodEnd === "string" ? Date.parse(periodEnd) : periodEnd.getTime();
    return Number.isFinite(end) && end + 3 * 24 * 60 * 60 * 1000 > Date.now();
  }
  return false;
}

/**
 * @deprecated Prefer session.user.pro from Auth.js.
 * Kept for local demos when NEXT_PUBLIC_PRO_FORCE=true.
 */
export function isProEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PRO_FORCE === "true";
}

export const PRO_PRICE_USD = 6;
export const PRO_PRICE_LABEL = "$6/mo";
