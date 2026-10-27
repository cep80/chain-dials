import { describe, expect, it } from "vitest";
import { allowSoftFilters, bezelTickCount, keyLight, LIGHT_RIG, resolveQualityTier } from "./dial-light";

describe("dial light rig", () => {
  it("exposes one key light for every lit surface", () => {
    expect(keyLight()).toEqual({ cx: "40%", cy: "30%" });
    expect(LIGHT_RIG.rim).toEqual({ x1: 0, y1: 0, x2: 1, y2: 1 });
  });

  it("treats coarse pointers and tiny memory as the mobile tier", () => {
    expect(resolveQualityTier({ coarsePointer: true })).toBe("mobile");
    expect(resolveQualityTier({ coarsePointer: false, deviceMemoryGb: 2 })).toBe("mobile");
    expect(resolveQualityTier({ coarsePointer: false, deviceMemoryGb: 8 })).toBe("desktop");
    expect(resolveQualityTier({ coarsePointer: false, deviceMemoryGb: null })).toBe("desktop");
  });

  it("halves bezel ticks on mobile while keeping major marks on multiples of four", () => {
    expect(bezelTickCount(64, "desktop")).toBe(64);
    expect(bezelTickCount(64, "mobile")).toBe(32);
    expect(bezelTickCount(72, "mobile")).toBe(36);
    expect(bezelTickCount(48, "mobile")).toBe(24);
    expect(bezelTickCount(20, "mobile")).toBe(16);
    expect(bezelTickCount(1, "desktop")).toBe(4);
  });

  it("drops soft blur filters on mobile only", () => {
    expect(allowSoftFilters("desktop")).toBe(true);
    expect(allowSoftFilters("mobile")).toBe(false);
  });
});
