"use client";

import { Hint } from "@/components/ui/Hint";
import { useChainOptional } from "@/lib/chains/context";
import { freshnessLabel } from "@/lib/chains/registry";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import { useDashboardStore } from "@/lib/store";

const COLORS = {
  connecting: "bg-warn",
  connected: "bg-up",
  degraded: "bg-warn",
  disconnected: "bg-down",
} as const;

export function ConnectionStatus() {
  const connection = useDashboardStore((s) => s.connection);
  const chain = useChainOptional();
  const reduce = useAppReducedMotion();

  const label =
    connection === "connecting"
      ? "Waking up"
      : connection === "degraded"
        ? "Spotty"
        : connection === "disconnected"
          ? "Offline"
          : chain
            ? freshnessLabel(chain)
            : "Connected";

  const tipBody =
    connection !== "connected"
      ? undefined
      : chain?.dataStatus === "live"
        ? "Live feed. Readings update as the network moves."
        : "Connected. This board refreshes about every 15 seconds.";

  return (
    <Hint tip="status.connection">
      <div
        className="flex min-h-11 items-center gap-2 text-xs text-paper-muted"
        role="status"
        aria-live="polite"
        title={tipBody}
      >
        <span className="relative flex h-2.5 w-2.5">
          {connection === "connected" &&
            chain?.dataStatus === "live" &&
            !reduce && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-40" />
            )}
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${COLORS[connection]}`}
          />
        </span>
        <span className="hidden underline decoration-dotted decoration-paper-muted/40 underline-offset-2 sm:inline">
          {label}
        </span>
      </div>
    </Hint>
  );
}
