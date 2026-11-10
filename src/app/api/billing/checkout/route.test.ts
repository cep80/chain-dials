import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  ensureProfile: vi.fn(),
  ensureStripeCustomer: vi.fn(),
  sessionsCreate: vi.fn(),
}));
vi.mock("@/lib/supabase-session", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/stripe", () => ({
  ensureProfile: mocks.ensureProfile,
  ensureStripeCustomer: mocks.ensureStripeCustomer,
  getStripe: () => ({ checkout: { sessions: { create: mocks.sessionsCreate } } }),
  stripeCheckoutConfigured: () => true,
}));
import { POST } from "./route";

const request = (body?: unknown) =>
  new Request("http://localhost/api/billing/checkout", {
    method: "POST",
    ...(body ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } } : {}),
  });

beforeEach(() => {
  vi.stubEnv("STRIPE_PRICE_ID", "price_1");
  mocks.requireUser.mockReset().mockResolvedValue({ user: { id: "u1", email: "a@b.co", token: "t", pro: false } });
  mocks.ensureProfile.mockReset().mockResolvedValue({ user_id: "u1", pro_status: "none", pro_current_period_end: null, stripe_customer_id: null });
  mocks.ensureStripeCustomer.mockReset().mockResolvedValue("cus_1");
  mocks.sessionsCreate.mockReset().mockResolvedValue({ url: "https://stripe.test/pay" });
});

describe("checkout", () => {
  it("opens a session for the signed-in user", async () => {
    const res = await POST(request());
    expect(await res.json()).toEqual({ url: "https://stripe.test/pay" });
    expect(mocks.sessionsCreate.mock.calls[0][0]).toMatchObject({ customer: "cus_1", client_reference_id: "u1" });
  });

  it("bills yearly on the annual price", async () => {
    vi.stubEnv("STRIPE_PRICE_ID_ANNUAL", "price_year");
    await POST(request({ interval: "year" }));
    expect(mocks.sessionsCreate.mock.calls[0][0].line_items).toEqual([{ price: "price_year", quantity: 1 }]);
  });

  it("says so when yearly isn't configured", async () => {
    vi.stubEnv("STRIPE_PRICE_ID_ANNUAL", "");
    const res = await POST(request({ interval: "year" }));
    expect(res.status).toBe(400);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  it("refuses when Pro already comes from the app store", async () => {
    mocks.ensureProfile.mockResolvedValue({
      user_id: "u1",
      pro_status: "none",
      pro_current_period_end: null,
      store_status: "active",
      store_period_end: new Date(Date.now() + 86_400_000).toISOString(),
      stripe_customer_id: null,
    });
    const res = await POST(request());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/App Store or Google Play/);
  });

  it("needs a session", async () => {
    mocks.requireUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });
    expect((await POST(request())).status).toBe(401);
  });

  it("refuses a second subscription from the live profile, not the cookie", async () => {
    mocks.ensureProfile.mockResolvedValue({ user_id: "u1", pro_status: "active", pro_current_period_end: null, stripe_customer_id: "cus_1" });
    expect((await POST(request())).status).toBe(400);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });
});
