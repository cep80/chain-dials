import { test, expect } from "@playwright/test";
import { mockFeeds } from "./fixtures";

test("Bitcoin fees remain stale when other feeds recover and polling pauses while hidden", async ({ page }) => {
  await mockFeeds(page);
  await page.clock.install();
  let feeRequests = 0;
  page.on("request", (request) => { if (request.url().endsWith("/api/mempool/v1/fees/recommended")) feeRequests++; });
  await page.goto("/btc");
  const fees = page.locator('section[aria-labelledby="module-fees"]');
  await expect(fees.getByText("Live", { exact: true })).toBeVisible();
  await page.route("**/api/mempool/v1/fees/recommended", (route) => route.fulfill({ status: 429, headers: { "retry-after": "60" }, json: {} }));
  await page.clock.fastForward(46_000);
  await expect(fees.getByText("Stale", { exact: true })).toBeVisible();
  await expect(fees.getByText("Last successful reading retained")).toBeVisible();
  const afterFailure = feeRequests;
  await page.clock.fastForward(30_000);
  expect(feeRequests).toBe(afterFailure);
  await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await page.clock.fastForward(180_000);
  expect(feeRequests).toBe(afterFailure);
  await page.route("**/api/mempool/v1/fees/recommended", (route) => route.fulfill({ json: { fastestFee: 4, halfHourFee: 3, hourFee: 2, economyFee: 1, minimumFee: 1 } }));
  await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(fees.getByText("Live", { exact: true })).toBeVisible();
  expect(feeRequests).toBe(afterFailure + 1);
});

test("an older REST fee response cannot replace a newer streamed reading", async ({ page }) => {
  await mockFeeds(page);
  let sendFees: ((fee: number) => void) | null = null;
  await page.routeWebSocket(/mempool/, (socket) => {
    sendFees = (fee) => socket.send(JSON.stringify({ fees: { fastestFee: fee, halfHourFee: fee, hourFee: fee, economyFee: fee } }));
  });
  let releaseRest: (() => void) | null = null;
  let restRequested = false;
  let restFulfilled = false;
  await page.route("**/api/mempool/v1/fees/recommended", async (route) => {
    restRequested = true;
    await new Promise<void>((resolve) => { releaseRest = resolve; });
    await route.fulfill({ json: { fastestFee: 12, halfHourFee: 10, hourFee: 8, economyFee: 6, minimumFee: 1 } });
    restFulfilled = true;
  });
  await page.goto("/btc");
  await expect.poll(() => restRequested && sendFees != null).toBe(true);
  sendFees!(99);
  const fees = page.locator('section[aria-labelledby="module-fees"]');
  await expect(fees.getByText("99 sat/vB").first()).toBeVisible();
  releaseRest!();
  await expect.poll(() => restFulfilled).toBe(true);
  // Allow the fulfilled response to pass through JSON parsing and React's commit.
  await page.waitForTimeout(150);
  await expect(fees.getByText("99 sat/vB").first()).toBeVisible();
  await expect(fees.getByText("12 sat/vB")).toHaveCount(0);
});

test("mining shows independent hashrate and retarget ages", async ({ page }) => {
  await mockFeeds(page);
  await page.clock.install();
  await page.goto("/btc");
  const mining = page.locator('section[aria-labelledby="module-mining"]');
  await expect(mining.getByText("Hashrate Live")).toBeVisible();
  await expect(mining.getByText("Retarget Live")).toBeVisible();
  await page.route("**/api/mempool/v1/difficulty-adjustment", (route) => route.fulfill({ status: 503, json: {} }));
  await page.clock.fastForward(46_000);
  await expect(mining.getByText("Retarget Stale")).toBeVisible();
  await expect(mining.getByText("Hashrate Live")).toBeVisible();
});

test("suite retains successful fee readings when fee refresh fails but tips succeed", async ({ page }) => {
  await mockFeeds(page);
  await page.clock.install();
  await page.goto("/");
  const heartbeat = page.getByRole("region", { name: "Compare heartbeat across chains" });
  const eth = heartbeat.getByRole("link").filter({ hasText: "ETH" });
  await expect(eth).toContainText("12");
  await page.route("**/api/suite/snapshot/eth", (route) => route.fulfill({ status: 503, json: {} }));
  await page.clock.fastForward(16_000);
  await expect(eth.getByText("Stale", { exact: true })).toBeVisible();
  await expect(eth).toContainText("12");
  await expect(eth.getByText("Last successful reading retained")).toBeVisible();
});

test("hidden boards pause requests and resume with fresh readings", async ({ page }) => {
  await mockFeeds(page);
  await page.clock.install();
  const requests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/api/suite/")) requests.push(request.url()); });
  await page.goto("/eth");
  await expect(page.getByRole("slider", { name: "Historical USD price chart" })).toBeVisible();
  await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
  const before = requests.length;
  await page.clock.fastForward(180_000);
  expect(requests.length).toBe(before);
  await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect.poll(() => requests.length).toBeGreaterThan(before);
});
