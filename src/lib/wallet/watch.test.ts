import { describe, expect, it } from "vitest";
import {
  flattenWatched,
  parseWatchMap,
  WALLET_WATCH_CAP,
  normalizeWatchedWallet,
  walletAddressKey,
  sortWatched,
} from "@/lib/wallet/watch";

describe("wallet watchlist", () => {
  it("preserves case-sensitive Base58 identities", () => {
    for (const chain of ["sol", "btc"]) {
      const first = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
      const second = "1a1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
      expect(walletAddressKey(chain, first)).not.toBe(walletAddressKey(chain, second));
      expect(parseWatchMap({ [chain]: [{ address: first }, { address: second }] })[chain]).toHaveLength(2);
    }
  });

  it("matches EVM addresses regardless of checksum casing", () => {
    for (const chain of ["eth", "hype"]) {
      expect(walletAddressKey(chain, "0xAbCd")).toBe(walletAddressKey(chain, "0xabcd"));
    }
  });

  it("normalizes a watched row", () => {
    const row = normalizeWatchedWallet({
      address: "  bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq  ",
      label: "  cold  ",
      addedAt: 10,
      balanceNative: 1.5,
      unit: "BTC",
      fetchedAt: 20,
    });
    expect(row).toMatchObject({
      address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      label: "cold",
      balanceNative: 1.5,
      unit: "BTC",
    });
  });

  it("drops junk and dedupes per chain", () => {
    const map = parseWatchMap({
      btc: [
        { address: "short" },
        {
          address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
          label: "a",
        },
        {
          address: "BC1QAR0SRRR7XFKVY5L643LYDNW9RE59GTZZWF5MDQ",
          label: "b",
        },
        { address: 12 },
      ],
    });
    expect(map.btc).toHaveLength(1);
    expect(map.btc![0]!.label).toBe("a");
  });

  it("caps the list", () => {
    const list = Array.from({ length: WALLET_WATCH_CAP + 5 }, (_, i) => ({
      address: `bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5m${String(i).padStart(2, "0")}`,
    }));
    const map = parseWatchMap({ btc: list });
    expect(map.btc).toHaveLength(WALLET_WATCH_CAP);
  });

  it("flattens in chain order", () => {
    const flat = flattenWatched(
      {
        sol: [
          {
            address: "So11111111111111111111111111111111111111112",
            label: "sol",
            addedAt: 1,
            balanceNative: 1,
            unit: "SOL",
            fetchedAt: 1,
          },
        ],
        btc: [
          {
            address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            label: "gen",
            addedAt: 1,
            balanceNative: 50,
            unit: "BTC",
            fetchedAt: 1,
          },
        ],
      },
      ["btc", "eth", "sol", "hype"],
    );
    expect(flat.map((r) => r.chainId)).toEqual(["btc", "sol"]);
  });

  it("sorts labels, balances and absolute changes without moving unknown balances to the top", () => {
    const rows = parseWatchMap({ eth: [
      { address: "0x1111111111111111111111111111111111111111", label: "Zulu", addedAt: 3, balanceNative: 2, previousBalanceNative: 10 },
      { address: "0x2222222222222222222222222222222222222222", label: "Alpha", addedAt: 2, balanceNative: 20, previousBalanceNative: 19 },
      { address: "0x3333333333333333333333333333333333333333", label: "Beta", addedAt: 1 },
    ] }).eth!;
    expect(sortWatched(rows, "label").map((row) => row.label)).toEqual(["Alpha", "Beta", "Zulu"]);
    expect(sortWatched(rows, "balance").map((row) => row.label)).toEqual(["Alpha", "Zulu", "Beta"]);
    expect(sortWatched(rows, "changed").map((row) => row.label)).toEqual(["Zulu", "Alpha", "Beta"]);
  });
});
