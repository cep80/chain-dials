import { describe, expect, it } from "vitest";
import {
  deskPackToMarkdown,
  emptyDeskPack,
  normalizeDeskPack,
} from "@/lib/forensics/desk-pack";

describe("forensics desk pack", () => {
  it("normalizes txs and addresses", () => {
    const desk = normalizeDeskPack({
      name: "Case A",
      txs: [{ txid: "abcdef0123456789" }, { txid: "xx" }],
      addresses: [{ address: "bc1qtest", label: "hot" }],
      summary: "watch this",
    });
    expect(desk).not.toBeNull();
    expect(desk!.txs).toHaveLength(1);
    expect(desk!.addresses[0]!.label).toBe("hot");
  });

  it("exports markdown with shipped content", () => {
    const desk = emptyDeskPack(1);
    desk.name = "Export me";
    desk.txs = [{ txid: "abcdef0123456789", feeRate: 12 }];
    desk.summary = "notes here";
    const md = deskPackToMarkdown(desk);
    expect(md).toContain("# Export me");
    expect(md).toContain("abcdef0123456789");
    expect(md).toContain("notes here");
    expect(md).toContain("Chain Dials forensics desk pack");
  });
});
