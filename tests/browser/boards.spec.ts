import { test, expect } from "@playwright/test";
import { mockFeeds } from "./fixtures";

for (const chain of ["btc", "eth", "sol", "hype"]) {
  test(`${chain} board renders with reduced motion and fits the viewport`, async ({ page }, testInfo) => {
    await mockFeeds(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/${chain}`);
    await expect(page.getByRole("heading", { name: `${chain.toUpperCase()} Dials`, exact: true })).toBeVisible();
    await expect(page.getByText("Baseline saved for your next visit.", { exact: true })).toBeVisible();
    const instrument = page.locator('[data-instrument-active]').first();
    await instrument.scrollIntoViewIfNeeded();
    await expect(instrument.locator("svg").first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${chain}-board.png`) });
    const chart = page.getByRole("slider", { name: "Historical USD price chart" });
    await chart.scrollIntoViewIfNeeded();
    await chart.focus();
    await page.keyboard.press("Home");
    await expect(chart).toHaveAttribute("aria-valuenow", "0");
    expect(errors).toEqual([]);
  });
}

test("unknown routes and chains get a 404 with links back to every board", async ({ page }) => {
  await mockFeeds(page);
  for (const path of ["/no-such-page", "/doge"]) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "No dial at this address" })).toBeVisible();
    for (const name of ["Bitcoin", "Ethereum", "Solana", "Hyperliquid"]) {
      await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
    }
  }
  await page.getByRole("link", { name: "Solana", exact: true }).click();
  await expect(page).toHaveURL(/\/sol$/);
});
