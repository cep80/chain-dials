import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { ADDRESS_A, ADDRESS_B, mockFeeds, wallet } from "./fixtures";

test.beforeEach(async ({ page }) => { await mockFeeds(page); });

test("watchlist survives storage failures in-session and retries durable saving", async ({ page, context }) => {
  await page.goto(`/eth/wallet?a=${ADDRESS_A}`);
  await expect(page.getByText("2 ETH", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.assign(window, { restoreWatchStorage: () => { Storage.prototype.setItem = original; } });
    Storage.prototype.setItem = function(key, value) {
      if (key === "chain-dials:wallet-watch:v1") throw new DOMException("Full", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await page.getByLabel("Watch label", { exact: true }).fill("Unsaved treasury");
  await page.getByRole("button", { name: "Watch", exact: true }).click();
  const row = page.getByTestId("watched-wallet");
  await expect(row.getByText("Unsaved treasury", { exact: true })).toBeVisible();
  await expect(page.getByText(/Watchlist changes are only saved for this session/)).toBeVisible();
  await row.getByRole("button", { name: "Edit label" }).click();
  await row.getByLabel(`Label for ${ADDRESS_A}`).fill("Recovered treasury");
  await row.getByRole("button", { name: "Save label" }).click();
  const other = await context.newPage();
  await other.goto("/eth/wallet");
  await other.evaluate(() => localStorage.setItem("chain-dials:wallet-watch:v1", JSON.stringify({
    sol: [{ address: "So11111111111111111111111111111111111111112", label: "Other tab", addedAt: 1 }],
    eth: [{ address: "0x2222222222222222222222222222222222222222", label: "Other ETH", addedAt: 2 }],
  })));
  await other.close();
  await page.evaluate(() => (window as unknown as { restoreWatchStorage: () => void }).restoreWatchStorage());
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(page.getByText(/Watchlist changes are only saved for this session/)).toHaveCount(0);
  await page.reload();
  await expect(row.getByText("Recovered treasury", { exact: true })).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("chain-dials:wallet-watch:v1") ?? "{}") as Record<string, Array<{ label: string }>>);
  expect(stored.sol?.map((entry) => entry.label)).toEqual(["Other tab"]);
  expect(stored.eth?.map((entry) => entry.label).sort()).toEqual(["Other ETH", "Recovered treasury"]);
});

test("watchlist changes synchronize across tabs", async ({ page, context }) => {
  await page.goto(`/eth/wallet?a=${ADDRESS_A}`);
  await page.getByLabel("Watch label", { exact: true }).fill("Shared treasury");
  await page.getByRole("button", { name: "Watch", exact: true }).click();
  const other = await context.newPage();
  await mockFeeds(other);
  await other.goto("/eth/wallet");
  await expect(other.getByTestId("watched-wallet").getByText("Shared treasury", { exact: true })).toBeVisible();
  await other.getByRole("button", { name: "Stop watching Shared treasury" }).click();
  await expect(page.getByTestId("watched-wallet")).toHaveCount(0);
  await other.close();
});

test("lookup, activity search, filters and CSV download", async ({ page }) => {
  await page.goto("/eth/wallet");
  await page.getByLabel("Ethereum address", { exact: true }).fill(ADDRESS_A);
  await page.getByRole("button", { name: "Look up", exact: true }).click();
  await expect(page.getByText("2 ETH", { exact: true })).toBeVisible();
  await page.getByLabel("Filter activity").selectOption("outgoing");
  await expect(page.getByRole("status").filter({ hasText: "loaded entries" })).toContainText("1 of 3");
  await page.getByLabel("Search recent activity").fill("deposit");
  await expect(page.getByText("No activity matches these filters.")).toBeVisible();
  await page.getByLabel("Search recent activity").fill("");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadEvent;
  const contents = await readFile((await download.path())!, "utf8");
  expect(contents).toContain("outgoing-tx");
  expect(contents).not.toContain("incoming-tx");
  expect(contents).toContain('"-1","ETH"');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("watch labels persist, balance changes are visible, and refresh failures retain balances", async ({ page }) => {
  await page.goto(`/eth/wallet?a=${ADDRESS_A}`);
  await page.getByLabel("Watch label", { exact: true }).fill("Treasury");
  await page.getByRole("button", { name: "Watch", exact: true }).click();
  const row = page.getByTestId("watched-wallet");
  await expect(row.getByText("Treasury", { exact: true })).toBeVisible();
  await row.getByRole("button", { name: "Edit label" }).click();
  await row.getByLabel(`Label for ${ADDRESS_A}`).fill("Savings");
  await row.getByRole("button", { name: "Save label" }).click();
  await page.reload();
  await expect(row.getByText("Savings", { exact: true })).toBeVisible();
  await page.route("**/api/suite/wallet/eth?**", (route) => route.fulfill({ json: wallet(ADDRESS_A, 3) }));
  await row.getByRole("button", { name: "Refresh balance", exact: true }).click();
  await expect(row.getByText("3 ETH", { exact: true })).toBeVisible();
  await expect(row.getByText("+1 ETH since last check", { exact: true })).toBeVisible();
  await page.route("**/api/suite/wallet/eth?**", (route) => route.fulfill({ status: 503, json: {} }));
  await row.getByRole("button", { name: "Refresh balance", exact: true }).click();
  await expect(row.getByText("Stale", { exact: true })).toBeVisible();
  await expect(row.getByText("3 ETH", { exact: true })).toBeVisible();
  await expect(row.getByText("Last successful reading retained")).toBeVisible();
});

test("a slow response never replaces a newer wallet lookup", async ({ page }) => {
  let release!: () => void;
  const slow = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`**/api/suite/wallet/eth?address=${ADDRESS_A}`, async (route) => {
    await slow;
    await route.fulfill({ json: wallet(ADDRESS_A, 99) }).catch(() => {});
  });
  await page.goto(`/eth/wallet?a=${ADDRESS_A}`);
  await page.evaluate((address) => window.history.pushState(null, "", `/eth/wallet?a=${address}`), ADDRESS_B);
  await expect(page.getByText("2 ETH", { exact: true })).toBeVisible();
  release();
  await expect(page.getByText(ADDRESS_B, { exact: true })).toBeVisible();
  await expect(page.getByText("99 ETH", { exact: true })).toHaveCount(0);
});

test("private-looking input stays local and displays feedback on an empty explorer", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/eth/wallet");
  const secret = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda omega";
  await page.getByLabel("Ethereum address", { exact: true }).fill(secret);
  await page.getByRole("button", { name: "Look up", exact: true }).click();
  await expect(page.getByText(/That looks like a seed or private key/)).toBeVisible();
  expect(page.url()).not.toContain("alpha");
  expect(requests.some((url) => url.includes("alpha"))).toBe(false);
});
