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

const request = () => new Request("http://localhost/api/billing/checkout", { method: "POST" });

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
