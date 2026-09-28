import { test, expect } from "@playwright/test";
import { mockFeeds } from "./fixtures";

test("instruments resume in view and suspend after leaving the viewport", async ({ page }) => {
  await mockFeeds(page);
  await page.goto("/eth");
  const tile = page.locator("[data-instrument-active]").first();
  await tile.scrollIntoViewIfNeeded();
  await expect(tile).toHaveAttribute("data-instrument-active", "true");
  await expect(tile.getByRole("button", { name: /fullscreen/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("slider", { name: "Historical USD price chart" }).scrollIntoViewIfNeeded();
  await expect(tile).toHaveAttribute("data-instrument-active", "false");
  await tile.scrollIntoViewIfNeeded();
  await expect(tile).toHaveAttribute("data-instrument-active", "true");
  await tile.getByRole("button", { name: /fullscreen/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
