import { describe, expect, it } from "vitest";
import { feedCatchupLabel, isFeedCatchingUp } from "@/lib/feed-status";

describe("feed-status", () => {
  it("marks connecting and degraded as catching up", () => {
    expect(isFeedCatchingUp("connecting")).toBe(true);
    expect(isFeedCatchingUp("degraded")).toBe(true);
    expect(isFeedCatchingUp("connected")).toBe(false);
    expect(isFeedCatchingUp("disconnected")).toBe(false);
  });

  it("labels catch-up for the pulse and instruments", () => {
    expect(feedCatchupLabel("connecting")).toBe("Loading");
    expect(feedCatchupLabel("degraded")).toBe("Updating");
    expect(feedCatchupLabel("connected")).toBeNull();
    expect(feedCatchupLabel("disconnected")).toBeNull();
  });
});
