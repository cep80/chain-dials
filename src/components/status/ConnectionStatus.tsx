"use client";

import { Hint } from "@/components/ui/Hint";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import { useDashboardStore } from "@/lib/store";

const LABELS = {
  connecting: "Waking up",
  connected: "Live",
  degraded: "Spotty",
  disconnected: "Offline",
} as const;

const COLORS = {
  connecting: "bg-warn",
  connected: "bg-up",
  degraded: "bg-warn",
  disconnected: "bg-down",
} as const;

export function ConnectionStatus() {
  const connection = useDashboardStore((s) => s.connection);
  const reduce = useAppReducedMotion();

  return (
    <Hint tip="status.connection">
      <div
        className="flex min-h-11 items-center gap-2 text-xs text-paper-muted"
        tabIndex={0}
      >
        <span className="relative flex h-2.5 w-2.5">
          {connection === "connected" && !reduce && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-40" />
          )}
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${COLORS[connection]}`}
          />
        </span>
        <span className="hidden underline decoration-dotted decoration-paper-muted/40 underline-offset-2 sm:inline">
          {LABELS[connection]}
        </span>
      </div>
    </Hint>
  );
}
