/**
 * Pins free-vs-Pro baseline from shipped modules so monetization analysis
 * cannot claim charts/wall are paid when code says free.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FREE_PRICE_RANGES,
  PRICE_RANGE_ORDER,
  type PriceRangeId,
} from "@/lib/price/types";
import { PRO_PRICE_LABEL, PRO_PRICE_USD, isProActive } from "@/lib/pro";

const root = process.cwd();

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("Pro monetization baseline (shipped free vs Pro)", () => {
  it("exposes every chart range as free (no history paywall)", () => {
    expect(FREE_PRICE_RANGES).toEqual(PRICE_RANGE_ORDER);
    for (const id of PRICE_RANGE_ORDER as PriceRangeId[]) {
      expect(FREE_PRICE_RANGES).toContain(id);
    }
  });

  it("price chart panel does not gate ranges or CSV on Pro", () => {
    const chart = readSrc("src/components/price/PriceChartPanel.tsx");
    expect(chart).not.toMatch(/CSV · Pro/);
    expect(chart).not.toMatch(/useProAccess/);
    expect(chart).toMatch(/PRICE_RANGE_ORDER\.map/);
    expect(chart).toMatch(/\.csv/);
  });

  it("Pro APIs gate cloud extras (alerts, layouts, wall packs, desks)", () => {
    const alerts = readSrc("src/app/api/pro/alerts/route.ts");
    const layouts = readSrc("src/app/api/pro/layouts/route.ts");
    const walls = readSrc("src/app/api/pro/wall-packs/route.ts");
    const desks = readSrc("src/app/api/pro/desks/route.ts");
    expect(alerts).toMatch(/isProActive/);
    expect(alerts).toMatch(/Pro subscription required for alert rules/);
    expect(layouts).toMatch(/isProActive/);
    expect(layouts).toMatch(/Pro subscription required for saved layouts/);
    expect(walls).toMatch(/isProActive/);
    expect(walls).toMatch(/wall packs/i);
    expect(desks).toMatch(/isProActive/);
    expect(desks).toMatch(/forensics desks/i);
  });

  it("Pro marketing copy keeps wall and boards free", () => {
    const proPage = readSrc("src/app/[chain]/pro/page.tsx");
    const teaser = readSrc("src/components/monetization/ProTeaser.tsx");
    expect(proPage).toMatch(/wall/i);
    expect(proPage).toMatch(/free/i);
    expect(proPage).toMatch(/instrument/i);
    expect(proPage).toMatch(/control room|wall pack/i);
    expect(proPage).toMatch(/layout/i);
    expect(teaser).toMatch(/Free boards|Boards stay free/i);
    expect(teaser).toMatch(/wall pack|control room|instrument/i);
  });

  it("display price is optional-extras tier (shipped constants)", () => {
    expect(PRO_PRICE_USD).toBe(3);
    expect(PRO_PRICE_LABEL).toBe("$3/mo");
  });

  it("isProActive reflects subscription status for cloud extras", () => {
    expect(isProActive("none")).toBe(false);
    expect(isProActive("active")).toBe(true);
    expect(isProActive("trialing")).toBe(true);
    expect(isProActive("canceled")).toBe(false);
    expect(isProActive("past_due")).toBe(true);
  });
});
