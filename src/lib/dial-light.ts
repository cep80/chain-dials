/**
 * One light rig for every instrument. Lit surfaces (bezel metal, dial faces,
 * glass) take their highlight from the same key light so the board reads as one
 * object under one lamp. Emissive sources (forge core, flame, fog) ignore it.
 * Pure helpers only; unit-tested so a tier change cannot alter a reading.
 */

export const LIGHT_RIG = {
  /** Key light sits up and to the left; fractions of the lit shape's box. */
  key: { cx: 0.4, cy: 0.3 },
  /** Metal rims run light to dark along this diagonal. */
  rim: { x1: 0, y1: 0, x2: 1, y2: 1 },
  /** Contact shadow under a bezel, in viewBox units of a 240 dial. */
  shadow: { dy: 3, opacity: 0.35 },
} as const;

/** Key light as SVG gradient attributes. */
export function keyLight(): { cx: string; cy: string } {
  return { cx: `${Math.round(LIGHT_RIG.key.cx * 100)}%`, cy: `${Math.round(LIGHT_RIG.key.cy * 100)}%` };
}

export type QualityTier = "desktop" | "mobile";

/**
 * Coarse pointers are treated as mobile, following the playbook rule.
 * Reduced motion does not lower the tier: it changes motion, not detail.
 */
export function resolveQualityTier(opts: { coarsePointer: boolean; deviceMemoryGb?: number | null }): QualityTier {
  if (opts.coarsePointer) return "mobile";
  if (opts.deviceMemoryGb != null && opts.deviceMemoryGb > 0 && opts.deviceMemoryGb <= 2) return "mobile";
  return "desktop";
}

/** Bezel tick count per tier. Mobile halves the count but keeps the majors aligned. */
export function bezelTickCount(requested: number, tier: QualityTier): number {
  const base = Math.max(4, Math.round(requested));
  if (tier === "desktop") return base;
  const halved = Math.round(base / 2);
  return Math.max(16, halved - (halved % 4));
}

/** Soft SVG blur filters are a per-frame GPU pass; mobile draws without them. */
export function allowSoftFilters(tier: QualityTier): boolean {
  return tier === "desktop";
}
