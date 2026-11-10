import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sbAdmin: vi.fn(),
  deliver: vi.fn(),
  fetchTxOrNull: vi.fn(),
  mempoolText: vi.fn(),
  mempoolJson: vi.fn(),
  fetchAddressRaw: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({ sbAdmin: mocks.sbAdmin }));
vi.mock("@/lib/notify", () => ({ deliver: mocks.deliver }));
vi.mock("@/lib/forensics/mempool", () => ({
  fetchTxOrNull: mocks.fetchTxOrNull,
  mempoolText: mocks.mempoolText,
  mempoolJson: mocks.mempoolJson,
  fetchAddressRaw: mocks.fetchAddressRaw,
}));
import { runTick } from "@/lib/watch/engine";

const TXID = "b".repeat(64);
const NOW = Date.UTC(2026, 10, 10, 8);

/** Route sbAdmin calls by table so each test can stage the database. */
function db(tables: { lock?: unknown[]; watches?: unknown[]; profiles?: unknown[]; targets?: unknown[] }) {
  mocks.sbAdmin.mockImplementation(async (path: string, opts: { method?: string }) => {
    if (path.startsWith("engine_state") && opts.method === "PATCH" && path.includes("or=")) {
      return tables.lock ?? [{ value: { tipHeight: 900_000 } }];
    }
    if (path.startsWith("watches?select")) return tables.watches ?? [];
    if (path.startsWith("profiles")) return tables.profiles ?? [];
    if (path.startsWith("notify_targets")) return tables.targets ?? [];
    return undefined;
  });
}

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  mocks.mempoolText.mockResolvedValue("900001");
  mocks.mempoolJson.mockResolvedValue({ fastestFee: 10 });
  mocks.deliver.mockResolvedValue({ channel: "telegram", status: "sent" });
});

describe("runTick", () => {
  it("does nothing when another tick holds the lock", async () => {
    db({ lock: [] });
    expect(await runTick(NOW)).toEqual({ skipped: "locked" });
    expect(mocks.mempoolText).not.toHaveBeenCalled();
    expect(mocks.deliver).not.toHaveBeenCalled();
  });

  it("confirms a tx, records the event, and releases the lock with the new tip", async () => {
    db({
      watches: [
        { id: "w1", user_id: "u1", kind: "tx", chain_id: "btc", target: TXID, label: null, params: {}, state: {}, created_at: "2026-11-10T07:00:00+00:00" },
      ],
      profiles: [{ user_id: "u1", pro_status: "none", pro_current_period_end: null }],
      targets: [{ id: "t1", user_id: "u1", channel: "telegram", token: "42" }],
    });
    mocks.fetchTxOrNull.mockResolvedValue({ txid: TXID, vin: [], vout: [], status: { confirmed: true, block_height: 900_001 } });

    const summary = await runTick(NOW);
    expect(summary).toMatchObject({ watches: 1, notices: 1, tipHeight: 900_001 });
    expect(mocks.deliver).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ title: "Transaction confirmed", path: "/btc/watch" }),
      [expect.objectContaining({ id: "t1" })],
    );
    const calls = mocks.sbAdmin.mock.calls as [string, { method?: string; body?: Record<string, unknown> }][];
    expect(calls.find(([p, o]) => p === "watch_events" && o.method === "POST")?.[1].body).toEqual([
      expect.objectContaining({ user_id: "u1", watch_id: "w1", status: "sent" }),
    ]);
    const release = calls.filter(([p]) => p === "engine_state?key=eq.tick").at(-1)!;
    expect(release[1].body).toEqual({ locked_until: null, value: { tipHeight: 900_001 } });
  });

  it("skips a free user's second watch", async () => {
    db({
      watches: [
        { id: "w1", user_id: "u1", kind: "tx", chain_id: "btc", target: TXID, label: null, params: {}, state: {}, created_at: "2026-11-10T07:00:00+00:00" },
        { id: "w2", user_id: "u1", kind: "tx", chain_id: "btc", target: "c".repeat(64), label: null, params: {}, state: {}, created_at: "2026-11-10T07:30:00+00:00" },
      ],
      profiles: [{ user_id: "u1", pro_status: "none", pro_current_period_end: null }],
    });
    mocks.fetchTxOrNull.mockResolvedValue({ txid: TXID, vin: [], vout: [], status: { confirmed: false } });
    await runTick(NOW);
    expect(mocks.fetchTxOrNull).toHaveBeenCalledTimes(1);
    expect(mocks.fetchTxOrNull).toHaveBeenCalledWith(TXID);
  });

  it("releases the lock even when the explorer fails", async () => {
    db({
      watches: [
        { id: "w1", user_id: "u1", kind: "tx", chain_id: "btc", target: TXID, label: null, params: {}, state: {}, created_at: "2026-11-10T07:00:00+00:00" },
      ],
    });
    mocks.mempoolText.mockRejectedValue(new Error("down"));
    await expect(runTick(NOW)).rejects.toThrow("down");
    const calls = mocks.sbAdmin.mock.calls as [string, { body?: Record<string, unknown> }][];
    expect(calls.at(-1)![0]).toBe("engine_state?key=eq.tick");
    expect(calls.at(-1)![1].body).toMatchObject({ locked_until: null });
  });
});
