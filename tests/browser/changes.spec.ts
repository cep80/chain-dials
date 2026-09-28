import { test, expect } from "@playwright/test";
import { mockFeeds } from "./fixtures";

test("visit summary compares a saved baseline and links meaningful changes", async ({ page }) => {
  await mockFeeds(page);
  await page.addInitScript(() => localStorage.setItem("chain-dials:visit:eth:v1", JSON.stringify({ at: Date.now() - 3600_000, fee: 6, pending: 2000, price: 3000, regime: null, wallets: [] })));
  await page.goto("/eth");
  const summary = page.getByRole("region", { name: "Since your last visit" });
  await expect(summary.getByText("Fees up", { exact: false })).toBeVisible({ timeout: 10_000 });
  await expect(summary.getByRole("link").filter({ hasText: "Fees up" })).toHaveAttribute("href", "/eth?i=atmosphere");
  await expect(summary.getByText("Pending activity down", { exact: false })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("chain-dials:visit:eth:v1")!).fee)).toBe(12);
});

test("chain visits keep separate baselines through navigation", async ({ page }) => {
  await mockFeeds(page);
  await page.addInitScript(() => {
    localStorage.setItem("chain-dials:visit:eth:v1", JSON.stringify({ at: Date.now() - 3_600_000, fee: 6, pending: 1000, price: 3000, regime: null, wallets: [] }));
    localStorage.setItem("chain-dials:visit:sol:v1", JSON.stringify({ at: Date.now() - 3_600_000, fee: 30, pending: 1000, price: 150, regime: null, wallets: [] }));
  });
  await page.goto("/eth");
  const summary = page.getByRole("region", { name: "Since your last visit" });
  await expect(summary.getByRole("link", { name: /Fees up/ })).toHaveAttribute("href", "/eth?i=atmosphere");
  await page.getByRole("navigation", { name: "Chain boards" }).getByRole("link", { name: "SOL" }).click();
  await expect(summary.getByRole("link", { name: /Fees down/ })).toHaveAttribute("href", "/sol?i=atmosphere");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("chain-dials:visit:eth:v1")!).fee)).toBe(12);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("chain-dials:visit:sol:v1")!).fee)).toBe(12);
});
