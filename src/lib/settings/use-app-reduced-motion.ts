"use client";

import { useReducedMotion } from "framer-motion";
import { useSyncExternalStore } from "react";
import { useSettingsStore } from "@/lib/settings/store";
import { useInstrumentActive } from "@/components/viz/InstrumentActivity";

const emptySubscribe = () => () => {};

/** Respects Settings → Motion (system / full / reduce). */
export function useAppReducedMotion(): boolean {
  // Keep SSR and the hydration pass on the same path as "system → no preference"
  // so Framer Motion initial styles do not diverge before the client mounts.
  const clientReady = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const preference = useSettingsStore((s) => s.motion);
  const system = useReducedMotion();
  const active = useInstrumentActive();
  if (!active) return true;
  if (!clientReady) return false;
  if (preference === "reduce") return true;
  if (preference === "full") return false;
  return !!system;
}
