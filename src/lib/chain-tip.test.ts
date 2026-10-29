import { describe, expect, it } from "vitest";
import { highestBlock } from "./chain-tip";

describe("highestBlock", () => {
  it("picks the tip from mempool.space's oldest-first init list", () => {
    const blocks = [973596, 973597, 973598, 973599, 973600, 973601, 973602, 973603].map((height) => ({ height, id: `h${height}` }));
    expect(highestBlock(blocks)?.height).toBe(973603);
  });

  it("is order independent and skips malformed entries", () => {
    expect(highestBlock([{ height: 10 }, null, {}, { height: 12 }, { height: 11 }])?.height).toBe(12);
  });

  it("returns null when nothing has a height", () => {
    expect(highestBlock([{}, null])).toBeNull();
  });
});
