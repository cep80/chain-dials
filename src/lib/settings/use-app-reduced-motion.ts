"use client";

import { useReducedMotion } from "framer-motion";
import { useSettingsStore } from "@/lib/settings/store";

/** Respects Settings → Motion (system / full / reduce). */
export function useAppReducedMotion(): boolean {
  const preference = useSettingsStore((s) => s.motion);
  const system = useReducedMotion();
  if (preference === "reduce") return true;
  if (preference === "full") return false;
  return !!system;
}
