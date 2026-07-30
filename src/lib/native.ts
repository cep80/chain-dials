/** Capacitor / WebView detection helpers (safe on SSR). */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Dynamic require avoided - check Capacitor global injected by bridge
    const cap = (
      window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
    ).Capacitor;
    return Boolean(cap?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function isIosNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (
    window as unknown as {
      Capacitor?: { getPlatform?: () => string; isNativePlatform?: () => boolean };
    }
  ).Capacitor;
  return Boolean(cap?.isNativePlatform?.() && cap.getPlatform?.() === "ios");
}

export function isAndroidNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (
    window as unknown as {
      Capacitor?: { getPlatform?: () => string; isNativePlatform?: () => boolean };
    }
  ).Capacitor;
  return Boolean(cap?.isNativePlatform?.() && cap.getPlatform?.() === "android");
}
