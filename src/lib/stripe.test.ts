import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { pickEntitlementSubscription, subscriptionPeriodEndSec } from "@/lib/stripe";

function sub(
  id: string,
  status: Stripe.Subscription.Status,
  created: number,
  periodEnds: number[] = [],
): Stripe.Subscription {
  return {
    id,
    status,
    created,
    items: { data: periodEnds.map((end) => ({ current_period_end: end })) },
  } as unknown as Stripe.Subscription;
}

describe("subscriptionPeriodEndSec", () => {
  it("reads the period end from subscription items", () => {
    expect(subscriptionPeriodEndSec(sub("a", "active", 1, [100, 300, 200]))).toBe(300);
  });

  it("falls back to the legacy top-level field", () => {
    const legacy = { ...sub("a", "active", 1), current_period_end: 500 } as Stripe.Subscription;
    expect(subscriptionPeriodEndSec(legacy)).toBe(500);
  });

  it("returns null when Stripe sent no period", () => {
    expect(subscriptionPeriodEndSec(sub("a", "active", 1))).toBeNull();
  });
});

describe("pickEntitlementSubscription", () => {
  it("keeps a live subscription over a newer canceled one", () => {
    const winner = pickEntitlementSubscription([
      sub("old", "active", 10),
      sub("new", "canceled", 20),
    ]);
    expect(winner?.id).toBe("old");
  });

  it("prefers active over past_due and incomplete", () => {
    const winner = pickEntitlementSubscription([
      sub("due", "past_due", 30),
      sub("live", "active", 10),
      sub("inc", "incomplete", 40),
    ]);
    expect(winner?.id).toBe("live");
  });

  it("falls back to the newest when nothing is live", () => {
    const winner = pickEntitlementSubscription([
      sub("a", "canceled", 10),
      sub("b", "incomplete_expired", 30),
      sub("c", "canceled", 20),
    ]);
    expect(winner?.id).toBe("b");
  });

  it("returns null with no subscriptions", () => {
    expect(pickEntitlementSubscription([])).toBeNull();
  });
});
