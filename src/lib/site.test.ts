import { afterEach, describe, expect, it } from "vitest";
import { requestOrigin } from "@/lib/site";

describe("requestOrigin", () => {
  const prev = {
    site: process.env.NEXT_PUBLIC_SITE_URL,
    vercel: process.env.VERCEL_URL,
    prod: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  };

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = prev.site;
    process.env.VERCEL_URL = prev.vercel;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = prev.prod;
  });

  it("falls back to siteUrl when host is not allowlisted", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://chaindials.com";
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    const req = new Request("https://chaindials.com/api", {
      headers: {
        host: "evil.example",
        "x-forwarded-host": "evil.example",
        "x-forwarded-proto": "https",
      },
    });
    expect(requestOrigin(req)).toBe("https://chaindials.com");
  });

  it("accepts the configured site host", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://chaindials.com";
    const req = new Request("https://chaindials.com/api", {
      headers: {
        host: "chaindials.com",
        "x-forwarded-host": "chaindials.com",
        "x-forwarded-proto": "https",
      },
    });
    expect(requestOrigin(req)).toBe("https://chaindials.com");
  });
});
