import { test, expect } from "@playwright/test";
import { mockFeeds } from "./fixtures";

test.beforeEach(async ({ page }) => { await mockFeeds(page); });

test("chart supports keyboard inspection and saves range and style", async ({ page }) => {
  await page.goto("/eth");
  const chart = page.getByRole("slider", { name: "Historical USD price chart" });
  await chart.scrollIntoViewIfNeeded();
  await chart.focus();
  await chart.press("Home");
  await expect(chart).toHaveAttribute("aria-valuenow", "0");
  await chart.press("ArrowRight");
  await expect(chart).toHaveAttribute("aria-valuenow", "1");
  await chart.press("End");
  await expect(chart).toHaveAttribute("aria-valuenow", "23");
  await page.getByRole("group", { name: "Chart range" }).getByRole("button", { name: "30D", exact: true }).click();
  await page.getByRole("button", { name: "Candles", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "30D", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Candles", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("chart defers forecast requests and shares the seven-day request", async ({ page }) => {
  const ranges: string[] = [];
  page.on("request", (request) => { const url = new URL(request.url()); if (url.pathname.includes("price-history")) ranges.push(url.searchParams.get("range")!); });
  await page.goto("/eth");
  await expect(page.getByRole("slider", { name: "Historical USD price chart" })).toBeVisible();
  expect(ranges).toEqual(["7D"]);
  await page.getByRole("button", { name: "Outlook", exact: true }).click();
  await expect.poll(() => ranges).toEqual(["7D", "1Y"]);
});

test("missing intervals are visibly separated and pointer inspection remains available", async ({ page }) => {
  await page.route("**/api/suite/price-history?**", (route) => {
    const points = [0, 1, 2, 9, 10, 11].map((hour) => ({ t: 1_700_000_000_000 + hour * 3600_000, price: 3000 + hour }));
    return route.fulfill({ json: { chain: "eth", range: "7D", currency: "usd", source: "Fixture", updatedAt: Date.now(), points, candles: [], stats: null } });
  });
  await page.goto("/eth");
  const chart = page.getByRole("slider", { name: "Historical USD price chart" });
  await chart.scrollIntoViewIfNeeded();
  await expect(page.getByText("1 data gap · Missing intervals are not connected.")).toBeVisible();
  await expect(page.getByTestId("price-segment")).toHaveCount(2);
  await chart.click({ position: { x: 10, y: 50 } });
  await expect(chart).toHaveAttribute("aria-valuenow", "0");
});
