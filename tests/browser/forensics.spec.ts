import { test, expect } from "@playwright/test";
import { mockFeeds } from "./fixtures";

for (const caseId of ["coldcard", "liquid"]) {
  test(`${caseId} watch retains cached readings on failure and stops polling when hidden`, async ({ page }) => {
    await mockFeeds(page);
    await page.clock.install();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let requests = 0;
    await page.route("**/api/forensics/watch?**", (route) => {
      requests++;
      return route.fulfill({ json: { fetchedAt: Date.now(), priceUsd: 100000, watched: [], movers: [], totalLiveBalanceSats: 0, summary: { generatedAt: new Date().toISOString(), source: "Fixture", totalSweptSats: 0, victimAddressCount: 0, sweepTxCount: 0, blockSpan: [1, 2], firstSweepTime: 0, lastSweepTime: 0, waveCount: 0, attribution: "Fixture" } } });
    });
    await page.goto(`/btc/forensics?case=${caseId}`);
    await expect(page.locator("main time").first()).toBeVisible();
    await page.route("**/api/forensics/watch?**", (route) => { requests++; return route.fulfill({ status: 503, json: {} }); });
    await page.clock.fastForward(61_000);
    await expect(page.getByText("Last successful reading retained", { exact: true })).toBeVisible();
    await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
    const before = requests;
    await page.clock.fastForward(180_000);
    expect(requests).toBe(before);
    expect(errors).toEqual([]);
  });
}

test("a newer forensic lookup replaces a slow earlier one", async ({ page }) => {
  await mockFeeds(page);
  const oldAddress = "bc1qoldoldoldoldoldoldoldoldoldoldoldoldoldoldoldoldoldold";
  const newAddress = "bc1qnewnewnewnewnewnewnewnewnewnewnewnewnewnewnewnew";
  let releaseOld!: () => void;
  const old = new Promise<void>((resolve) => { releaseOld = resolve; });
  await page.route(`**/api/forensics/lookup?address=${oldAddress}`, async (route) => {
    await old;
    await route.fulfill({ json: { fetchedAt: Date.now(), query: oldAddress, normalized: oldAddress, valid: true, hit: { kind: "holder", address: oldAddress, holder: { label: "Old result" } } } }).catch(() => {});
  });
  await page.route(`**/api/forensics/lookup?address=${newAddress}`, (route) => route.fulfill({ json: { fetchedAt: Date.now(), query: newAddress, normalized: newAddress, valid: true, hit: { kind: "holder", address: newAddress, holder: { label: "New result" } } } }));
  await page.goto("/btc/forensics?case=coldcard");
  const input = page.getByPlaceholder("bc1q… or 1… / 3…");
  await input.fill(oldAddress);
  const oldRequest = page.waitForRequest((request) => request.url().includes(`address=${oldAddress}`));
  await page.getByRole("button", { name: "Look up" }).click();
  await oldRequest;
  await input.fill(newAddress);
  await page.getByRole("button", { name: "Check latest" }).click();
  await expect(page.getByText("New result", { exact: true })).toBeVisible();
  releaseOld();
  await expect(page.getByText("Old result", { exact: true })).toHaveCount(0);
});
