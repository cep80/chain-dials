import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cbRest: vi.fn(),
  requireProUser: vi.fn(),
}));
vi.mock("@/lib/cargobase", () => ({ cbRest: mocks.cbRest }));
vi.mock("@/lib/cargobase-session", () => ({ requireProUser: mocks.requireProUser }));
import { PUT } from "./route";

const request = (rules: unknown[]) => new Request("http://localhost/api/pro/alerts", {
  method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ rules }),
});

beforeEach(() => {
  mocks.cbRest.mockReset();
  mocks.requireProUser.mockReset().mockResolvedValue({ user: { token: "test-token" } });
});

describe("alert rule saving", () => {
  it("keeps old rules if inserting a new rule fails", async () => {
    mocks.cbRest.mockImplementation(async (path: string, options: { method?: string }) => {
      if (path.includes("chain_id=in.")) return [{ id: "old-fee", chain_id: "eth", kind: "fee_hot", enabled: true, params: { threshold: 5 }, updated_at: "2026-09-25" }];
      if (options.method === "POST") throw new Error("provider failed");
      return [];
    });
    await expect(PUT(request([{ chainId: "eth", kind: "tip_quiet", enabled: true, params: { seconds: 120 } }]))).rejects.toThrow("provider failed");
    expect(mocks.cbRest.mock.calls.some(([, options]) => options.method === "DELETE")).toBe(false);
  });

  it("rejects duplicate rules before touching storage", async () => {
    const rule = { chainId: "eth", kind: "fee_hot", enabled: true, params: { threshold: 5 } };
    const response = await PUT(request([rule, rule]));
    expect(response.status).toBe(400);
    expect(mocks.cbRest).not.toHaveBeenCalled();
  });
});
