import { describe, expect, it } from "vitest";
import { feePlot, hashRelief } from "./dial-geometry";

describe("dial data geometry", () => {
  it("never fabricates an empty fee trace and preserves gaps", () => {
    expect(feePlot([], 20)).toEqual([]);
    const result = feePlot([0, 5, Number.NaN, 10, -1, 20], 20);
    expect(result).toHaveLength(3);
    expect(result[0].line).toBe("M28,178 L80.8,146.5");
    expect(result[1].line).toBe("M186.4,115");
    expect(result[2].line).toBe("M292,52");
    expect(JSON.stringify(result)).not.toContain("NaN");
  });

  it("keeps zero hash digits and all 64 positions in the block relief", () => {
    const blank = hashRelief("0".repeat(64));
    expect(blank).toHaveLength(64);
    expect(blank.every((cell) => cell.lift === 2 && cell.light === 0)).toBe(true);
    const changed = hashRelief("0x" + "0".repeat(63) + "f");
    expect(changed[63].lift).toBeGreaterThan(blank[63].lift);
    expect(changed).not.toEqual(blank);
    expect(hashRelief("ab".repeat(32))).toEqual(hashRelief("0x" + "ab".repeat(32)));
  });
});
