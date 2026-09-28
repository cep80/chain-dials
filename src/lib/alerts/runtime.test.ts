import { describe, expect, it } from "vitest";
import { advanceAlert, alertRuleError, emptyAlertRuntime, parseAlertRuntime } from "@/lib/alerts/runtime";

describe("alert runtime", () => {
  it("fires once per sustained condition, rearms after clearing, and enforces cooldown", () => {
    const first = advanceAlert(emptyAlertRuntime(), "fee_hot", true, 1000, 60_000);
    expect(first.fire).toBe(true);
    expect(advanceAlert(first.state, "fee_hot", true, 100_000, 60_000).fire).toBe(false);
    const cleared = advanceAlert(first.state, "fee_hot", false, 2000, 60_000);
    expect(advanceAlert(cleared.state, "fee_hot", true, 3000, 60_000).fire).toBe(false);
    expect(advanceAlert(cleared.state, "fee_hot", true, 61_000, 60_000).fire).toBe(true);
  });
  it("preserves repeat protection through serialization and corrupt history", () => {
    const first = advanceAlert(emptyAlertRuntime(), "fee_hot", true, 1000, 60_000);
    const restored = parseAlertRuntime(JSON.parse(JSON.stringify(first.state)));
    expect(advanceAlert(restored, "fee_hot", true, 100_000, 60_000).fire).toBe(false);
    expect(parseAlertRuntime({ history: [null, { kind: "bad" }], conditions: { unknown: {} } })).toEqual(emptyAlertRuntime());
  });
  it("validates thresholds and cooldowns", () => {
    expect(alertRuleError("fee_hot", { threshold: -1 })).not.toBeNull();
    expect(alertRuleError("forge_heat", { score: 2 })).not.toBeNull();
    expect(alertRuleError("fee_hot", { threshold: 10, cooldownMinutes: 0 })).not.toBeNull();
    expect(alertRuleError("fee_hot", { threshold: 10, cooldownMinutes: 5 })).toBeNull();
  });
  it("discards impossible saved timestamps before rendering history or cooldowns", () => {
    const parsed = parseAlertRuntime({
      conditions: { fee_hot: { active: true, lastAt: 1e100 } },
      history: [{ kind: "fee_hot", at: 1e100, title: "Bad", body: "Bad" }],
    });
    expect(parsed.conditions.fee_hot?.lastAt).toBeNull();
    expect(parsed.history).toEqual([]);
  });
});
