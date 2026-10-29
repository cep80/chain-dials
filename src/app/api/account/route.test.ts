import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class CargoError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return {
    CargoError,
    cbAdmin: vi.fn(),
    cbDeleteUser: vi.fn(),
    cbLogin: vi.fn(),
    requireCargoUser: vi.fn(),
    getProfile: vi.fn(),
    customersDel: vi.fn(),
  };
});
vi.mock("@/lib/cargobase", () => ({
  cbAdmin: mocks.cbAdmin,
  cbDeleteUser: mocks.cbDeleteUser,
  cbLogin: mocks.cbLogin,
  CargoError: mocks.CargoError,
}));
vi.mock("@/lib/cargobase-session", () => ({ requireCargoUser: mocks.requireCargoUser }));
vi.mock("@/lib/rate-limit", () => ({
  clientIp: () => "test",
  rateLimit: () => ({ ok: true }),
  rateLimitResponse: () => new Response(null, { status: 429 }),
}));
vi.mock("@/lib/stripe", () => ({
  getProfile: mocks.getProfile,
  getStripe: () => ({ customers: { del: mocks.customersDel } }),
  stripeConfigured: () => true,
}));
import { DELETE } from "./route";

const request = (body: unknown = { password: "pw" }) =>
  new Request("http://localhost/api/account", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  for (const m of [mocks.cbAdmin, mocks.cbDeleteUser, mocks.cbLogin, mocks.getProfile, mocks.customersDel]) m.mockReset();
  mocks.requireCargoUser.mockReset().mockResolvedValue({ user: { id: "u1", email: "a@b.co", token: "t", pro: true } });
  mocks.cbLogin.mockResolvedValue({ access_token: "x" });
  mocks.getProfile.mockResolvedValue({ user_id: "u1", stripe_customer_id: "cus_1" });
});

describe("account deletion", () => {
  it("cancels billing, deletes the user, then removes every owned row", async () => {
    const order: string[] = [];
    mocks.customersDel.mockImplementation(async () => order.push("stripe"));
    mocks.cbDeleteUser.mockImplementation(async () => order.push("auth"));
    mocks.cbAdmin.mockImplementation(async (path: string) => order.push(path.split("?")[0]));

    const res = await DELETE(request());
    expect(res.status).toBe(200);
    expect(order).toEqual(["stripe", "auth", "layouts", "alert_rules", "wall_packs", "desk_packs", "profiles"]);
    for (const [path, opts] of mocks.cbAdmin.mock.calls) {
      expect(path).toContain("user_id=eq.u1");
      expect(opts).toEqual({ method: "DELETE" });
    }
  });

  it("touches nothing when the password is wrong", async () => {
    mocks.cbLogin.mockResolvedValue(null);
    const res = await DELETE(request());
    expect(res.status).toBe(401);
    expect(mocks.customersDel).not.toHaveBeenCalled();
    expect(mocks.cbDeleteUser).not.toHaveBeenCalled();
    expect(mocks.cbAdmin).not.toHaveBeenCalled();
  });

  it("deletes nothing if billing cannot be cancelled", async () => {
    mocks.customersDel.mockRejectedValue(new Error("stripe down"));
    const res = await DELETE(request());
    expect(res.status).toBe(502);
    expect(mocks.cbDeleteUser).not.toHaveBeenCalled();
    expect(mocks.cbAdmin).not.toHaveBeenCalled();
  });

  it("treats an already-deleted Stripe customer as cancelled", async () => {
    mocks.customersDel.mockRejectedValue(Object.assign(new Error("gone"), { code: "resource_missing" }));
    expect((await DELETE(request())).status).toBe(200);
    expect(mocks.cbDeleteUser).toHaveBeenCalled();
  });

  it("keeps app data when the backend refuses an admin account", async () => {
    mocks.cbDeleteUser.mockRejectedValue(new mocks.CargoError(409, "owner"));
    const res = await DELETE(request());
    expect(res.status).toBe(409);
    expect(mocks.cbAdmin).not.toHaveBeenCalled();
  });

  it("still succeeds when row cleanup fails after the account is gone", async () => {
    mocks.cbAdmin.mockRejectedValue(new Error("rest down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await DELETE(request())).status).toBe(200);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("manual cleanup"), expect.anything());
    spy.mockRestore();
  });

  it("requires a password and a session", async () => {
    expect((await DELETE(request({}))).status).toBe(400);
    mocks.requireCargoUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });
    expect((await DELETE(request())).status).toBe(401);
  });
});
