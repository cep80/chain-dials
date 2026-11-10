import { describe, expect, it } from "vitest";
import { parseWatchInput } from "@/lib/watch/input";

describe("parseWatchInput", () => {
  it("lowercases a txid and rejects junk", () => {
    const txid = "AB".repeat(32);
    expect(parseWatchInput({ kind: "tx", target: ` ${txid} ` })).toEqual({
      ok: true,
      value: { kind: "tx", target: txid.toLowerCase(), label: null, params: {} },
    });
    expect(parseWatchInput({ kind: "tx", target: "abc" }).ok).toBe(false);
  });

  it("normalises addresses and keeps solo hashrate only for solo", () => {
    const addr = "BC1QAR0SRRR7XFKVY5L643LYDNW9RE59GTZZWF5MDQ";
    const solo = parseWatchInput({ kind: "solo", target: addr, ths: 1.2, label: "Bitaxe" });
    expect(solo).toEqual({
      ok: true,
      value: { kind: "solo", target: addr.toLowerCase(), label: "Bitaxe", params: { ths: 1.2 } },
    });
    const wallet = parseWatchInput({ kind: "address", target: addr, ths: 5 });
    expect(wallet.ok && wallet.value.params).toEqual({});
    expect(parseWatchInput({ kind: "address", target: "not-an-address" }).ok).toBe(false);
  });

  it("rejects unknown kinds and silly hashrates", () => {
    expect(parseWatchInput({ kind: "price", target: "x" }).ok).toBe(false);
    expect(parseWatchInput({ kind: "solo", target: "1BoatSLRHtKNngkdXEeobR76b53LETtpyT", ths: -1 }).ok).toBe(false);
  });
});
