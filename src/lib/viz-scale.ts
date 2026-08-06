/** Display normalization and AAA material mapping for instruments.
 *  Pure helpers only: unit-tested so live metrics keep driving the art.
 */

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

export type InstrumentDisplayMode = "compact" | "default" | "large" | "stage";

/** Pixel size for square dials / glyphs by presentation mode. */
export function instrumentCanvasSize(
  mode: InstrumentDisplayMode,
  base = 140,
): number {
  switch (mode) {
    case "compact":
      return Math.round(base * 0.7);
    case "large":
      return Math.round(base * 1.35);
    case "stage":
      // Clean fullscreen: TV-distance scale (~3.6× board base)
      return Math.round(base * 3.6);
    default:
      return base;
  }
}

/** Resolve display mode from instrument props. */
export function resolveDisplayMode(opts: {
  compact?: boolean;
  large?: boolean;
  stage?: boolean;
}): InstrumentDisplayMode {
  if (opts.stage) return "stage";
  if (opts.compact) return "compact";
  if (opts.large) return "large";
  return "default";
}

/**
 * Outer glow / bloom opacity from a 0-1 intensity driver.
 * Floors stay visible on TV; caps avoid blow-out.
 */
export function materialGlowOpacity(intensity: number): number {
  const t = clamp(intensity, 0, 1);
  return clamp(0.22 + t * 0.55, 0.18, 0.85);
}

/** Stroke weight for primary instrument arcs / rings. */
export function materialStrokeWeight(
  intensity: number,
  mode: InstrumentDisplayMode = "default",
): number {
  const base =
    mode === "stage" ? 5.2 : mode === "large" ? 3.4 : mode === "compact" ? 2 : 2.8;
  return clamp(base + intensity * 1.2, 1.5, 6);
}

/**
 * Particle / ember / grain budget for decorative density.
 * Reduced-motion always returns 0 so non-essential motion short-circuits.
 */
export function particleBudget(opts: {
  intensity: number;
  mode?: InstrumentDisplayMode;
  reduceMotion?: boolean;
  base?: number;
  max?: number;
}): number {
  if (opts.reduceMotion) return 0;
  const mode = opts.mode ?? "default";
  const base = opts.base ?? 12;
  const maxDefault =
    mode === "stage" ? 48 : mode === "large" ? 28 : mode === "compact" ? 8 : 18;
  const max = opts.max ?? maxDefault;
  const mult =
    mode === "stage" ? 2.2 : mode === "large" ? 1.45 : mode === "compact" ? 0.55 : 1;
  return Math.round(clamp(base * mult * (0.45 + clamp(opts.intensity, 0, 1) * 0.9), 0, max));
}

/**
 * Ambient density mote count for canvas atmospheres (fee mist, etc.).
 * Separate from clickable sample particles.
 */
export function densityMoteBudget(opts: {
  intensity: number;
  stage?: boolean;
  reduceMotion?: boolean;
}): number {
  if (opts.reduceMotion) return 0;
  const intensity = clamp(opts.intensity, 0, 1);
  const lo = opts.stage ? 90 : 40;
  const hi = opts.stage ? 280 : 120;
  return Math.round(clamp(lo + intensity * (hi - lo), lo, hi));
}

/** Tide / fill height 0-1 from a live value against a soft cap. */
export function tideHeight(
  value: number | null | undefined,
  cap: number,
  floor = 0.12,
  ceil = 0.92,
): number {
  if (value == null || !Number.isFinite(value) || cap <= 0) return lerp(floor, ceil, 0.35);
  return clamp(value / (cap * 1.15), floor, ceil);
}

/** Signed tide around midline (funding, etc.). */
export function signedTideHeight(
  value: number | null | undefined,
  absCap: number,
  mid = 0.45,
): number {
  if (value == null || !Number.isFinite(value) || absCap <= 0) return mid;
  return clamp(mid + value / (absCap * 2.2), 0.12, 0.9);
}

/** Core kiln / heat radius from intensity (viewBox units). */
export function forgeCoreRadius(intensity: number, mode: InstrumentDisplayMode = "default"): number {
  const scale = mode === "stage" ? 1.15 : mode === "large" ? 1.05 : 1;
  return (10 + clamp(intensity, 0, 1) * 8) * scale;
}

/** Reading label scale class hints for TV distance (px font size). */
export function readingFontPx(mode: InstrumentDisplayMode): number {
  switch (mode) {
    case "stage":
      return 72;
    case "large":
      return 18;
    case "compact":
      return 11;
    default:
      return 13;
  }
}

/** CSS filter drop-shadow strength (px blur) for instrument faces. */
export function materialDropShadowBlur(intensity: number, mode: InstrumentDisplayMode): number {
  const t = clamp(intensity, 0, 1);
  const base = mode === "stage" ? 18 : mode === "large" ? 12 : mode === "compact" ? 4 : 8;
  return Math.round(base + t * 10);
}

/**
 * Map seconds-since / target into a continuous hand angle (degrees).
 * Uncapped so the dial never freezes past one revolution.
 */
export function metronomeHandDegrees(secondsSince: number | null, target = 600): number {
  if (secondsSince == null || !Number.isFinite(secondsSince) || target <= 0) return 0;
  return (secondsSince / target) * 360;
}

/** Arc dash length for a circular progress ring. */
export function ringDashLength(progress01: number, radius: number): number {
  const p = clamp(progress01, 0, 1);
  return p * 2 * Math.PI * radius;
}

/**
 * Build a document-unique SVG paint/filter id from React.useId().
 * Board + stage can mount the same instrument twice; bare ids collide.
 */
export function svgDefId(prefix: string, reactId: string): string {
  const clean = reactId.replace(/:/g, "");
  return `${prefix}-${clean}`;
}
