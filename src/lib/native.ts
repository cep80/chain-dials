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

const APP_HOSTS = new Set(["chaindials.com", "www.chaindials.com"]);

/**
 * In-app path for a deep link (https://chaindials.com/... or chaindials://...),
 * or null when the URL isn't ours.
 */
export function deepLinkPath(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol === "https:" && APP_HOSTS.has(url.hostname)) {
    return `${url.pathname}${url.search}${url.hash}` || "/";
  }
  if (url.protocol === "chaindials:") {
    // chaindials://btc/solo parses "btc" as the host.
    const path = `/${url.hostname}${url.pathname}`.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
    return `${path}${url.search}${url.hash}`;
  }
  return null;
}
