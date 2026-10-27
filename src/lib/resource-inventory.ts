/**
 * Scene inventory for a rendered instrument board: node counts, SVG work,
 * canvas backing store bytes (an estimate, labelled as one) and running
 * animations. Pure tallies are separate from the DOM walk so they can be tested.
 */

export interface CanvasSize {
  width: number;
  height: number;
}

export interface ResourceInventory {
  nodes: number;
  svgElements: number;
  svgFilters: number;
  svgGradients: number;
  canvases: number;
  canvasPixels: number;
  /** RGBA bytes for every canvas backing store. Estimate only. */
  canvasBytesEstimate: number;
  runningAnimations: number;
}

const SVG_TAGS = new Set([
  "svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "text", "tspan", "defs",
  "lineargradient", "radialgradient", "stop", "filter", "fegaussianblur", "femerge", "femergenode", "feturbulence",
  "clippath", "mask", "use", "symbol", "pattern", "image", "foreignobject",
]);

export function tallyTags(tags: readonly string[]): Pick<ResourceInventory, "nodes" | "svgElements" | "svgFilters" | "svgGradients" | "canvases"> {
  let svgElements = 0;
  let svgFilters = 0;
  let svgGradients = 0;
  let canvases = 0;
  for (const raw of tags) {
    const tag = raw.toLowerCase();
    if (tag === "canvas") canvases += 1;
    if (tag === "filter") svgFilters += 1;
    if (tag === "lineargradient" || tag === "radialgradient") svgGradients += 1;
    if (SVG_TAGS.has(tag)) svgElements += 1;
  }
  return { nodes: tags.length, svgElements, svgFilters, svgGradients, canvases };
}

export function estimateCanvasBytes(sizes: readonly CanvasSize[]): { canvasPixels: number; canvasBytesEstimate: number } {
  let pixels = 0;
  for (const size of sizes) {
    const w = Number.isFinite(size.width) && size.width > 0 ? Math.floor(size.width) : 0;
    const h = Number.isFinite(size.height) && size.height > 0 ? Math.floor(size.height) : 0;
    pixels += w * h;
  }
  return { canvasPixels: pixels, canvasBytesEstimate: pixels * 4 };
}

/** Walk a live DOM subtree. Only call in a browser. */
export function inventoryElement(root: Element): ResourceInventory {
  const elements = Array.from(root.querySelectorAll("*"));
  const tags = elements.map((el) => el.tagName);
  const canvases = elements.filter((el): el is HTMLCanvasElement => el instanceof HTMLCanvasElement);
  const bytes = estimateCanvasBytes(canvases.map((c) => ({ width: c.width, height: c.height })));
  const animations = typeof root.getAnimations === "function"
    ? root.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length
    : 0;
  return { ...tallyTags(tags), ...bytes, runningAnimations: animations };
}
