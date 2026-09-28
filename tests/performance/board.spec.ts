import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { mockFeeds } from "../browser/fixtures";

test("profile a mobile board with deterministic feeds and four-times CPU slowdown", async ({ page }, testInfo) => {
  await mockFeeds(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Performance.enable");
  const api: string[] = [];
  page.on("request", (request) => { const url = new URL(request.url()); if (url.pathname.startsWith("/api/")) api.push(url.pathname + url.search); });
  const metric = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((item) => [item.name, item.value]));
  const start = Date.now();
  await page.goto("/eth");
  await expect(page.getByRole("heading", { name: "ETH Dials" })).toBeVisible();
  await expect(page.getByRole("slider", { name: "Historical USD price chart" })).toBeAttached();
  const readyMs = Date.now() - start;
  const before = await metric();
  // Fixed observation windows are intentional for CPU and request-count measurement.
  await page.waitForTimeout(5000);
  const after = await metric();
  const visibleRequests = api.length;
  await page.getByRole("slider", { name: "Historical USD price chart" }).scrollIntoViewIfNeeded();
  const scrolledBefore = await metric();
  await page.waitForTimeout(5000);
  const scrolledAfter = await metric();
  const resources = await page.evaluate(() => performance.getEntriesByType("resource").filter((entry) => (entry as PerformanceResourceTiming).initiatorType === "script").map((entry) => ({ name: entry.name.split("/").at(-1), bytes: (entry as PerformanceResourceTiming).decodedBodySize })));
  await page.screenshot({ path: testInfo.outputPath("mobile-chart.png"), fullPage: false });
  const result = {
    phase: process.env.PROFILE_PHASE ?? "current", capturedAt: new Date().toISOString(),
    method: "Production build; Chromium Pixel 7 emulation; 4x CPU throttle; deterministic API fixtures; local server; 5s visible and 5s scrolled observation windows. Not a real-device or live-provider benchmark.",
    readyMs, visibleTaskMs: ((after.TaskDuration ?? 0) - (before.TaskDuration ?? 0)) * 1000,
    scrolledTaskMs: ((scrolledAfter.TaskDuration ?? 0) - (scrolledBefore.TaskDuration ?? 0)) * 1000,
    scriptBytes: resources.reduce((sum, resource) => sum + resource.bytes, 0), scriptCount: resources.length,
    visibleRequests, apiRequests: api.length, requestsByUrl: Object.fromEntries([...new Set(api)].map((url) => [url, api.filter((value) => value === url).length])),
  };
  const phase = result.phase.replace(/[^a-z0-9-]/gi, "");
  await mkdir("docs/performance", { recursive: true });
  await writeFile(`docs/performance/${phase}.json`, JSON.stringify(result, null, 2) + "\n");
  await testInfo.attach("profile", { body: JSON.stringify(result, null, 2), contentType: "application/json" });
});
