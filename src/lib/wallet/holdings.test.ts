import { describe, expect, it } from "vitest";
import { rankHoldings, tokenAmountFromRaw } from "@/lib/wallet/holdings";

describe("tokenAmountFromRaw", () => {
  it("splits whole and fraction so huge integers stay finite", () => {
    expect(tokenAmountFromRaw("1000000000000000000", 18)).toBe(1);
    expect(tokenAmountFromRaw("123450000", 6)).toBeCloseTo(123.45);
  });

  it("treats junk as zero", () => {
    expect(tokenAmountFromRaw("nope", 18)).toBe(0);
  });
});

describe("rankHoldings", () => {
  it("prefers priced tokens and caps the list", () => {
    const ranked = rankHoldings(
      [
        { symbol: "DUST", amount: 1, usd: null },
        { symbol: "USDC", amount: 20, usd: 20 },
        { symbol: "WETH", amount: 1, usd: 2500 },
        { symbol: "NOUSD", amount: 500, usd: null },
        { symbol: "ZERO", amount: 0, usd: 1 },
      ],
      3,
    );
    expect(ranked.map((h) => h.symbol)).toEqual(["WETH", "USDC", "NOUSD"]);
  });
});
