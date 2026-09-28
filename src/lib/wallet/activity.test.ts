import { describe, expect, it } from "vitest";
import { activityCsv, activityStatus, filterActivity } from "@/lib/wallet/activity";
import type { WalletTx } from "@/lib/wallet/types";

const tx = (patch: Partial<WalletTx>): WalletTx => ({
  id: "tx-1", kind: "tx", confirmed: true, at: null, height: null,
  valueNative: null, feeNative: null, counterparty: null, label: null, ...patch,
});

describe("wallet activity", () => {
  it("filters signed transfers without treating fills or unknown values as incoming", () => {
    const incoming = tx({ valueNative: 2 });
    const outgoing = tx({ valueNative: -1 });
    const rows = [incoming, outgoing, tx({}), tx({ valueNative: 0 }), tx({ kind: "fill", valueNative: 100 })];
    expect(filterActivity(rows, "incoming", "")).toEqual([incoming]);
    expect(filterActivity(rows, "outgoing", "")).toEqual([outgoing]);
  });

  it("combines pending status with case-insensitive text search", () => {
    const pending = tx({ confirmed: false, counterparty: "AbCd" });
    expect(filterActivity([pending, tx({ counterparty: "AbCd" }), tx({ confirmed: null })], "pending", " ABC ")).toEqual([pending]);
    expect(filterActivity([pending], "all", "missing")).toEqual([]);
  });

  it("does not label failed or unknown non-Bitcoin activity as pending", () => {
    expect(activityStatus(tx({ confirmed: false }), "sol")).toBe("Not confirmed");
    expect(activityStatus(tx({ confirmed: false }), "btc")).toBe("Pending");
    expect(activityStatus(tx({ confirmed: null }), "btc")).toBe("Unknown");
  });

  it("exports UTC dates, signed numbers, quoted text and neutralizes formulas", () => {
    const csv = activityCsv([tx({ at: 0, valueNative: -2, counterparty: '=HYPERLINK("bad")', label: 'a,b\n"c"' })], "btc", "BTC");
    expect(csv).toContain('"1970-01-01T00:00:00.000Z"');
    expect(csv).toContain('"-2","BTC"');
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"a,b\n""c"""');
  });

  it("labels fills as USD notional and tolerates missing timestamps", () => {
    const csv = activityCsv([tx({ kind: "fill", valueNative: 25 })], "hype", "HYPE");
    expect(csv).toContain('"25","USD notional"');
    expect(csv.split("\r\n")).toHaveLength(2);
  });
});
