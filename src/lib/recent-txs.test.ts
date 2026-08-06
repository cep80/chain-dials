import { describe, expect, it } from "vitest";
import {
  mergeRecentTxs,
  parseWsField,
  pruneRecentTxs,
  RECENT_TX_MAX_AGE_MS,
} from "./recent-txs";

const raw = (id: string, fee = 1000, vsize = 200, value = 50_000) => ({
  txid: id,
  fee,
  vsize,
  value,
});

describe("mergeRecentTxs realtime sample", () => {
  it("marks brand-new txs fresh and keeps feeRate", () => {
    const now = 1_000_000;
    const next = mergeRecentTxs([], [raw("a", 400, 200)], now);
    expect(next).toHaveLength(1);
    expect(next[0]!.fresh).toBe(true);
    expect(next[0]!.feeRate).toBe(2);
    expect(next[0]!.seenAt).toBe(now);
  });

  it("preserves seenAt and clears fresh on update", () => {
    const t0 = 1_000_000;
    const first = mergeRecentTxs([], [raw("a")], t0);
    const second = mergeRecentTxs(first, [raw("a", 800, 200)], t0 + 5_000);
    expect(second).toHaveLength(1);
    expect(second[0]!.seenAt).toBe(t0);
    expect(second[0]!.fresh).toBe(false);
    expect(second[0]!.feeRate).toBe(4);
  });

  it("ages out txs that left the tip after MAX_AGE", () => {
    const t0 = 1_000_000;
    const held = mergeRecentTxs([], [raw("old"), raw("keep")], t0);
    const later = mergeRecentTxs(
      held,
      [raw("keep"), raw("new")],
      t0 + RECENT_TX_MAX_AGE_MS + 1,
    );
    const ids = later.map((t) => t.txid).sort();
    expect(ids).toEqual(["keep", "new"]);
  });

  it("keeps tip-departed txs briefly so the canvas can fade them", () => {
    const t0 = 1_000_000;
    const held = mergeRecentTxs([], [raw("fade"), raw("stay")], t0);
    const later = mergeRecentTxs(held, [raw("stay")], t0 + 3_000);
    expect(later.map((t) => t.txid).sort()).toEqual(["fade", "stay"]);
  });
});

describe("pruneRecentTxs", () => {
  it("drops mined or removed ids", () => {
    const t0 = 1_000_000;
    const list = mergeRecentTxs([], [raw("a"), raw("b"), raw("c")], t0);
    const next = pruneRecentTxs(list, ["b", "c"]);
    expect(next.map((t) => t.txid)).toEqual(["a"]);
  });
});

describe("parseWsField", () => {
  it("parses stringified JSON and passes objects through", () => {
    expect(parseWsField<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
    expect(parseWsField<{ a: number }>({ a: 2 })).toEqual({ a: 2 });
    expect(parseWsField("nope")).toBeNull();
  });
});
