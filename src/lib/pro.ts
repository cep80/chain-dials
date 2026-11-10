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
    // Grace runs 3 days past the paid period. No known period end means no
    // grace: otherwise a failed renewal would keep Pro indefinitely.
    if (!periodEnd) return false;
    const end =
      typeof periodEnd === "string" ? Date.parse(periodEnd) : periodEnd.getTime();
    return Number.isFinite(end) && end + 3 * 24 * 60 * 60 * 1000 > Date.now();
  }
  return false;
}

/**
 * Pro can come from two places that never write each other's columns: Stripe
 * (pro_status / pro_current_period_end) and the app stores via RevenueCat
 * (store_status / store_period_end). The effective entitlement is whichever
 * is live, preferring Stripe when both are.
 */
export type EntitlementColumns = {
  pro_status: string | null;
  pro_current_period_end: string | null;
  store_status?: string | null;
  store_period_end?: string | null;
};

export const ENTITLEMENT_COLS =
  "pro_status,pro_current_period_end,store_status,store_period_end";

export function effectivePro(p: EntitlementColumns | null | undefined): {
  status: string;
  periodEnd: string | null;
  source: "stripe" | "store" | null;
} {
  if (!p) return { status: "none", periodEnd: null, source: null };
  if (isProActive(p.pro_status, p.pro_current_period_end)) {
    return { status: p.pro_status ?? "none", periodEnd: p.pro_current_period_end, source: "stripe" };
  }
  if (isProActive(p.store_status, p.store_period_end)) {
    return { status: p.store_status ?? "none", periodEnd: p.store_period_end ?? null, source: "store" };
  }
  return { status: p.pro_status ?? "none", periodEnd: p.pro_current_period_end, source: null };
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
/** Yearly plan (STRIPE_PRICE_ID_ANNUAL): about two months free. */
export const PRO_ANNUAL_PRICE_USD = 30;
export const PRO_ANNUAL_PRICE_LABEL = "$30/yr";
