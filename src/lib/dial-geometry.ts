/** Plot real block samples. Invalid readings break the trace instead of becoming zero. */
export function feePlot(values: readonly number[], ceiling: number) {
  const segments: Array<{ line: string; area: string }> = [];
  let points: Array<{ x: number; y: number }> = [];
  const flush = () => {
    if (!points.length) return;
    const line = points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
    segments.push({ line, area: `${line} L${points.at(-1)!.x},178 L${points[0].x},178 Z` });
    points = [];
  };
  values.forEach((value, i) => {
    if (!Number.isFinite(value) || value < 0) { flush(); return; }
    points.push({ x: +(28 + i / Math.max(1, values.length - 1) * 264).toFixed(2), y: +(178 - Math.min(1, value / Math.max(.001, ceiling)) * 126).toFixed(2) });
  });
  flush();
  return segments;
}

/** Stable block fingerprint: every byte, including zero, contributes to the relief. */
export function hashRelief(hash: string) {
  const hex = hash.replace(/^0x/i, "").padEnd(64, "0");
  return Array.from({ length: 64 }, (_, i) => {
    const a = Number.parseInt(hex[i % hex.length], 16);
    const b = Number.parseInt(hex[(i + 17) % hex.length], 16);
    return { lift: 2 + (Number.isFinite(a) ? a : 0) * .72, light: (Number.isFinite(b) ? b : 0) / 15 };
  });
}

/** The 64 hex digits of a hash as numbers 0–15. Missing or invalid digits read as 0. */
export function hashNibbles(hash: string): number[] {
  const hex = hash.replace(/^0x/i, "").toLowerCase().padEnd(64, "0").slice(0, 64);
  return Array.from(hex, (c) => {
    const n = Number.parseInt(c, 16);
    return Number.isFinite(n) ? n : 0;
  });
}

/**
 * Map a positive value onto 0–1 between two decade bounds. Fee samples span
 * several decades, so the jets use this instead of a linear scale.
 */
export function logFraction(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || value <= 0 || min <= 0 || max <= min) return 0;
  const f = (Math.log10(value) - Math.log10(min)) / (Math.log10(max) - Math.log10(min));
  return Math.max(0, Math.min(1, f));
}

/** Decade bounds that contain every positive sample, at least one decade apart. */
export function decadeBounds(values: readonly number[]): { min: number; max: number } {
  const positive = values.filter((v) => Number.isFinite(v) && v > 0);
  if (!positive.length) return { min: 1, max: 10 };
  const lo = Math.floor(Math.log10(Math.min(...positive)));
  const hi = Math.ceil(Math.log10(Math.max(...positive)));
  return { min: 10 ** lo, max: 10 ** Math.max(hi, lo + 1) };
}

/**
 * A ribbon around a ring: one quad per hash digit. The digit sets the band's
 * width; the following digit's parity decides which face of the twist shows.
 */
export function ribbonSegments(hash: string, radius = 62, cx = 120, cy = 120) {
  const digits = hashNibbles(hash);
  const step = (Math.PI * 2) / digits.length;
  const half = (n: number) => 2.6 + n * 0.62;
  const point = (r: number, a: number) => `${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`;
  const SUB = 4;
  return digits.map((n, i) => {
    const next = digits[(i + 1) % digits.length]!;
    const a0 = -Math.PI / 2 + i * step;
    const outer: string[] = [];
    const inner: string[] = [];
    for (let k = 0; k <= SUB; k++) {
      const t = k / SUB;
      const ease = (1 - Math.cos(Math.PI * t)) / 2;
      const h = half(n) + (half(next) - half(n)) * ease;
      const a = a0 + t * step;
      outer.push(point(radius + h, a));
      inner.unshift(point(radius - h, a));
    }
    return { digit: n, front: next % 2 === 0, d: `M${outer.join(" L")} L${inner.join(" L")}Z` };
  });
}

/**
 * Deterministic coral colonies. Every branch is a line from a base point; the
 * growth factor scales length, so a stronger reading grows a taller reef while
 * the shape of each colony stays the same between renders.
 */
export function coralBranches(growth: number, colonies: ReadonlyArray<{ x: number; y: number; lean: number; size: number }>) {
  const g = Math.max(0, Math.min(1, growth));
  const out: Array<{ x1: number; y1: number; x2: number; y2: number; depth: number; tip: boolean }> = [];
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const grow = (x: number, y: number, angle: number, length: number, depth: number) => {
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    const tip = depth === 0;
    out.push({ x1: +x.toFixed(2), y1: +y.toFixed(2), x2: +x2.toFixed(2), y2: +y2.toFixed(2), depth, tip });
    if (tip) return;
    const spread = 0.32 + rand() * 0.22;
    grow(x2, y2, angle - spread, length * (0.7 + rand() * 0.12), depth - 1);
    grow(x2, y2, angle + spread * (0.8 + rand() * 0.4), length * (0.66 + rand() * 0.12), depth - 1);
  };
  for (const c of colonies) grow(c.x, c.y, -Math.PI / 2 + c.lean, c.size * (0.35 + g * 0.65), 4);
  return out;
}
