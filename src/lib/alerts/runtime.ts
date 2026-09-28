import type { AlertFire } from "@/lib/alerts/evaluate";
import { ALERT_KIND_META, isAlertKind, type AlertKind } from "@/lib/alerts/kinds";

export interface AlertDelivery extends AlertFire { at: number; delivery: "in-app" | "notified" | "failed" }
export interface AlertRuntime {
  conditions: Record<string, { active: boolean; lastAt: number | null }>;
  history: AlertDelivery[];
}
export const emptyAlertRuntime = (): AlertRuntime => ({ conditions: {}, history: [] });
export function cooldownMinutes(kind: AlertKind, params: Record<string, unknown>): number {
  const minutes = Number(params.cooldownMinutes ?? (kind === "regime_flip" ? 5 : 30));
  return Number.isFinite(minutes) ? Math.max(1, Math.min(1440, minutes)) : 30;
}
export function alertRuleError(kind: AlertKind, params: Record<string, unknown>): string | null {
  const key = Object.keys(ALERT_KIND_META[kind].defaultParams)[0]!;
  const value = Number(params[key] ?? ALERT_KIND_META[kind].defaultParams[key]);
  if (!Number.isFinite(value) || value <= 0) return "Enter a number greater than zero.";
  if (["intensity", "score", "confidence"].includes(key) && value > 1) return "Enter a value greater than zero and no more than one.";
  if (params.cooldownMinutes != null) {
    const minutes = Number(params.cooldownMinutes);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) return "Cooldown must be between 1 and 1440 minutes.";
  }
  return null;
}

/** A sustained condition fires once. It must clear, then re-enter after cooldown. */
export function advanceAlert(state: AlertRuntime, key: string, matches: boolean, now: number, coolMs: number): { state: AlertRuntime; fire: boolean } {
  const previous = state.conditions[key] ?? { active: false, lastAt: null };
  if (!matches) {
    if (!previous.active) return { state, fire: false };
    return { state: { ...state, conditions: { ...state.conditions, [key]: { ...previous, active: false } } }, fire: false };
  }
  if (previous.active || (previous.lastAt != null && now - previous.lastAt < coolMs)) return { state, fire: false };
  return { state: { ...state, conditions: { ...state.conditions, [key]: { active: true, lastAt: now } } }, fire: true };
}

export function parseAlertRuntime(raw: unknown): AlertRuntime {
  const state = emptyAlertRuntime();
  if (!raw || typeof raw !== "object") return state;
  const value = raw as Record<string, unknown>;
  if (value.conditions && typeof value.conditions === "object") for (const [key, row] of Object.entries(value.conditions).slice(0, 50)) {
    if (!row || typeof row !== "object" || !isAlertKind(key)) continue;
    const condition = row as Record<string, unknown>;
    state.conditions[key] = { active: condition.active === true, lastAt: typeof condition.lastAt === "number" && Number.isFinite(condition.lastAt) && condition.lastAt <= Date.now() + 300_000 ? condition.lastAt : null };
  }
  if (Array.isArray(value.history)) for (const rawEvent of value.history.slice(0, 100)) {
    if (!rawEvent || typeof rawEvent !== "object") continue;
    const event = rawEvent as Record<string, unknown>;
    if (typeof event.kind !== "string" || !isAlertKind(event.kind) || typeof event.at !== "number" || !Number.isFinite(event.at) || event.at <= 0 || event.at > Date.now() + 300_000 || typeof event.title !== "string" || typeof event.body !== "string") continue;
    state.history.push({ kind: event.kind, at: event.at, title: event.title.slice(0, 200), body: event.body.slice(0, 1000), tag: typeof event.tag === "string" ? event.tag : event.kind, delivery: event.delivery === "notified" || event.delivery === "failed" ? event.delivery : "in-app" });
  }
  return state;
}
