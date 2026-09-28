import { test, expect } from "@playwright/test";
import { mockFeeds, snapshot } from "./fixtures";

test("Pro rules save and restore threshold and cooldown", async ({ page }) => {
  await mockFeeds(page);
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: { user: { id: "test-save", name: "Test", pro: true }, expires: "2099-01-01T00:00:00.000Z" } }));
  let saved: unknown[] = [{ chainId: "eth", kind: "fee_hot", enabled: true, params: { threshold: 5, cooldownMinutes: 1 } }];
  await page.route("**/api/pro/alerts?**", (route) => route.fulfill({ json: { rules: saved } }));
  await page.route("**/api/pro/alerts", async (route) => {
    saved = (route.request().postDataJSON() as { rules: unknown[] }).rules;
    await route.fulfill({ json: { rules: saved } });
  });
  await page.goto("/eth/alerts");
  await page.getByLabel("Fee hottest above threshold threshold").fill("9");
  await page.getByLabel("Fee hottest above threshold cooldown").selectOption("15");
  await page.getByRole("button", { name: "Save rules" }).click();
  await expect(page.getByText("Saved to your account.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Fee hottest above threshold threshold")).toHaveValue("9");
  await expect(page.getByLabel("Fee hottest above threshold cooldown")).toHaveValue("15");
});

test("a condition rearms after clearing and its cooldown, even if notification delivery fails", async ({ page }) => {
  await mockFeeds(page);
  await page.clock.install();
  await page.addInitScript(() => {
    Object.defineProperty(window, "Notification", { configurable: true, value: class {
      static permission = "granted";
      constructor() { throw new Error("Delivery unavailable"); }
    } });
  });
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: { user: { id: "test-rearm", name: "Test", pro: true }, expires: "2099-01-01T00:00:00.000Z" } }));
  await page.route("**/api/pro/alerts?**", (route) => route.fulfill({ json: { rules: [{ chainId: "eth", kind: "fee_hot", enabled: true, params: { threshold: 5, cooldownMinutes: 1 } }] } }));
  let fee = 12;
  await page.route("**/api/suite/snapshot/eth", (route) => route.fulfill({ json: { ...snapshot(), feeFastest: fee } }));
  await page.goto("/eth/alerts");
  const history = page.getByRole("region", { name: "Trigger history" });
  await expect(history.getByRole("listitem")).toHaveCount(1);
  await expect(history).toContainText("Browser notification unavailable; recorded here");
  fee = 2;
  await page.clock.fastForward(65_000);
  await expect(page.getByText("Not triggered by the current reading.").first()).toBeVisible();
  fee = 12;
  await page.clock.fastForward(16_000);
  await expect(history.getByRole("listitem")).toHaveCount(2);
});

test("free quiet-tip nudges keep their cooldown across reloads", async ({ page }) => {
  await mockFeeds(page);
  const quietTimestamp = Date.now() - 600_000;
  await page.addInitScript(() => {
    localStorage.setItem("chain-dials:local-nudge:eth:v1", "1");
    Object.defineProperty(window, "Notification", { configurable: true, value: class {
      static permission = "granted";
      constructor() { localStorage.setItem("test:nudge-count", String(Number(localStorage.getItem("test:nudge-count") ?? "0") + 1)); }
    } });
  });
  await page.route("**/api/suite/tip/eth", (route) => route.fulfill({ json: { height: 100, hash: "abcdef", timestamp: quietTimestamp, source: "Fixture" } }));
  await page.route("**/api/suite/snapshot/eth", (route) => route.fulfill({ json: { ...snapshot(), tip: { height: 100, hash: "abcdef", timestamp: quietTimestamp, source: "Fixture" } } }));
  await page.goto("/eth/alerts");
  await expect.poll(() => page.evaluate(() => Number(localStorage.getItem("test:nudge-count") ?? "0"))).toBe(1);
  await page.reload();
  await expect(page.getByText("Watching", { exact: true })).toBeVisible();
  await expect(page.getByRole("status", { name: /Connected\. This board refreshes/ })).toBeVisible();
  expect(await page.evaluate(() => Number(localStorage.getItem("test:nudge-count") ?? "0"))).toBe(1);
});

test("alert history synchronizes across tabs for the same account", async ({ page, context }) => {
  const second = await context.newPage();
  for (const tab of [page, second]) {
    await mockFeeds(tab);
    await tab.route("**/api/auth/session", (route) => route.fulfill({ json: { user: { id: "shared-pro", name: "Test", pro: true }, expires: "2099-01-01T00:00:00.000Z" } }));
    await tab.route("**/api/pro/alerts?**", (route) => route.fulfill({ json: { rules: [{ chainId: "eth", kind: "fee_hot", enabled: true, params: { threshold: 5, cooldownMinutes: 1 } }] } }));
  }
  let firstFee = 2;
  await page.route("**/api/suite/snapshot/eth", (route) => route.fulfill({ json: { ...snapshot(), feeFastest: firstFee } }));
  await second.route("**/api/suite/snapshot/eth", (route) => route.fulfill({ json: { ...snapshot(), feeFastest: 2 } }));
  await page.goto("/eth/alerts");
  await second.goto("/eth/alerts");
  const otherHistory = second.getByRole("region", { name: "Trigger history" });
  await expect(otherHistory.getByText(/No triggers yet/)).toBeVisible();
  firstFee = 12;
  await page.reload();
  await expect(page.getByRole("region", { name: "Trigger history" }).getByRole("listitem")).toHaveCount(1);
  await expect(otherHistory.getByRole("listitem")).toHaveCount(1);
  await second.close();
});

test("local nudge permission failures remain recoverable", async ({ page }) => {
  await mockFeeds(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "Notification", { configurable: true, value: class {
      static permission = "default";
      static async requestPermission() { throw new Error("Unsupported delivery"); }
    } });
  });
  await page.goto("/eth/alerts");
  await page.getByRole("button", { name: "Enable local nudges" }).click();
  await expect(page.getByText("This browser could not enable notifications. You can try again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enable local nudges" })).toBeEnabled();
  expect(errors).toEqual([]);
});

test("rule previews, history and persisted repeat protection", async ({ page }) => {
  await mockFeeds(page);
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: { user: { id: "test-pro", name: "Test", pro: true }, expires: "2099-01-01T00:00:00.000Z" } }));
  await page.route("**/api/pro/alerts?**", (route) => route.fulfill({ json: { rules: [{ chainId: "eth", kind: "fee_hot", enabled: true, params: { threshold: 5, cooldownMinutes: 1 } }] } }));
  await page.goto("/eth/alerts");
  await expect(page.getByText(/Would trigger now:.*threshold 5/)).toBeVisible();
  const history = page.getByRole("region", { name: "Trigger history" });
  await expect(history.getByRole("listitem")).toHaveCount(1);
  await expect(history).toContainText("ETH fees hot");
  await page.reload();
  await expect(page.getByText(/Would trigger now:.*threshold 5/)).toBeVisible();
  await expect(history.getByRole("listitem")).toHaveCount(1);
  await page.getByLabel("Fee hottest above threshold cooldown").selectOption("15");
  await expect(page.getByLabel("Fee hottest above threshold cooldown")).toHaveValue("15");
  await page.getByLabel("Fee hottest above threshold threshold").fill("-1");
  await expect(page.getByRole("button", { name: "Save rules" })).toBeDisabled();
  await page.getByRole("button", { name: "Clear history" }).click();
  await expect(history.getByText(/No triggers yet/)).toBeVisible();
});
