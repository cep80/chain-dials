import { describe, expect, it } from "vitest";
import {
  addressTransition,
  formatBtc,
  soloTransition,
  STUCK_AFTER_MS,
  txTransition,
} from "@/lib/watch/transitions";

const TXID = "a".repeat(64);
const HOUR = 3_600_000;
const base = { txid: TXID, tipHeight: 900_000, nextBlockFee: 20, createdAtMs: 0, nowMs: HOUR };

describe("txTransition", () => {
  it("notifies once on the first confirmation, then settles at 3", () => {
    const first = txTransition({}, { found: true, confirmed: true, blockHeight: 900_000 }, base);
    expect(first.notices.map((n) => n.title)).toEqual(["Transaction confirmed"]);
    expect(first.done).toBe(false);

    const again = txTransition(first.state, { found: true, confirmed: true, blockHeight: 900_000 }, { ...base, tipHeight: 900_001 });
    expect(again.notices).toEqual([]);

    const settled = txTransition(again.state, { found: true, confirmed: true, blockHeight: 900_000 }, { ...base, tipHeight: 900_002 });
    expect(settled.notices.map((n) => n.title)).toEqual(["Transaction settled"]);
    expect(settled.done).toBe(true);
  });

  it("goes straight to settled when first seen deep", () => {
    const t = txTransition({}, { found: true, confirmed: true, blockHeight: 899_990 }, base);
    expect(t.notices).toHaveLength(1);
    expect(t.notices[0]!.body).toContain("11 confirmations");
    expect(t.done).toBe(true);
  });

  it("flags a low-fee tx as stuck once, only after 6 hours", () => {
    const pending = { found: true as const, confirmed: false, feeRate: 3 };
    expect(txTransition({}, pending, { ...base, nowMs: STUCK_AFTER_MS - 1 }).notices).toEqual([]);
    const stuck = txTransition({}, pending, { ...base, nowMs: STUCK_AFTER_MS });
    expect(stuck.notices[0]!.title).toBe("Transaction looks stuck");
    expect(stuck.notices[0]!.body).toContain("RBF or CPFP");
    expect(txTransition(stuck.state, pending, { ...base, nowMs: STUCK_AFTER_MS * 2 }).notices).toEqual([]);
  });

  it("does not call a well-paying tx stuck", () => {
    const t = txTransition({}, { found: true, confirmed: false, feeRate: 40 }, { ...base, nowMs: STUCK_AFTER_MS * 2 });
    expect(t.notices).toEqual([]);
  });

  it("reports a seen tx that vanished, and closes", () => {
    const t = txTransition({ seen: true }, { found: false }, base);
    expect(t.notices[0]!.title).toBe("Transaction dropped");
    expect(t.done).toBe(true);
    expect(txTransition({}, { found: false }, base).notices).toEqual([]);
  });

  it("uses the label when there is one", () => {
    const t = txTransition({}, { found: true, confirmed: true, blockHeight: 900_000 }, { ...base, label: "Rent" });
    expect(t.notices[0]!.body).toMatch(/^Rent /);
  });
});

describe("addressTransition", () => {
  const reading = { chainFunded: 100_000, chainSpent: 0, mempoolFunded: 0, mempoolSpent: 0 };
  const ctx = { address: "bc1qexample0000000000000000000000000000" };

  it("baselines silently on the first read", () => {
    const t = addressTransition({}, reading, ctx);
    expect(t.notices).toEqual([]);
    expect(t.state).toEqual({ received: 100_000, sent: 0 });
  });

  it("notifies on a mempool receive and not again when it confirms", () => {
    const seen = addressTransition({ received: 100_000, sent: 0 }, { ...reading, mempoolFunded: 50_000 }, ctx);
    expect(seen.notices).toEqual([{ title: "Wallet received", body: expect.stringContaining("0.0005 BTC") }]);
    const confirmed = addressTransition(seen.state, { ...reading, chainFunded: 150_000 }, ctx);
    expect(confirmed.notices).toEqual([]);
  });

  it("notifies on a spend and re-baselines quietly on eviction", () => {
    const spent = addressTransition({ received: 100_000, sent: 0 }, { ...reading, mempoolSpent: 20_000 }, ctx);
    expect(spent.notices.map((n) => n.title)).toEqual(["Wallet spent"]);
    const evicted = addressTransition(spent.state, reading, ctx);
    expect(evicted.notices).toEqual([]);
    expect(evicted.state.sent).toBe(0);
  });
});

describe("soloTransition", () => {
  const noon = Date.UTC(2026, 10, 10, 12, 30);
  const ctx = {
    address: "bc1qminer000000000000000000000000000000",
    params: { ths: 1.2 },
    nowMs: noon,
    difficulty: 1.2e14,
    networkHashrate: 8e20,
  };

  it("announces a win once per block", () => {
    const won = soloTransition({ lastSummaryDay: "2026-11-10" }, [{ height: 900_001, rewardSats: 315_000_000 }], ctx);
    expect(won.notices.map((n) => n.title)).toEqual(["Your miner found a block"]);
    expect(won.notices[0]!.body).toContain("3.15 BTC");
    expect(soloTransition(won.state, [{ height: 900_001, rewardSats: 315_000_000 }], ctx).notices).toEqual([]);
  });

  it("sends the daily summary once, after noon UTC, only with a hashrate", () => {
    const morning = soloTransition({}, [], { ...ctx, nowMs: Date.UTC(2026, 10, 10, 9) });
    expect(morning.notices).toEqual([]);
    const sent = soloTransition({}, [], ctx);
    expect(sent.notices.map((n) => n.title)).toEqual(["Solo odds today"]);
    expect(soloTransition(sent.state, [], ctx).notices).toEqual([]);
    expect(soloTransition({}, [], { ...ctx, params: {} }).notices).toEqual([]);
  });
});

describe("formatBtc", () => {
  it("trims trailing zeros", () => {
    expect(formatBtc(315_000_000)).toBe("3.15 BTC");
    expect(formatBtc(1)).toBe("0.00000001 BTC");
  });
});
