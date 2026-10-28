import { describe, expect, it } from "vitest";
import { coralBranches, decadeBounds, hashNibbles, logFraction, ribbonSegments } from "./dial-geometry";

const HASH = "00000000000000000001a2f7c4e8b9d6a3f1e0c7b5d4a9f8e2c1b0d3a6f5e4c9";

describe("hashNibbles", () => {
  it("returns 64 digits and keeps every byte", () => {
    const n = hashNibbles(HASH);
    expect(n).toHaveLength(64);
    expect(n.at(-1)).toBe(9);
    expect(hashNibbles("0x" + HASH)).toEqual(n);
  });
});

describe("log scale", () => {
  it("clamps to 0–1 and treats unknown as zero height", () => {
    expect(logFraction(100, 10, 1000)).toBeCloseTo(0.5);
    expect(logFraction(5, 10, 1000)).toBe(0);
    expect(logFraction(Number.NaN, 10, 1000)).toBe(0);
    expect(logFraction(1e6, 10, 1000)).toBe(1);
  });
  it("finds decade bounds around samples", () => {
    expect(decadeBounds([120, 1400])).toEqual({ min: 100, max: 10000 });
    expect(decadeBounds([100])).toEqual({ min: 100, max: 1000 });
    expect(decadeBounds([])).toEqual({ min: 1, max: 10 });
  });
});

describe("ribbonSegments", () => {
  it("is deterministic and differs between hashes", () => {
    const a = ribbonSegments(HASH).map((s) => s.d).join();
    expect(ribbonSegments(HASH).map((s) => s.d).join()).toBe(a);
    expect(ribbonSegments(HASH.replace(/9$/, "8")).map((s) => s.d).join()).not.toBe(a);
    expect(ribbonSegments(HASH)).toHaveLength(64);
  });
});

describe("coralBranches", () => {
  const colonies = [{ x: 100, y: 170, lean: 0, size: 30 }];
  it("keeps the same shape and grows taller with the reading", () => {
    const low = coralBranches(0.2, colonies);
    const high = coralBranches(0.9, colonies);
    expect(low).toHaveLength(high.length);
    expect(coralBranches(0.2, colonies)).toEqual(low);
    const top = (b: typeof low) => Math.min(...b.map((s) => s.y2));
    expect(top(high)).toBeLessThan(top(low));
  });
});
