import { describe, expect, it } from "vitest";
import { estimateCanvasBytes, tallyTags } from "./resource-inventory";

describe("resource inventory", () => {
  it("tallies svg work separately from plain html nodes", () => {
    const tally = tallyTags(["DIV", "svg", "defs", "radialGradient", "linearGradient", "filter", "feGaussianBlur", "circle", "path", "CANVAS", "P"]);
    expect(tally).toEqual({ nodes: 11, svgElements: 8, svgFilters: 1, svgGradients: 2, canvases: 1 });
  });

  it("estimates canvas backing bytes as RGBA and ignores empty canvases", () => {
    expect(estimateCanvasBytes([{ width: 100, height: 50 }, { width: 0, height: 10 }, { width: Number.NaN, height: 10 }]))
      .toEqual({ canvasPixels: 5000, canvasBytesEstimate: 20000 });
    expect(estimateCanvasBytes([])).toEqual({ canvasPixels: 0, canvasBytesEstimate: 0 });
  });
});
