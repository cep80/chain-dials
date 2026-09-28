import { describe, expect, it } from "vitest";
import { composeWalletTweet } from "@/lib/share/compose";

describe("composeWalletTweet", () => {
  it("deep-links an address and keeps the reading short", () => {
    const payload = composeWalletTweet({
      chainId: "btc",
      address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      reading: "57.4328 BTC",
    });
    expect(payload.url).toContain("/btc/wallet?a=1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
    expect(payload.text).toContain("BTC · public address");
    expect(payload.text).toContain("57.4328 BTC");
    expect(payload.text).toContain("1A1zP1eP5Q");
  });
});
