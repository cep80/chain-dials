/** Free chart ranges; Pro unlocks the rest. Re-export for convenience. */
export { FREE_PRICE_RANGES } from "@/lib/price/types";

export type ProStatus =
  | "none"
  | "active"
  | "past_due"
  | "canceled"
  | "trialing";

/**
 * Server-side Pro gate. `PRO_FORCE=true` only works outside production
 * (never use NEXT_PUBLIC_* for API entitlement).
 */
export function isProActive(
  status: string | null | undefined,
  periodEnd?: Date | string | null,
): boolean {
  if (
    process.env.PRO_FORCE === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    return true;
  }
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
 * Client UI demo unlock only. Does not grant API access.
 * Prefer session.user.pro for real entitlement.
 */
export function isProEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PRO_FORCE === "true";
}

/** Display only — keep Stripe Price amount in Dashboard in sync. */
export const PRO_PRICE_USD = 3;
export const PRO_PRICE_LABEL = "$3/mo";
