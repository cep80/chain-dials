import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const load = async () => {
  vi.resetModules();
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  return import("./supabase");
};

const reply = (status: number, body: unknown) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sbRefresh", () => {
  it("returns the new session", async () => {
    const { sbRefresh } = await load();
    reply(200, { access_token: "a", refresh_token: "r", expires_in: 3600 });
    expect((await sbRefresh("old"))?.refresh_token).toBe("r");
  });

  it("returns null when the token itself is refused", async () => {
    const { sbRefresh } = await load();
    reply(400, { error_code: "refresh_token_already_used", msg: "Invalid Refresh Token" });
    expect(await sbRefresh("old")).toBeNull();
  });

  it.each([429, 503])("throws on %i, which says nothing about the token", async (status) => {
    const { sbRefresh, SupabaseError } = await load();
    reply(status, { msg: "try later" });
    await expect(sbRefresh("old")).rejects.toBeInstanceOf(SupabaseError);
  });
});

describe("notIn", () => {
  it("matches every row when nothing is kept", async () => {
    const { notIn } = await load();
    expect(notIn([])).toBe("id=not.is.null");
  });

  it("excludes the kept ids", async () => {
    const { notIn } = await load();
    expect(decodeURIComponent(notIn([{ id: "a1" }, { id: "b2" }]))).toBe('id=not.in.("a1","b2")');
  });
});
