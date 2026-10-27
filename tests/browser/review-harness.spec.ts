import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { mockFeeds } from "./fixtures";

/**
 * Drives /review/instruments the way a reviewer would and keeps the reference
 * captures in the repo (docs/instruments/reference). Fixed viewports make runs
 * comparable; the harness itself holds the fixture readings.
 */

const REFERENCE_DIR = "docs/instruments/reference";
const CHAINS = ["btc", "eth", "sol", "hype"] as const;

async function openHarness(page: Page) {
  await mockFeeds(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/review/instruments");
  await expect(page.getByRole("toolbar", { name: "Review controls" })).toBeVisible();
  await expect(page.locator("#review-target .instrument-frame")).toHaveCount(5);
  return errors;
}

async function press(page: Page, legend: string, label: string) {
  const group = page.locator("fieldset", { has: page.locator("legend", { hasText: legend }) });
  await group.getByRole("button", { name: label, exact: true }).click();
}

/** Chain switches lazy-load five instrument chunks; wait for all of them before judging. */
async function selectChain(page: Page, chain: string) {
  await press(page, "Chain", chain.toUpperCase());
  await expect(page.locator("#review-target")).toHaveAttribute("data-chain", chain);
  await expect(page.locator("#review-target .instrument-frame")).toHaveCount(5, { timeout: 20_000 });
  await expect(page.locator("#review-target .instrument-frame-reading")).toHaveCount(5, { timeout: 20_000 });
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("harness is noindex and seeds every chain with fixture readings", async ({ page }) => {
  const errors = await openHarness(page);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  // Auto tier: a coarse pointer (the Pixel 7 project) must resolve to mobile without being forced.
  const autoTier = test.info().project.name === "mobile" ? "mobile" : "desktop";
  await expect(page.locator(`#review-target [data-tier="${autoTier}"]`).first()).toBeAttached();
  for (const chain of CHAINS) {
    await selectChain(page, chain);
    const readings = page.locator("#review-target .instrument-frame-reading");
    await expect(readings).toHaveCount(5);
    for (const text of await readings.allInnerTexts()) expect(text.trim()).not.toBe("");
    await noOverflow(page);
  }
  expect(errors).toEqual([]);
});

test("readings do not change between accent and neutral light", async ({ page }) => {
  await openHarness(page);
  for (const chain of CHAINS) {
    await selectChain(page, chain);
    await press(page, "Light", "Accent");
    const accent = await page.locator("#review-target .instrument-frame-reading").allInnerTexts();
    await press(page, "Light", "Neutral");
    await expect(page.locator("html")).toHaveAttribute("data-review-light", "neutral");
    const neutral = await page.locator("#review-target .instrument-frame-reading").allInnerTexts();
    expect(neutral).toEqual(accent);
  }
});

test("mobile tier halves bezel ticks without touching the reading", async ({ page }) => {
  await openHarness(page);
  await selectChain(page, "eth");
  await press(page, "Tier", "Desktop");
  const lattice = page.locator('#review-target .instrument-frame[data-instrument="metronome"]');
  const before = await lattice.locator(".instrument-frame-reading").innerText();
  const desktopTicks = await lattice.locator('[data-tier="desktop"] line').count();
  await press(page, "Tier", "Mobile");
  await expect(lattice.locator('[data-tier="mobile"]').first()).toBeAttached();
  const mobileTicks = await lattice.locator('[data-tier="mobile"] line').count();
  expect(mobileTicks).toBeLessThan(desktopTicks);
  expect(await lattice.locator(".instrument-frame-reading").innerText()).toBe(before);
});

test("atmosphere fog survives a forced WebGL context loss", async ({ page }) => {
  test.skip(test.info().project.name === "mobile", "Fog is a desktop-tier WebGL pass.");
  await openHarness(page);
  await press(page, "Motion", "Live");
  const atmosphere = page.locator('#review-target .instrument-frame[data-instrument="atmosphere"] [data-fog]');
  await expect(atmosphere).toHaveAttribute("data-fog", "ready", { timeout: 10_000 });
  await page.getByRole("button", { name: "Test graphics recovery" }).click();
  await expect(page.locator("[data-review-recovery]")).toHaveAttribute("data-review-recovery", /lost|restored/);
  await expect(page.locator("[data-review-recovery]")).toHaveAttribute("data-review-recovery", "restored", { timeout: 5_000 });
  await expect(atmosphere).toHaveAttribute("data-fog", "ready", { timeout: 5_000 });
});

test("reference captures: board, bare art, neutral light, late tip, no data", async ({ page }) => {
  test.skip(test.info().project.name === "mobile", "Mobile captures come from the dedicated mobile test.");
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHarness(page);
  await mkdir(REFERENCE_DIR, { recursive: true });
  for (const chain of CHAINS) {
    await selectChain(page, chain);
    await press(page, "Scenario", "Nominal");
    await press(page, "Light", "Accent");
    await press(page, "Chrome", "Frames");
    await page.locator("#review-target").screenshot({ path: `${REFERENCE_DIR}/${chain}-board-accent.png` });
    await press(page, "Light", "Neutral");
    await page.locator("#review-target").screenshot({ path: `${REFERENCE_DIR}/${chain}-board-neutral.png` });
    await press(page, "Chrome", "Bare art");
    await page.locator("#review-target").screenshot({ path: `${REFERENCE_DIR}/${chain}-board-bare.png` });
    await press(page, "Chrome", "Frames");
    await press(page, "Light", "Accent");
    await press(page, "Scenario", "Late tip");
    await page.locator("#review-target").screenshot({ path: `${REFERENCE_DIR}/${chain}-board-late.png` });
    await press(page, "Scenario", "No data");
    await page.locator("#review-target").screenshot({ path: `${REFERENCE_DIR}/${chain}-board-empty.png` });
    await noOverflow(page);
  }
});

test("reference captures: wall and stage at 1920×1080", async ({ page }) => {
  test.skip(test.info().project.name === "mobile", "Wall and stage are TV views.");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openHarness(page);
  await mkdir(REFERENCE_DIR, { recursive: true });
  for (const chain of CHAINS) {
    await selectChain(page, chain);
    await press(page, "View", "Wall");
    await expect(page.locator("#review-target .wall-theater")).toBeVisible();
    await page.locator("#review-target").screenshot({ path: `${REFERENCE_DIR}/${chain}-wall.png` });
    await press(page, "View", "Stage");
    await page.locator("#review-target").getByRole("button", { name: /^01 ·/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS("opacity", "1");
    await expect(dialog.locator(".instrument-stage-art")).toHaveCSS("opacity", "1");
    await page.screenshot({ path: `${REFERENCE_DIR}/${chain}-stage-01.png` });
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(dialog.locator(".instrument-stage-art")).toHaveCSS("opacity", "1");
    await page.screenshot({ path: `${REFERENCE_DIR}/${chain}-stage-03.png` });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await press(page, "View", "Board");
  }
});

test("reference captures: mobile board at 390×844", async ({ page }) => {
  test.skip(test.info().project.name === "desktop", "Phone capture uses the mobile project.");
  await openHarness(page);
  await mkdir(REFERENCE_DIR, { recursive: true });
  // Pin the tier: a beyond-viewport capture can reset Chromium pointer emulation between chains.
  await press(page, "Tier", "Mobile");
  for (const chain of CHAINS) {
    await selectChain(page, chain);
    await expect(page.locator('#review-target [data-tier="mobile"]').first()).toBeAttached();
    await page.locator("#review-target").screenshot({ path: `${REFERENCE_DIR}/${chain}-board-mobile.png` });
    await noOverflow(page);
  }
});

test("scripted review run writes a report with no reading drift", async ({ page }) => {
  test.skip(test.info().project.name === "mobile", "One report per run is enough; desktop runs it.");
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHarness(page);
  await page.getByRole("button", { name: "Run review" }).click();
  const reportNode = page.locator("[data-review-report]");
  await expect(reportNode).toBeVisible({ timeout: 220_000 });
  const report = JSON.parse(await reportNode.innerText()) as { runs: unknown[]; readingDrift: unknown[]; method: string };
  expect(report.runs).toHaveLength(4 * 3 * 2 * 2);
  expect(report.readingDrift).toEqual([]);
  await mkdir(REFERENCE_DIR, { recursive: true });
  await writeFile(`${REFERENCE_DIR}/review-report.json`, JSON.stringify(report, null, 2) + "\n");
});
