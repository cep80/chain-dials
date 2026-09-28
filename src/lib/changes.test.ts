import { describe, expect, it } from "vitest";
import { compareVisits, parseVisitReading, type VisitReading } from "@/lib/changes";

const base: VisitReading = { at: 1000, fee: 10, pending: 1000, price: 100, regime: "calm", wallets: [] };
describe("visit comparisons", () => {
  it("reports meaningful changes and links them to the correct chain", () => {
    const changes = compareVisits(base, { ...base, fee: 15, pending: 700, price: 103, regime: "stressed" }, "hype", "gwei", "HYPE");
    expect(changes.map((change) => change.id)).toEqual(["fee", "pending", "price", "regime"]);
    expect(changes[0]!.href).toBe("/hype?i=atmosphere");
    expect(changes[3]!.detail).toBe("calm → stressed");
  });
  it("ignores noise, missing values, and unchanged data", () => {
    expect(compareVisits(base, { ...base, fee: 11, pending: null, price: 101 }, "eth", "gwei", "ETH")).toEqual([]);
    expect(compareVisits(base, base, "btc", "sat/vB", "BTC")).toEqual([]);
  });
  it("compares only newer wallet readings with chain-aware identity", () => {
    const previous = { ...base, wallets: [{ address: "AbCdEfGh", label: "Wallet", balance: 1, at: 1000 }] };
    const current = { ...base, wallets: [{ address: "abcdefgh", label: "Wallet", balance: 2, at: 2000 }] };
    expect(compareVisits(previous, current, "sol", "lamports", "SOL")).toEqual([]);
    expect(compareVisits(previous, current, "eth", "gwei", "ETH")[0]!.detail).toContain("+1 ETH");
    current.wallets[0]!.at = 500;
    expect(compareVisits(previous, current, "eth", "gwei", "ETH")).toEqual([]);
  });
  it("rejects corrupt storage and sanitizes partial readings", () => {
    expect(parseVisitReading({ at: "bad" })).toBeNull();
    expect(parseVisitReading({ at: 1000, fee: Infinity, wallets: [null] })).toEqual({ at: 1000, fee: null, pending: null, price: null, regime: null, wallets: [] });
  });
});
