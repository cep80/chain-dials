import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "@/lib/safe-url";

describe("safeCallbackUrl", () => {
  it("allows relative same-origin paths", () => {
    expect(safeCallbackUrl("/account")).toBe("/account");
    expect(safeCallbackUrl("/btc/pro")).toBe("/btc/pro");
    expect(safeCallbackUrl("/control-room")).toBe("/control-room");
  });

  it("rejects open redirects", () => {
    expect(safeCallbackUrl("https://evil.com")).toBe("/account");
    expect(safeCallbackUrl("//evil.com")).toBe("/account");
    expect(safeCallbackUrl("/\\evil.com")).toBe("/account");
    expect(safeCallbackUrl("https://evil.com/phish")).toBe("/account");
    expect(safeCallbackUrl(null)).toBe("/account");
    expect(safeCallbackUrl("")).toBe("/account");
  });
});
