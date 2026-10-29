import { describe, expect, it } from "vitest";
import { isSecureRequest } from "./supabase-session";

describe("isSecureRequest", () => {
  it("follows the request protocol", () => {
    expect(isSecureRequest(new Request("https://chaindials.com/api/x"))).toBe(true);
    expect(isSecureRequest(new Request("http://localhost:3000/api/x"))).toBe(false);
  });

  it("prefers the forwarded protocol behind a proxy, as Auth.js does", () => {
    const req = (proto: string) => new Request("http://internal:3000/api/x", { headers: { "x-forwarded-proto": proto } });
    expect(isSecureRequest(req("https"))).toBe(true);
    expect(isSecureRequest(req("https, http"))).toBe(true);
    expect(isSecureRequest(req("http"))).toBe(false);
  });
});
