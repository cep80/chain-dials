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
