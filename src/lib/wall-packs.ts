import { CHAIN_ORDER } from "@/lib/chains/registry";
import type { ChainId } from "@/lib/chains/types";
import { INSTRUMENT_ORDER, type InstrumentId } from "@/lib/instruments";

export type WallPackSlot = {
  chainId: ChainId;
  /** Optional: open this instrument fullscreen when the slot is shown */
  instrument?: InstrumentId | null;
};

export type WallPack = {
  id: string;
  name: string;
  /** Chains / instruments to rotate on a TV control room */
  slots: WallPackSlot[];
  /** Seconds per slot when auto-rotating */
  rotateSeconds: number;
  kiosk: boolean;
  updatedAt: number;
};

export const WALL_PACK_STORAGE_KEY = "chain-dials:wall-packs:v1";
export const WALL_PACK_ACTIVE_KEY = "chain-dials:wall-pack-active:v1";

export function isChainIdSlot(v: string): v is ChainId {
  return (CHAIN_ORDER as string[]).includes(v);
}

export function isInstrumentSlot(v: string): v is InstrumentId {
  return (INSTRUMENT_ORDER as string[]).includes(v);
}

/** Default multi-chain control room pack. */
export function defaultWallPack(nowMs = Date.now()): WallPack {
  return {
    id: "default-suite",
    name: "Suite control room",
    slots: CHAIN_ORDER.map((chainId) => ({ chainId, instrument: null })),
    rotateSeconds: 45,
    kiosk: true,
    updatedAt: nowMs,
  };
}

export function clampRotateSeconds(n: number): number {
  if (!Number.isFinite(n)) return 45;
  return Math.max(10, Math.min(600, Math.round(n)));
}

export function normalizeWallPack(raw: unknown, nowMs = Date.now()): WallPack | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id ? o.id : `pack-${nowMs}`;
  const name =
    typeof o.name === "string" && o.name.trim()
      ? o.name.trim().slice(0, 60)
      : "Control room";
  const slotsRaw = Array.isArray(o.slots) ? o.slots : [];
  const slots: WallPackSlot[] = [];
  for (const s of slotsRaw) {
    if (!s || typeof s !== "object") continue;
    const row = s as Record<string, unknown>;
    const chainId = typeof row.chainId === "string" ? row.chainId : "";
    if (!isChainIdSlot(chainId)) continue;
    const inst =
      typeof row.instrument === "string" && isInstrumentSlot(row.instrument)
        ? row.instrument
        : null;
    slots.push({ chainId, instrument: inst });
  }
  if (slots.length < 1) return null;
  if (slots.length > 8) slots.length = 8;
  return {
    id,
    name,
    slots,
    rotateSeconds: clampRotateSeconds(Number(o.rotateSeconds ?? 45)),
    kiosk: o.kiosk !== false,
    updatedAt: typeof o.updatedAt === "number" ? o.updatedAt : nowMs,
  };
}

export function parseWallPacksJson(json: string, nowMs = Date.now()): WallPack[] {
  try {
    const data = JSON.parse(json) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .map((row) => normalizeWallPack(row, nowMs))
      .filter((p): p is WallPack => p != null)
      .slice(0, 12);
  } catch {
    return [];
  }
}

/** Which slot index is active for a given epoch of rotation. */
export function activeSlotIndex(
  pack: WallPack,
  nowMs: number,
  startMs: number,
): number {
  if (pack.slots.length === 0) return 0;
  const period = clampRotateSeconds(pack.rotateSeconds) * 1000;
  const elapsed = Math.max(0, nowMs - startMs);
  return Math.floor(elapsed / period) % pack.slots.length;
}

export function wallPackBoardHref(slot: WallPackSlot): string {
  if (slot.instrument) return `/${slot.chainId}?i=${slot.instrument}`;
  return `/${slot.chainId}/wall`;
}
