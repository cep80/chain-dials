"use client";

import { useEffect } from "react";
import {
  applySettingsToDocument,
  useSettingsStore,
} from "@/lib/settings/store";

/** Hydrate settings from localStorage and keep document dataset in sync. */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useSettingsStore((s) => s.hydrate);
  const newbieTooltips = useSettingsStore((s) => s.newbieTooltips);
  const showTermHints = useSettingsStore((s) => s.showTermHints);
  const blockToasts = useSettingsStore((s) => s.blockToasts);
  const motion = useSettingsStore((s) => s.motion);
  const density = useSettingsStore((s) => s.density);
  const preferredChain = useSettingsStore((s) => s.preferredChain);
  const defaultPriceRange = useSettingsStore((s) => s.defaultPriceRange);
  const hydrated = useSettingsStore((s) => s.hydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    applySettingsToDocument({
      newbieTooltips,
      showTermHints,
      blockToasts,
      motion,
      density,
      preferredChain,
      defaultPriceRange,
    });
  }, [
    hydrated,
    newbieTooltips,
    showTermHints,
    blockToasts,
    motion,
    density,
    preferredChain,
    defaultPriceRange,
  ]);

  return <>{children}</>;
}
