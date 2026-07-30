"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { useInstrumentStage } from "@/lib/instrument-stage";

/**
 * Boots native chrome: status bar, splash, resume refresh, Android back.
 * No-ops on web.
 */
export function NativeAppProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const cleanups: Array<() => void> = [];
    let cancelled = false;

    async function boot() {
      const [{ StatusBar, Style }, { SplashScreen }, { App }] =
        await Promise.all([
          import("@capacitor/status-bar"),
          import("@capacitor/splash-screen"),
          import("@capacitor/app"),
        ]);

      if (cancelled) return;

      try {
        await StatusBar.setStyle({ style: Style.Dark });
        if (Capacitor.getPlatform() === "android") {
          await StatusBar.setBackgroundColor({ color: "#0a0c10" });
        }
        document.documentElement.classList.add("native-app");
        document.documentElement.dataset.platform = Capacitor.getPlatform();
      } catch {
        // preview
      }

      try {
        await SplashScreen.hide({ fadeOutDuration: 280 });
      } catch {
        // ignore
      }

      const stateSub = await App.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) return;
        window.dispatchEvent(new Event("chaindials:resume"));
      });
      cleanups.push(() => stateSub.remove());

      const backSub = await App.addListener("backButton", ({ canGoBack }) => {
        const stage = useInstrumentStage.getState();
        if (stage.active) {
          stage.close();
          return;
        }
        if (canGoBack) {
          window.history.back();
          return;
        }
        void App.exitApp();
      });
      cleanups.push(() => backSub.remove());
    }

    void boot();
    return () => {
      cancelled = true;
      for (const fn of cleanups) fn();
    };
  }, []);

  return <>{children}</>;
}
