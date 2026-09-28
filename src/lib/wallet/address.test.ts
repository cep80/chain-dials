import { describe, expect, it } from "vitest";
import { CHAIN_ORDER, CHAINS } from "@/lib/chains/registry";
import {
  looksLikeSecret,
  normalizeWalletAddress,
} from "@/lib/wallet/address";
import { lamportsToSol, weiToEth } from "@/lib/wallet/lookup";

describe("wallet address normalize", () => {
  it("accepts Bitcoin bech32 and legacy", () => {
    expect(
      normalizeWalletAddress(
        "btc",
        "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      ),
    ).toEqual({
      ok: true,
      address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    });
    expect(
      normalizeWalletAddress("btc", "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"),
    ).toMatchObject({ ok: true });
  });

  it("strips bitcoin: URIs", () => {
    const r = normalizeWalletAddress(
      "btc",
      "bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?amount=1",
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.address).toBe("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq");
    }
  });

  it("accepts EVM addresses on ETH and HYPE", () => {
    const raw = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1";
    const eth = normalizeWalletAddress("eth", raw);
    const hype = normalizeWalletAddress("hype", `ethereum:${raw}`);
    expect(eth).toEqual({ ok: true, address: raw.toLowerCase() });
    expect(hype).toEqual({ ok: true, address: raw.toLowerCase() });
  });

  it("accepts Solana base58 and rejects EVM on SOL", () => {
    const sol = normalizeWalletAddress(
      "sol",
      "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
    );
    expect(sol.ok).toBe(true);
    expect(
      normalizeWalletAddress(
        "sol",
        "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
      ).ok,
    ).toBe(false);
  });

  it("rejects empty, junk, and secrets", () => {
    expect(normalizeWalletAddress("btc", "  ")).toEqual({
      ok: false,
      reason: "empty",
    });
    expect(normalizeWalletAddress("eth", "not-an-address")).toEqual({
      ok: false,
      reason: "shape",
    });
    const seed =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    expect(looksLikeSecret(seed)).toBe(true);
    expect(normalizeWalletAddress("btc", seed)).toEqual({
      ok: false,
      reason: "secret",
    });
    expect(
      looksLikeSecret(
        "xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi",
      ),
    ).toBe(true);
  });

  it("every chain has an address explorer", () => {
    for (const id of CHAIN_ORDER) {
      const url = CHAINS[id].explorerAddress("abc");
      expect(url).toMatch(/^https:\/\//);
      expect(url).toContain("abc");
      expect(CHAINS[id].explorerName.length).toBeGreaterThan(2);
    }
  });
});

describe("wallet unit conversion", () => {
  it("converts wei and lamports", () => {
    expect(weiToEth(BigInt("1000000000000000000"))).toBe(1);
    expect(weiToEth(BigInt(0))).toBe(0);
    expect(lamportsToSol(1_000_000_000)).toBe(1);
  });
});
