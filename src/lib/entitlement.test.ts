import { describe, expect, it } from "vitest";
import { entitledWatches, FREE_WATCH_LIMIT, PRO_WATCH_LIMIT } from "@/lib/entitlement";
import { effectivePro } from "@/lib/pro";

const future = new Date(Date.now() + 86_400_000).toISOString();
const w = (user_id: string, n: number) => ({ id: `${user_id}-${n}`, user_id, created_at: `2026-11-0${n}T00:00:00+00:00` });

describe("entitledWatches", () => {
  it("runs only the oldest watch for a free user", () => {
    const run = entitledWatches([w("free", 3), w("free", 1), w("free", 2)], [
      { user_id: "free", pro_status: "none", pro_current_period_end: null },
    ]);
    expect(run.map((x) => x.id)).toEqual(["free-1"]);
    expect(FREE_WATCH_LIMIT).toBe(1);
  });

  it("runs up to the Pro limit, from either billing source", () => {
    const many = Array.from({ length: PRO_WATCH_LIMIT + 2 }, (_, i) => ({
      id: `p${i}`,
      user_id: "store",
      created_at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
    }));
    const run = entitledWatches(many, [
      { user_id: "store", pro_status: "canceled", pro_current_period_end: null, store_status: "active", store_period_end: future },
    ]);
    expect(run).toHaveLength(PRO_WATCH_LIMIT);
  });

  it("treats a user with no profile as free", () => {
    expect(entitledWatches([w("ghost", 1), w("ghost", 2)], [])).toHaveLength(1);
  });
});

describe("effectivePro", () => {
  it("prefers a live Stripe subscription, then a live store one", () => {
    expect(effectivePro({ pro_status: "active", pro_current_period_end: future, store_status: "active", store_period_end: future }).source).toBe("stripe");
    expect(effectivePro({ pro_status: "canceled", pro_current_period_end: null, store_status: "active", store_period_end: future })).toMatchObject({ source: "store", status: "active" });
    expect(effectivePro({ pro_status: "none", pro_current_period_end: null, store_status: "canceled", store_period_end: null }).source).toBeNull();
    expect(effectivePro(null).status).toBe("none");
  });
});
