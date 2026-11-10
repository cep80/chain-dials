import { describe, expect, it } from "vitest";
import { isAppUserId, storeEntitlement } from "@/lib/revenuecat";

type Subscriber = Parameters<typeof storeEntitlement>[0];

const NOW = Date.UTC(2026, 10, 10);
const later = new Date(NOW + 86_400_000).toISOString();
const earlier = new Date(NOW - 86_400_000).toISOString();

const sub = (
  ent: { expires_date?: string | null; grace_period_expires_date?: string | null },
  subs: Record<string, { billing_issues_detected_at?: string | null }> = {},
): Subscriber => ({
  subscriber: { entitlements: { pro: { product_identifier: "pro_monthly", ...ent } }, subscriptions: subs },
});

describe("storeEntitlement", () => {
  it("is active until the entitlement expires", () => {
    expect(storeEntitlement(sub({ expires_date: later }), NOW)).toEqual({ store_status: "active", store_period_end: later });
  });

  it("is canceled once expired", () => {
    expect(storeEntitlement(sub({ expires_date: earlier }), NOW).store_status).toBe("canceled");
  });

  it("marks billing trouble as past_due", () => {
    const s = sub({ expires_date: earlier }, { pro_monthly: { billing_issues_detected_at: earlier } });
    expect(storeEntitlement(s, NOW)).toEqual({ store_status: "past_due", store_period_end: earlier });
  });

  it("uses the store grace period when there is one", () => {
    expect(storeEntitlement(sub({ expires_date: earlier, grace_period_expires_date: later }), NOW).store_status).toBe("active");
  });

  it("is none without the entitlement, active for lifetime grants", () => {
    expect(storeEntitlement({ subscriber: { entitlements: {} } }, NOW).store_status).toBe("none");
    expect(storeEntitlement(sub({ expires_date: null }), NOW)).toEqual({ store_status: "active", store_period_end: null });
  });
});

describe("isAppUserId", () => {
  it("only accepts our account ids, not RevenueCat anonymous ids", () => {
    expect(isAppUserId("0b6e7a8c-1f2d-4c3b-9a8e-7d6c5b4a3f21")).toBe(true);
    expect(isAppUserId("$RCAnonymousID:abc")).toBe(false);
    expect(isAppUserId(undefined)).toBe(false);
  });
});
