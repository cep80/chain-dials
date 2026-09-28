import { describe, expect, it } from "vitest";
import { readingFreshness } from "@/lib/data/freshness";

describe("reading freshness", () => {
  it("distinguishes no reading, loading, live, stale and failed refresh", () => {
    const base = { now: 10_000, staleMs: 1000 };
    expect(readingFreshness({ ...base, updatedAt: null })).toBe("unavailable");
    expect(readingFreshness({ ...base, updatedAt: null, loading: true })).toBe("loading");
    expect(readingFreshness({ ...base, updatedAt: 9500 })).toBe("live");
    expect(readingFreshness({ ...base, updatedAt: 9000 })).toBe("stale");
    expect(readingFreshness({ ...base, updatedAt: 9500, error: "Offline" })).toBe("stale");
    expect(readingFreshness({ ...base, updatedAt: Infinity })).toBe("unavailable");
  });
});
