import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class SupabaseError extends Error {
    status: number;
    code: string | null;
    constructor(status: number, message: string, code: string | null = null) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }
  return { SupabaseError, sbUpdatePassword: vi.fn(), sbSignOutEverywhere: vi.fn(), sbRecover: vi.fn() };
});
vi.mock("@/lib/supabase", () => mocks);
vi.mock("@/lib/rate-limit", () => ({
  clientIp: () => "test",
  rateLimit: () => ({ ok: true }),
  rateLimitResponse: () => new Response(null, { status: 429 }),
}));
vi.mock("@/lib/site", () => ({ siteUrl: () => "https://chaindials.com" }));
import { POST as reset } from "./route";
import { POST as forgot } from "../forgot/route";

const post = (body: unknown) =>
  new Request("http://localhost/api/auth/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const TOKEN = "t".repeat(40);

beforeEach(() => {
  for (const m of [mocks.sbUpdatePassword, mocks.sbSignOutEverywhere, mocks.sbRecover]) m.mockReset();
});

describe("password reset", () => {
  it("sets the password, then ends every session so the token cannot be reused", async () => {
    const res = await reset(post({ accessToken: TOKEN, password: "new-password" }));
    expect(res.status).toBe(200);
    expect(mocks.sbUpdatePassword).toHaveBeenCalledWith(TOKEN, "new-password");
    expect(mocks.sbSignOutEverywhere).toHaveBeenCalledWith(TOKEN);
  });

  it("reports a used or expired link without signing anyone out", async () => {
    mocks.sbUpdatePassword.mockRejectedValue(new mocks.SupabaseError(403, "session_not_found", "session_not_found"));
    const res = await reset(post({ accessToken: TOKEN, password: "new-password" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/expired or was already used/);
    expect(mocks.sbSignOutEverywhere).not.toHaveBeenCalled();
  });

  it("explains a reused current password", async () => {
    mocks.sbUpdatePassword.mockRejectedValue(new mocks.SupabaseError(422, "same", "same_password"));
    expect((await reset(post({ accessToken: TOKEN, password: "new-password" }))).status).toBe(422);
  });

  it("rejects short passwords before calling Supabase", async () => {
    expect((await reset(post({ accessToken: TOKEN, password: "short" }))).status).toBe(400);
    expect(mocks.sbUpdatePassword).not.toHaveBeenCalled();
  });
});

describe("forgot password", () => {
  it("sends the link back to the reset page", async () => {
    const res = await forgot(post({ email: "A@B.co" }));
    expect(res.status).toBe(200);
    expect(mocks.sbRecover).toHaveBeenCalledWith("a@b.co", "https://chaindials.com/account/reset");
  });

  it("answers the same when Supabase refuses, so accounts cannot be probed", async () => {
    const ok = await (await forgot(post({ email: "a@b.co" }))).json();
    mocks.sbRecover.mockRejectedValue(new mocks.SupabaseError(429, "slow down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const refused = await forgot(post({ email: "a@b.co" }));
    spy.mockRestore();
    expect(refused.status).toBe(200);
    expect(await refused.json()).toEqual(ok);
  });
});
