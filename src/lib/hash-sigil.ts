/** Deterministic geometry from a Bitcoin block hash. */

export interface SigilSegment {
  type: "arc" | "line" | "dot" | "chord";
  x1: number;
  y1: number;
  x2?: number;
  y2?: number;
  r?: number;
  start?: number;
  end?: number;
  weight: number;
  accent: boolean;
}

export interface SigilGeometry {
  segments: SigilSegment[];
  rings: number[];
  seed: string;
}

function nibble(hex: string, i: number): number {
  const c = hex[i % hex.length] ?? "0";
  return parseInt(c, 16) || 0;
}

function pair(hex: string, i: number): number {
  return (nibble(hex, i) << 4) | nibble(hex, i + 1);
}

function px(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Build a unique glyph from a 64-char (or shorter) hex tip hash. */
export function buildSigil(hash: string | null | undefined, size = 100): SigilGeometry {
  const clean = (hash ?? "0").replace(/^0x/i, "").toLowerCase().padEnd(64, "0").slice(0, 64);
  const cx = size / 2;
  const cy = size / 2;
  const segments: SigilSegment[] = [];
  const rings: number[] = [];

  const ringCount = 2 + (nibble(clean, 0) % 3);
  for (let i = 0; i < ringCount; i++) {
    const r = size * (0.18 + i * 0.14 + (nibble(clean, 2 + i) / 16) * 0.04);
    rings.push(px(r));
  }

  const spokeCount = 6 + (nibble(clean, 8) % 7);
  for (let i = 0; i < spokeCount; i++) {
    const angle = ((pair(clean, 10 + i * 2) / 255) * Math.PI * 2 + i) % (Math.PI * 2);
    const len = rings[rings.length - 1] * (0.55 + (nibble(clean, 20 + i) / 16) * 0.45);
    segments.push({
      type: "line",
      x1: px(cx),
      y1: px(cy),
      x2: px(cx + Math.cos(angle) * len),
      y2: px(cy + Math.sin(angle) * len),
      weight: 0.8 + (nibble(clean, 30 + i) % 3) * 0.4,
      accent: nibble(clean, 40 + i) > 11,
    });
  }

  for (let i = 0; i < rings.length; i++) {
    const start = (pair(clean, 48 + i * 2) / 255) * Math.PI * 2;
    const sweep = (0.4 + nibble(clean, 54 + i) / 16) * Math.PI;
    segments.push({
      type: "arc",
      x1: px(cx),
      y1: px(cy),
      r: rings[i],
      start: px(start * 1000) / 1000,
      end: px((start + sweep) * 1000) / 1000,
      weight: 1.2 + (i % 2) * 0.5,
      accent: i === rings.length - 1,
    });
  }

  const outer = rings[rings.length - 1] ?? size * 0.4;
  for (let i = 0; i < 4; i++) {
    const a1 = (pair(clean, 56 + i) / 255) * Math.PI * 2;
    const a2 = a1 + Math.PI * (0.3 + nibble(clean, 60 + i) / 32);
    segments.push({
      type: "chord",
      x1: px(cx + Math.cos(a1) * outer * 0.85),
      y1: px(cy + Math.sin(a1) * outer * 0.85),
      x2: px(cx + Math.cos(a2) * outer * 0.85),
      y2: px(cy + Math.sin(a2) * outer * 0.85),
      weight: 0.7,
      accent: nibble(clean, 62 + i) > 12,
    });
  }

  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + nibble(clean, i) / 16;
    const d = size * (0.06 + (nibble(clean, 5 + i) / 16) * 0.05);
    segments.push({
      type: "dot",
      x1: px(cx + Math.cos(a) * d),
      y1: px(cy + Math.sin(a) * d),
      r: 1.2 + (nibble(clean, 7 + i) % 3) * 0.6,
      weight: 1,
      accent: i === 0,
    });
  }

  return { segments, rings, seed: clean.slice(0, 16) };
}

export function arcPath(
  cx: number,
  cy: number,
  r: number,
  start: number,
  end: number,
): string {
  const x1 = px(cx + Math.cos(start) * r);
  const y1 = px(cy + Math.sin(start) * r);
  const x2 = px(cx + Math.cos(end) * r);
  const y2 = px(cy + Math.sin(end) * r);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}
