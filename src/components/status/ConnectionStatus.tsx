"use client";

import { useReducedMotion } from "framer-motion";
import { useDashboardStore } from "@/lib/store";

const LABELS = {
  connecting: "Connecting",
  connected: "Live",
  degraded: "Degraded",
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
  const reduce = useReducedMotion();

  return (
    <div
      className="flex items-center gap-2 text-xs text-paper-muted"
      title={`Connection: ${LABELS[connection]}`}
    >
      <span className="relative flex h-2.5 w-2.5">
        {connection === "connected" && !reduce && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-40" />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${COLORS[connection]}`}
        />
      </span>
      <span className="hidden sm:inline">{LABELS[connection]}</span>
    </div>
  );
}
