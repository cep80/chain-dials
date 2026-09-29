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
