"use client";

import { useSyncExternalStore } from "react";
import { resolveQualityTier, type QualityTier } from "@/lib/dial-light";

const COARSE = "(pointer: coarse)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia(COARSE);
  query.addEventListener("change", onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-quality-tier"] });
  return () => {
    query.removeEventListener("change", onChange);
    observer.disconnect();
  };
}

function getSnapshot(): QualityTier {
  if (typeof window === "undefined" || !window.matchMedia) return "desktop";
  // The review harness forces a tier with data-quality-tier on <html>.
  const forced = document.documentElement.dataset.qualityTier;
  if (forced === "mobile" || forced === "desktop") return forced;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null;
  return resolveQualityTier({ coarsePointer: window.matchMedia(COARSE).matches, deviceMemoryGb: memory });
}

/** Server renders the desktop tier; the client corrects after hydration without a mismatch. */
export function useQualityTier(): QualityTier {
  return useSyncExternalStore(subscribe, getSnapshot, () => "desktop");
}
