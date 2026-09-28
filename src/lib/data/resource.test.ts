import { afterEach, describe, expect, it, vi } from "vitest";
import { JsonResource } from "@/lib/data/resource";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("shared resources", () => {
  it("aborts on hiding or final unsubscribe and ignores late responses", async () => {
    vi.useFakeTimers();
    const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
    vi.stubGlobal("document", doc);
    const calls: Array<{ signal: AbortSignal; resolve: (value: Response) => void }> = [];
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise<Response>((resolve) => calls.push({ signal: init.signal as AbortSignal, resolve }))));
    const resource = new JsonResource<{ price: number }>("/lifecycle", { staleMs: 1000, pollMs: 1000 });
    const stop = resource.subscribe(() => {});
    await Promise.resolve();
    expect(calls).toHaveLength(1);
    doc.visibilityState = "hidden";
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(calls[0].signal.aborted).toBe(true);
    calls[0].resolve(new Response('{"price":99}'));
    await resource.refresh();
    expect(resource.getSnapshot().data).toBeNull();
    doc.visibilityState = "visible";
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(calls).toHaveLength(2);
    stop();
    expect(calls[1].signal.aborted).toBe(true);
    calls[1].resolve(new Response('{"price":88}'));
    await resource.refresh();
    await vi.advanceTimersByTimeAsync(10000);
    expect(resource.getSnapshot().data).toBeNull();
    expect(calls).toHaveLength(2);
  });

  it("deduplicates simultaneous requests and serves cached results", async () => {
    let resolve!: (response: Response) => void;
    const fetcher = vi.fn(() => new Promise<Response>((done) => { resolve = done; }));
    vi.stubGlobal("fetch", fetcher);
    const resource = new JsonResource<{ price: number }>("/price", { staleMs: 60_000 });
    const first = resource.refresh();
    const second = resource.refresh();
    resolve(new Response(JSON.stringify({ price: 20 })));
    await Promise.all([first, second]);
    await resource.refresh();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(resource.getSnapshot().data).toEqual({ price: 20 });
  });

  it("retains data on failure and honors provider retry-after even on manual refresh", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('{"price":20}')).mockResolvedValue(new Response("", { status: 429, headers: { "retry-after": "60" } }));
    vi.stubGlobal("fetch", fetcher);
    const resource = new JsonResource<{ price: number }>("/price", { staleMs: 1000 });
    await resource.refresh();
    await resource.refresh(true);
    expect(resource.getSnapshot()).toMatchObject({ data: { price: 20 }, loading: false, retryAt: Date.now() + 60_000 });
    await resource.refresh(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(60_000);
    await resource.refresh(true);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("pauses network requests while hidden", async () => {
    vi.stubGlobal("document", { visibilityState: "hidden" });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await new JsonResource("/price", { staleMs: 1000 }).refresh(true);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("backs off exponential retries and clears errors after recovery", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockRejectedValue(new Error("Offline"));
    vi.stubGlobal("fetch", fetcher);
    const resource = new JsonResource("/price", { staleMs: 1000 });
    await resource.refresh();
    expect(resource.getSnapshot().retryAt).toBe(Date.now() + 5000);
    await vi.advanceTimersByTimeAsync(5000);
    await resource.refresh();
    expect(resource.getSnapshot().retryAt).toBe(Date.now() + 10000);
    await vi.advanceTimersByTimeAsync(10000);
    fetcher.mockResolvedValue(new Response('{"ok":true}'));
    await resource.refresh();
    expect(resource.getSnapshot()).toMatchObject({ error: null, retryAt: null, data: { ok: true } });
  });
});
