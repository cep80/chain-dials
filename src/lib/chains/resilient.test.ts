import { describe, expect, it, vi } from "vitest";
import { withRetryAndStale } from "./resilient";

const key = () => `k-${Math.random()}`;

describe("withRetryAndStale", () => {
  it("returns fresh data without retrying when the first call works", async () => {
    const load = vi.fn().mockResolvedValue({ height: 1 });
    const r = await withRetryAndStale(key(), load);
    expect(r).toMatchObject({ stale: false, ageMs: 0 });
    expect(load).toHaveBeenCalledTimes(1);
  });

  // The failure this exists for: one upstream blink used to surface as a 502.
  it("absorbs a single transient failure", async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("upstream blip"))
      .mockResolvedValue({ height: 2 });
    const r = await withRetryAndStale(key(), load, { retryDelayMs: 1 });
    expect(r.data).toEqual({ height: 2 });
    expect(r.stale).toBe(false);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("serves the last good value when every attempt fails", async () => {
    const k = key();
    await withRetryAndStale(k, vi.fn().mockResolvedValue({ height: 3 }));

    const failing = vi.fn().mockRejectedValue(new Error("down"));
    const r = await withRetryAndStale(k, failing, { retryDelayMs: 1 });
    expect(r.data).toEqual({ height: 3 });
    expect(r.stale).toBe(true);
    expect(failing).toHaveBeenCalledTimes(2);
  });

  // Stale is a cushion, not a store: past the window the caller must see the
  // error rather than a value old enough to mislead.
  it("stops serving stale data once it is too old", async () => {
    const k = key();
    await withRetryAndStale(k, vi.fn().mockResolvedValue({ height: 4 }));
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 120_000);
    await expect(
      withRetryAndStale(k, vi.fn().mockRejectedValue(new Error("down")), {
        retries: 0,
        maxStaleMs: 60_000,
      }),
    ).rejects.toThrow("down");
    vi.useRealTimers();
  });

  it("keeps chains separate", async () => {
    const a = key();
    const b = key();
    await withRetryAndStale(a, vi.fn().mockResolvedValue("eth"));
    await withRetryAndStale(b, vi.fn().mockResolvedValue("sol"));
    const r = await withRetryAndStale(a, vi.fn().mockRejectedValue(new Error("x")), {
      retryDelayMs: 1,
    });
    expect(r.data).toBe("eth");
  });
});
