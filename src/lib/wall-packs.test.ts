import { describe, expect, it } from "vitest";
import {
  activeSlotIndex,
  defaultWallPack,
  normalizeWallPack,
  wallPackBoardHref,
} from "@/lib/wall-packs";

describe("wall packs", () => {
  it("default pack covers the suite", () => {
    const pack = defaultWallPack(0);
    expect(pack.slots.length).toBe(4);
    expect(pack.slots.map((s) => s.chainId)).toEqual([
      "btc",
      "eth",
      "sol",
      "hype",
    ]);
  });

  it("normalizes and clamps rotate seconds", () => {
    const pack = normalizeWallPack({
      id: "x",
      name: "Test",
      slots: [{ chainId: "btc" }, { chainId: "nope" }],
      rotateSeconds: 3,
    });
    expect(pack).not.toBeNull();
    expect(pack!.slots).toHaveLength(1);
    expect(pack!.rotateSeconds).toBe(10);
  });

  it("rotates slot index by elapsed time", () => {
    const pack = defaultWallPack(0);
    pack.rotateSeconds = 30;
    expect(activeSlotIndex(pack, 0, 0)).toBe(0);
    expect(activeSlotIndex(pack, 30_000, 0)).toBe(1);
    expect(activeSlotIndex(pack, 90_000, 0)).toBe(3);
  });

  it("builds board href for wall vs instrument", () => {
    expect(wallPackBoardHref({ chainId: "btc", instrument: null })).toBe(
      "/btc/wall",
    );
    expect(
      wallPackBoardHref({ chainId: "eth", instrument: "atmosphere" }),
    ).toBe("/eth?i=atmosphere");
  });
});
