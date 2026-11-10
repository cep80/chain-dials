import { describe, expect, it } from "vitest";
import { deepLinkPath } from "@/lib/native";

describe("deepLinkPath", () => {
  it("maps our https links to in-app paths", () => {
    expect(deepLinkPath("https://chaindials.com/btc/solo")).toBe("/btc/solo");
    expect(deepLinkPath("https://www.chaindials.com/eth?x=1#y")).toBe("/eth?x=1#y");
    expect(deepLinkPath("https://chaindials.com")).toBe("/");
  });

  it("maps the custom scheme", () => {
    expect(deepLinkPath("chaindials://btc/solo")).toBe("/btc/solo");
    expect(deepLinkPath("chaindials://btc/wallet?a=bc1q")).toBe("/btc/wallet?a=bc1q");
    expect(deepLinkPath("chaindials://")).toBe("/");
  });

  it("ignores other hosts and junk", () => {
    expect(deepLinkPath("https://evil.com/btc")).toBeNull();
    expect(deepLinkPath("https://chaindials.com.evil.com/")).toBeNull();
    expect(deepLinkPath("http://chaindials.com/btc")).toBeNull();
    expect(deepLinkPath("not a url")).toBeNull();
  });
});
