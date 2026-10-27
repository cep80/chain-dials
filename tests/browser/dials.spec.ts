import { test, expect } from "@playwright/test";
import { mockFeeds, snapshot } from "./fixtures";

for (const chain of ["btc", "eth", "sol", "hype"]) {
  test(`${chain} instruments fit and remain readable through all five expanded views`, async ({ page }, testInfo) => {
    await mockFeeds(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/${chain}`);
    const frames = page.locator(".observatory-grid .instrument-frame");
    await expect(frames).toHaveCount(5);
    for (let i = 0; i < 5; i++) {
      const frame = frames.nth(i);
      await frame.scrollIntoViewIfNeeded();
      await frame.getByRole("button", { name: /fullscreen/ }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const art = dialog.locator(".instrument-stage-art");
      await expect(art.locator('svg, canvas, [role="img"], button').first()).toBeVisible();
      expect(await art.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const vectors = art.locator(".dial-canvas");
      if (await vectors.count()) {
        await expect(vectors.first()).toHaveAttribute("data-motion", "still");
        expect(await vectors.first().evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length)).toBe(0);
      }
      if (chain === "eth") await page.screenshot({ path: testInfo.outputPath(`eth-${i}-expanded.png`) });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });
}

test("Ethereum dials distinguish missing data from zero readings", async ({ page }) => {
  await mockFeeds(page);
  await page.route("**/api/suite/snapshot/eth", (route) => route.fulfill({ json: { ...snapshot(), baseFeeSeries: [], prioritySeries: [], burnEthPerBlock: null, securityScore: null, forgeLabel: null } }));
  await page.goto("/eth");
  const tide = page.locator('.instrument-frame[data-instrument="atmosphere"]');
  await expect(tide.getByText("Awaiting base fee", { exact: true })).toBeVisible();
  await expect(tide.getByText("AWAITING FEE SAMPLES", { exact: true })).toBeAttached();
  const candle = page.locator('.instrument-frame[data-instrument="issuance"]');
  await expect(candle.getByText("Burn unavailable", { exact: true })).toBeVisible();
  await expect(candle.locator(".dial-flame")).toHaveCount(0);
});

for (const chain of ["btc", "eth", "sol", "hype"]) {
  test(`${chain} expanded instruments work by keyboard at 320px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await mockFeeds(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${chain}`);

    const frames = page.locator(".observatory-grid .instrument-frame");
    await expect(frames).toHaveCount(5);
    const expand = frames.first().getByRole("button", { name: /fullscreen/ });
    await expand.focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();
    const headings = new Set<string>();
    for (let i = 0; i < 5; i++) {
      headings.add(await dialog.getByRole("heading", { level: 2 }).innerText());
      const art = dialog.locator(".instrument-stage-art");
      await expect(art.locator('svg, canvas, [role="img"], button').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await art.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      expect(await art.evaluate((el) => el.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running").length)).toBe(0);
      await page.keyboard.press("ArrowRight");
    }
    expect(headings.size).toBe(5);
    await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(expand).toBeFocused();
  });
}
