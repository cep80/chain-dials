import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class SupabaseError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return {
    SupabaseError,
    sbAdmin: vi.fn(),
    sbDeleteUser: vi.fn(),
    sbLogin: vi.fn(),
    requireUser: vi.fn(),
    getProfile: vi.fn(),
    customersDel: vi.fn(),
    stripeConfigured: vi.fn(),
  };
});
vi.mock("@/lib/supabase", () => ({
  sbAdmin: mocks.sbAdmin,
  sbDeleteUser: mocks.sbDeleteUser,
  sbLogin: mocks.sbLogin,
  SupabaseError: mocks.SupabaseError,
}));
vi.mock("@/lib/supabase-session", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/rate-limit", () => ({
  clientIp: () => "test",
  rateLimit: () => ({ ok: true }),
  rateLimitResponse: () => new Response(null, { status: 429 }),
}));
vi.mock("@/lib/stripe", () => ({
  getProfile: mocks.getProfile,
  getStripe: () => ({ customers: { del: mocks.customersDel } }),
  stripeConfigured: mocks.stripeConfigured,
}));
import { DELETE } from "./route";

const request = (body: unknown = { password: "pw" }) =>
  new Request("http://localhost/api/account", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  for (const m of [mocks.sbAdmin, mocks.sbDeleteUser, mocks.sbLogin, mocks.getProfile, mocks.customersDel]) m.mockReset();
  mocks.requireUser.mockReset().mockResolvedValue({ user: { id: "u1", email: "a@b.co", token: "t", pro: true } });
  mocks.stripeConfigured.mockReset().mockReturnValue(true);
  mocks.sbLogin.mockResolvedValue({ access_token: "x" });
  mocks.getProfile.mockResolvedValue({ user_id: "u1", stripe_customer_id: "cus_1" });
});

describe("account deletion", () => {
  it("cancels billing, then deletes the user by id", async () => {
    const order: string[] = [];
    mocks.customersDel.mockImplementation(async () => order.push("stripe"));
    mocks.sbDeleteUser.mockImplementation(async () => order.push("auth"));

    const res = await DELETE(request());
    expect(res.status).toBe(200);
    expect(order).toEqual(["stripe", "auth"]);
    expect(mocks.sbDeleteUser).toHaveBeenCalledWith("u1");
  });

  it("deletes nothing when a customer exists but Stripe is not configured", async () => {
    mocks.stripeConfigured.mockReturnValue(false);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await DELETE(request())).status).toBe(503);
    expect(mocks.sbDeleteUser).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("clears the dead customer first, so a failed delete leaves a usable account", async () => {
    const order: string[] = [];
    mocks.sbAdmin.mockImplementation(async () => order.push("clear"));
    mocks.sbDeleteUser.mockImplementation(async () => {
      order.push("auth");
      throw new mocks.SupabaseError(500, "boom");
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await DELETE(request())).status).toBe(502);
    expect(order).toEqual(["clear", "auth"]);
    expect(mocks.sbAdmin.mock.calls[0][1].body).toMatchObject({ stripe_customer_id: null, pro_status: "canceled" });
    spy.mockRestore();
  });

  it("touches nothing when the password is wrong", async () => {
    mocks.sbLogin.mockResolvedValue(null);
    const res = await DELETE(request());
    expect(res.status).toBe(401);
    expect(mocks.customersDel).not.toHaveBeenCalled();
    expect(mocks.sbDeleteUser).not.toHaveBeenCalled();
  });

  it("deletes nothing if billing cannot be cancelled", async () => {
    mocks.customersDel.mockRejectedValue(new Error("stripe down"));
    const res = await DELETE(request());
    expect(res.status).toBe(502);
    expect(mocks.sbDeleteUser).not.toHaveBeenCalled();
  });

  it("treats an already-deleted Stripe customer as cancelled", async () => {
    mocks.customersDel.mockRejectedValue(Object.assign(new Error("gone"), { code: "resource_missing" }));
    expect((await DELETE(request())).status).toBe(200);
    expect(mocks.sbDeleteUser).toHaveBeenCalled();
  });

  it("skips Stripe for an account that never paid, even with Stripe unset", async () => {
    mocks.stripeConfigured.mockReturnValue(false);
    mocks.getProfile.mockResolvedValue({ user_id: "u1", stripe_customer_id: null });
    expect((await DELETE(request())).status).toBe(200);
    expect(mocks.customersDel).not.toHaveBeenCalled();
  });

  it("reports a failed delete instead of claiming success", async () => {
    mocks.sbDeleteUser.mockRejectedValue(new mocks.SupabaseError(500, "boom"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await DELETE(request())).status).toBe(502);
    spy.mockRestore();
  });

  it("rate-limits password checks it cannot make", async () => {
    mocks.sbLogin.mockRejectedValue(new mocks.SupabaseError(429, "slow down"));
    expect((await DELETE(request())).status).toBe(429);
    expect(mocks.sbDeleteUser).not.toHaveBeenCalled();
  });

  it("requires a password and a session", async () => {
    expect((await DELETE(request({}))).status).toBe(400);
    mocks.requireUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });
    expect((await DELETE(request())).status).toBe(401);
  });
});
