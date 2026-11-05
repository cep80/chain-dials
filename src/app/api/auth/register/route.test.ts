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
  return { SupabaseError, sbSignup: vi.fn() };
});
vi.mock("@/lib/supabase", () => mocks);
vi.mock("@/lib/rate-limit", () => ({
  clientIp: () => "test",
  rateLimit: () => ({ ok: true }),
  rateLimitResponse: () => new Response(null, { status: 429 }),
}));
import { POST } from "./route";

const request = () =>
  new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "a@b.co", password: "long-enough" }),
  });

beforeEach(() => {
  mocks.sbSignup.mockReset();
});

describe("register", () => {
  it("answers the same for a taken address", async () => {
    mocks.sbSignup.mockRejectedValue(new mocks.SupabaseError(422, "taken", "user_already_exists"));
    expect((await POST(request())).status).toBe(201);
  });

  it("passes a Supabase throttle on as a 429", async () => {
    mocks.sbSignup.mockRejectedValue(new mocks.SupabaseError(429, "slow down"));
    expect((await POST(request())).status).toBe(429);
  });
});
