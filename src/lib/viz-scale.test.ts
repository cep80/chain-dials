import { describe, expect, it } from "vitest";
import {
  clamp,
  densityMoteBudget,
  forgeCoreRadius,
  instrumentCanvasSize,
  lerp,
  materialDropShadowBlur,
  materialGlowOpacity,
  materialStrokeWeight,
  metronomeHandDegrees,
  metronomeProgress,
  metronomeTone,
  normalizeHashrate,
  particleBudget,
  pressureIntensity,
  readingFontPx,
  resolveDisplayMode,
  ringDashLength,
  signedTideHeight,
  svgDefId,
  tideHeight,
} from "./viz-scale";

describe("viz-scale pure mapping helpers", () => {
  it("clamp and lerp bound and interpolate numbers", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(1.5, 0, 3)).toBe(1.5);
    expect(lerp(0, 10, 0.25)).toBe(2.5);
    expect(lerp(10, 0, 0.5)).toBe(5);
  });

  it("normalizeHashrate maps history range and null fallbacks", () => {
    expect(normalizeHashrate(null, [])).toBe(0.35);
    expect(normalizeHashrate(Number.NaN, [])).toBe(0.35);

    const history = [{ v: 100 }, { v: 200 }, { v: 300 }];
    const mid = normalizeHashrate(200, history);
    expect(mid).toBeGreaterThan(0.12);
    expect(mid).toBeLessThan(1);
    expect(normalizeHashrate(100, history)).toBeLessThan(
      normalizeHashrate(300, history),
    );

    // Single-point history uses EH/s fallback branch
    const ehOnly = normalizeHashrate(800e18, [{ v: 800e18 }]);
    expect(ehOnly).toBeGreaterThanOrEqual(0.15);
    expect(ehOnly).toBeLessThanOrEqual(1);
  });

  it("pressureIntensity and metronomeProgress scale live metrics", () => {
    expect(pressureIntensity(null)).toBe(0.2);
    expect(pressureIntensity(0)).toBe(0.08);
    expect(pressureIntensity(100)).toBe(0.5);
    expect(pressureIntensity(400)).toBe(1);

    expect(metronomeProgress(null)).toBe(0);
    expect(metronomeProgress(300, 600)).toBe(0.5);
    expect(metronomeProgress(900, 600)).toBe(1.5);
    expect(metronomeHandDegrees(300, 600)).toBe(180);
    expect(metronomeHandDegrees(null, 600)).toBe(0);
    expect(metronomeHandDegrees(1200, 600)).toBe(720);
  });

  it("metronomeTone reflects lateness against target", () => {
    expect(metronomeTone(null)).toBe("calm");
    expect(metronomeTone(100, 600)).toBe("calm");
    expect(metronomeTone(800, 600)).toBe("late");
    expect(metronomeTone(1300, 600)).toBe("stale");
  });

  it("display mode resolution and canvas sizes grow for wall/stage", () => {
    expect(resolveDisplayMode({})).toBe("default");
    expect(resolveDisplayMode({ compact: true })).toBe("compact");
    expect(resolveDisplayMode({ large: true })).toBe("large");
    expect(resolveDisplayMode({ stage: true, large: true })).toBe("stage");

    const def = instrumentCanvasSize("default", 140);
    const large = instrumentCanvasSize("large", 140);
    const stage = instrumentCanvasSize("stage", 140);
    expect(large).toBeGreaterThan(def);
    expect(stage).toBeGreaterThan(large);
    expect(instrumentCanvasSize("compact", 140)).toBeLessThan(def);

    expect(readingFontPx("stage")).toBeGreaterThan(readingFontPx("large"));
    expect(readingFontPx("large")).toBeGreaterThan(readingFontPx("default"));
  });

  it("material glow/stroke respond to intensity and mode", () => {
    const low = materialGlowOpacity(0.1);
    const high = materialGlowOpacity(0.9);
    expect(high).toBeGreaterThan(low);
    expect(low).toBeGreaterThanOrEqual(0.18);
    expect(high).toBeLessThanOrEqual(0.85);

    expect(materialStrokeWeight(0.8, "stage")).toBeGreaterThan(
      materialStrokeWeight(0.2, "compact"),
    );
    expect(materialDropShadowBlur(0.9, "stage")).toBeGreaterThan(
      materialDropShadowBlur(0.1, "compact"),
    );
    expect(forgeCoreRadius(0.8)).toBeGreaterThan(forgeCoreRadius(0.2));
  });

  it("particleBudget and densityMoteBudget short-circuit on reduced motion", () => {
    expect(
      particleBudget({ intensity: 0.8, reduceMotion: true, mode: "stage" }),
    ).toBe(0);
    expect(
      densityMoteBudget({ intensity: 0.9, stage: true, reduceMotion: true }),
    ).toBe(0);

    const stageN = particleBudget({
      intensity: 0.9,
      mode: "stage",
      reduceMotion: false,
      base: 14,
    });
    const compactN = particleBudget({
      intensity: 0.9,
      mode: "compact",
      reduceMotion: false,
      base: 14,
    });
    expect(stageN).toBeGreaterThan(compactN);
    expect(stageN).toBeGreaterThan(0);

    const denseStage = densityMoteBudget({
      intensity: 1,
      stage: true,
      reduceMotion: false,
    });
    const denseBoard = densityMoteBudget({
      intensity: 0.2,
      stage: false,
      reduceMotion: false,
    });
    expect(denseStage).toBeGreaterThan(denseBoard);
    expect(denseStage).toBeLessThanOrEqual(200);
  });

  it("tideHeight and signedTideHeight map fee/funding values", () => {
    expect(tideHeight(null, 20)).toBeCloseTo(lerp(0.12, 0.92, 0.35), 5);
    const calm = tideHeight(5, 20);
    const hot = tideHeight(30, 20);
    expect(hot).toBeGreaterThan(calm);
    expect(calm).toBeGreaterThanOrEqual(0.12);
    expect(hot).toBeLessThanOrEqual(0.92);

    expect(signedTideHeight(null, 1)).toBe(0.45);
    expect(signedTideHeight(1, 1)).toBeGreaterThan(signedTideHeight(-1, 1));
  });

  it("ringDashLength scales arc progress", () => {
    const r = 52;
    expect(ringDashLength(0, r)).toBe(0);
    expect(ringDashLength(1, r)).toBeCloseTo(2 * Math.PI * r, 5);
    expect(ringDashLength(0.5, r)).toBeCloseTo(Math.PI * r, 5);
    expect(ringDashLength(2, r)).toBeCloseTo(2 * Math.PI * r, 5);
  });

  it("svgDefId uniquifies paint ids for board+stage twin mounts", () => {
    const a = svgDefId("tach-face", ":r1:");
    const b = svgDefId("tach-face", ":r2:");
    expect(a).toBe("tach-face-r1");
    expect(b).toBe("tach-face-r2");
    expect(a).not.toBe(b);
    // Two instances of the same instrument get distinct paint urls
    expect(svgDefId("jet-pad", ":a:")).not.toBe(svgDefId("jet-pad", ":b:"));
  });
});
