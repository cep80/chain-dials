import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shells load the live Next server (API routes + WS stay server-side).
 *
 * Production: CAP_SERVER_URL=https://chaindials.com
 * Dev:        CAP_DEV_URL=http://localhost:3000 (iOS) or http://10.0.2.2:3000 (Android emu)
 *
 * Never ship a cleartext (http://) server URL to the stores.
 */
const productionUrl = "https://chaindials.com";

const serverUrl =
  process.env.CAP_SERVER_URL ||
  process.env.CAP_DEV_URL ||
  (process.env.CAP_ENV === "production" ? productionUrl : undefined) ||
  (process.env.NODE_ENV === "development" ? "http://localhost:3000" : productionUrl);

const isHttp = serverUrl.startsWith("http://");

const config: CapacitorConfig = {
  appId: "com.chaindials.app",
  appName: "Chain Dials",
  webDir: "capacitor-www",
  server: {
    url: serverUrl,
    cleartext: isHttp,
    // Dev hosts only ride along on cleartext dev builds, never in store builds.
    allowNavigation: [
      ...(isHttp ? ["localhost", "127.0.0.1", "10.0.2.2"] : []),
      "*.chaindials.com",
      "chaindials.com",
    ],
    // Local page (in webDir) shown when the remote site can't load, e.g. offline.
    errorPath: "offline.html",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#0a0c10",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0c10",
    },
    Keyboard: {
      resize: "body",
    },
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    backgroundColor: "#0a0c10",
  },
  android: {
    backgroundColor: "#0a0c10",
    allowMixedContent: isHttp,
  },
};

export default config;
