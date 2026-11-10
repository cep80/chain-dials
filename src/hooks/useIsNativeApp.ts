"use client";

import { useSyncExternalStore } from "react";
import { isNativeApp } from "@/lib/native";

const noopSubscribe = () => () => {};

/**
 * True inside the Capacitor iOS/Android shells. False on the server and the
 * web, so purchase surfaces render on the web and hydrate away in the apps,
 * where store rules (Apple 3.1.1, Play Payments) forbid outside checkout.
 */
export function useIsNativeApp(): boolean {
  return useSyncExternalStore(noopSubscribe, isNativeApp, () => false);
}
