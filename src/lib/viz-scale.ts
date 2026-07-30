/** Display normalization for instruments. */

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Map hashrate to 0-1 using recent history min/max with padding. */
export function normalizeHashrate(
  current: number | null,
  history: { v: number }[],
): number {
  if (current == null || !Number.isFinite(current)) return 0.35;
  const values = history.map((h) => h.v).filter(Number.isFinite);
  if (values.length < 2) {
    // Rough network-scale fallback (~500-1200 EH/s era)
    const eh = current / 1e18;
    return clamp((eh - 400) / 800, 0.15, 1);
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max <= min) return 0.5;
  const pad = (max - min) * 0.08;
  return clamp((current - (min - pad)) / (max - min + pad * 2), 0.12, 1);
}

export function pressureIntensity(pressure: number | null): number {
  if (pressure == null) return 0.2;
  return clamp(pressure / 200, 0.08, 1);
}

export function metronomeProgress(secondsSince: number | null, target = 600): number {
  if (secondsSince == null || !Number.isFinite(secondsSince)) return 0;
  return clamp(secondsSince / target, 0, 1.5);
}

export type MetronomeTone = "calm" | "late" | "stale";

export function metronomeTone(
  secondsSince: number | null,
  target = 600,
): MetronomeTone {
  if (secondsSince == null) return "calm";
  if (secondsSince > target * 2) return "stale";
  if (secondsSince > target * 1.2) return "late";
  return "calm";
}
