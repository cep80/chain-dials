#!/usr/bin/env node
/**
 * Store screenshots and the Play feature graphic, from a running build with
 * live feeds.
 *
 *   npm run build && npm run start
 *   npm run store:screenshots            # BASE=http://localhost:3000 by default
 *
 * Writes docs/store/screenshots/{ios-6.9,android-phone}/NN-name.png and
 * docs/store/screenshots/play-feature-graphic.png. Shot list follows
 * docs/store/listing.md.
 */
import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = path.resolve("docs/store/screenshots");

// CSS viewport × deviceScaleFactor = store pixel size.
const DEVICES = [
  // App Store 6.9" / 6.7" slot: 1290×2796.
  { dir: "ios-6.9", viewport: { width: 430, height: 932 }, scale: 3, mobile: true },
  // Play phone: 1080×2340.
  { dir: "android-phone", viewport: { width: 360, height: 780 }, scale: 3, mobile: true },
];

const SHOTS = [
  ["01-home", "/"],
  ["02-bitcoin", "/btc"],
  ["03-metronome", "/btc/i/metronome"],
  ["04-ethereum", "/eth"],
  ["05-solana", "/sol"],
  ["06-hyperliquid", "/hype"],
];

// Long enough for the first REST snapshot and WebSocket tick to land and the
// dials to settle out of their loading sweep.
const SETTLE_MS = Number(process.env.SETTLE_MS ?? 9000);

const browser = await chromium.launch();
try {
  for (const d of DEVICES) {
    await mkdir(path.join(OUT, d.dir), { recursive: true });
    const ctx = await browser.newContext({
      viewport: d.viewport,
      deviceScaleFactor: d.scale,
      isMobile: d.mobile,
      hasTouch: d.mobile,
      colorScheme: "dark",
    });
    // Live chains find blocks every few seconds; keep the "New block" toast
    // from landing on top of the tiles. Same switch a user flips in Settings.
    await ctx.addInitScript(() => {
      localStorage.setItem("chain-dials:settings:v1", JSON.stringify({ blockToasts: false }));
    });
    for (const [name, route] of SHOTS) {
      const page = await ctx.newPage();
      await page.goto(BASE + route, { waitUntil: "load" });
      // Scrollbar, plus the 700ms new-block flash outline around the board.
      await page.addStyleTag({
        content: "::-webkit-scrollbar{display:none} [aria-hidden].inset-0.border-2.border-accent{display:none}",
      });
      await page.waitForTimeout(SETTLE_MS);
      const file = path.join(OUT, d.dir, `${name}.png`);
      await page.screenshot({ path: file });
      console.log(path.relative(process.cwd(), file));
      await page.close();
    }
    await ctx.close();
  }

  const icon = (await readFile("public/icons/icon-512.png")).toString("base64");
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  await page.setContent(`<!doctype html>
<html><head>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@800&family=IBM+Plex+Mono:wght@500&display=block" rel="stylesheet">
<style>
  html,body{margin:0;height:100%;background:#0a0c10;color:#f3efe6}
  body{display:flex;align-items:center;gap:56px;padding:0 96px;box-sizing:border-box;
    background:radial-gradient(circle at 18% 50%,rgba(247,147,26,.16),transparent 42%),#0a0c10}
  img{width:220px;height:220px;border-radius:44px}
  h1{font:800 84px/1 Syne,system-ui,sans-serif;letter-spacing:-.02em;margin:0}
  p{font:500 22px/1.4 "IBM Plex Mono",ui-monospace,monospace;color:#a8a195;margin:22px 0 0;letter-spacing:.04em}
  b{color:#f7931a;font-weight:500}
</style></head>
<body><img src="data:image/png;base64,${icon}" alt="">
<div><h1>Chain Dials</h1><p><b>BTC</b> · ETH · SOL · HYPE<br>live network dials</p></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const fg = path.join(OUT, "play-feature-graphic.png");
  await page.screenshot({ path: fg });
  console.log(path.relative(process.cwd(), fg));
} finally {
  await browser.close();
}
