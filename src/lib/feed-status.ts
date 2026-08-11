import type { ConnectionStatus } from "@/types/metrics";

/** Last-known readings may be on screen while a refresh is in flight. */
export function isFeedCatchingUp(connection: ConnectionStatus): boolean {
  return connection === "connecting" || connection === "degraded";
}

/** Short UI note for instruments showing possibly outdated values. */
export function feedCatchupLabel(connection: ConnectionStatus): string | null {
  if (connection === "connecting") return "Loading";
  if (connection === "degraded") return "Updating";
  return null;
}
