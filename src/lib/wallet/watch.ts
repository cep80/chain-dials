import type { ChainId } from "@/lib/chains/types";

export const WALLET_WATCH_KEY = "chain-dials:wallet-watch:v1";
export const WALLET_WATCH_CAP = 12;
export const WALLET_WATCH_LABEL_MAX = 40;
export const WALLET_WATCH_EVENT = "chaindials:wallet-watch";
let unsavedMap: Record<string, WatchedWallet[]> | null = null;
const pendingChanges = new Map<string, Map<string, WatchedWallet | null>>();
export const watchStorageError = () => unsavedMap === null ? null : "Watchlist changes are only saved for this session. Device storage is unavailable; changes may be lost when you reload.";

/** Base58 addresses are case-sensitive; EVM and Bitcoin bech32 are not. */
export function walletAddressKey(chainId: string, address: string): string {
  const value = address.trim();
  return chainId === "eth" || chainId === "hype" ||
    (chainId === "btc" && /^(bc1|tb1|bcrt1)/i.test(value))
    ? value.toLowerCase()
    : value;
}

export type WatchedWallet = {
  address: string;
  label: string;
  addedAt: number;
  balanceNative: number | null;
  unit: string;
  fetchedAt: number | null;
  previousBalanceNative?: number | null;
  previousFetchedAt?: number | null;
};

export function normalizeWatchedWallet(
  raw: unknown,
  nowMs = Date.now(),
): WatchedWallet | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const address = typeof o.address === "string" ? o.address.trim() : "";
  if (!address || address.length < 8) return null;
  const label =
    typeof o.label === "string" ? o.label.trim().slice(0, WALLET_WATCH_LABEL_MAX) : "";
  const addedAt =
    typeof o.addedAt === "number" && Number.isFinite(o.addedAt) ? o.addedAt : nowMs;
  const balanceNative =
    typeof o.balanceNative === "number" && Number.isFinite(o.balanceNative)
      ? o.balanceNative
      : null;
  const unit = typeof o.unit === "string" && o.unit.trim() ? o.unit.trim().slice(0, 8) : "";
  const fetchedAt =
    typeof o.fetchedAt === "number" && Number.isFinite(o.fetchedAt)
      ? o.fetchedAt
      : null;
  const previousBalanceNative = typeof o.previousBalanceNative === "number" && Number.isFinite(o.previousBalanceNative) ? o.previousBalanceNative : null;
  const previousFetchedAt = typeof o.previousFetchedAt === "number" && Number.isFinite(o.previousFetchedAt) ? o.previousFetchedAt : null;
  return { address, label, addedAt, balanceNative, unit, fetchedAt, previousBalanceNative, previousFetchedAt };
}

export function parseWatchMap(raw: unknown): Record<string, WatchedWallet[]> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, WatchedWallet[]> = {};
  for (const [chainId, list] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue;
    const rows: WatchedWallet[] = [];
    const seen = new Set<string>();
    for (const item of list) {
      const row = normalizeWatchedWallet(item);
      if (!row) continue;
      const key = walletAddressKey(chainId, row.address);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
      if (rows.length >= WALLET_WATCH_CAP) break;
    }
    if (rows.length) out[chainId] = rows;
  }
  return out;
}

export function loadWatched(chainId: ChainId): WatchedWallet[] {
  return loadAllWatched()[chainId] ?? [];
}

export function loadAllWatched(): Record<string, WatchedWallet[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(WALLET_WATCH_KEY);
    const stored = raw ? parseWatchMap(JSON.parse(raw) as unknown) : {};
    if (!unsavedMap) return stored;
    for (const [chainId, changes] of pendingChanges) {
      const rows = [...(stored[chainId] ?? [])];
      for (const [key, change] of changes) {
        const index = rows.findIndex((row) => walletAddressKey(chainId, row.address) === key);
        if (change === null) { if (index >= 0) rows.splice(index, 1); }
        else if (index >= 0) rows[index] = change;
        else rows.unshift(change);
      }
      stored[chainId] = rows.slice(0, WALLET_WATCH_CAP);
    }
    return stored;
  } catch {
    return unsavedMap ?? {};
  }
}

export function flattenWatched(
  map: Record<string, WatchedWallet[]>,
  order: readonly ChainId[],
): Array<{ chainId: ChainId; item: WatchedWallet }> {
  const out: Array<{ chainId: ChainId; item: WatchedWallet }> = [];
  for (const chainId of order) {
    for (const item of map[chainId] ?? []) {
      out.push({ chainId, item });
    }
  }
  return out;
}

function writeMap(map: Record<string, WatchedWallet[]>, changedChain?: string) {
  if (typeof window === "undefined") return;
  const merged = loadAllWatched();
  const before = changedChain ? merged[changedChain] ?? [] : [];
  if (changedChain) merged[changedChain] = map[changedChain] ?? [];
  try {
    localStorage.setItem(WALLET_WATCH_KEY, JSON.stringify(merged));
    unsavedMap = null;
    pendingChanges.clear();
  } catch {
    unsavedMap = merged;
    if (changedChain) {
      const changes = pendingChanges.get(changedChain) ?? new Map<string, WatchedWallet | null>();
      const next = merged[changedChain] ?? [];
      const nextKeys = new Set(next.map((row) => walletAddressKey(changedChain, row.address)));
      for (const row of before) {
        const key = walletAddressKey(changedChain, row.address);
        if (!nextKeys.has(key)) changes.set(key, null);
      }
      for (const row of next) {
        const key = walletAddressKey(changedChain, row.address);
        const prior = before.find((item) => walletAddressKey(changedChain, item.address) === key);
        if (!prior || JSON.stringify(prior) !== JSON.stringify(row)) changes.set(key, row);
      }
      pendingChanges.set(changedChain, changes);
    }
  }
  window.dispatchEvent(new Event(WALLET_WATCH_EVENT));
}

function readMap(): Record<string, WatchedWallet[]> {
  return loadAllWatched();
}

export function retryWatchSave(): void {
  if (unsavedMap) writeMap(loadAllWatched());
}

export function saveWatched(chainId: ChainId, list: WatchedWallet[]): WatchedWallet[] {
  const capped = list.slice(0, WALLET_WATCH_CAP);
  const map = readMap();
  map[chainId] = capped;
  writeMap(map, chainId);
  return capped;
}

export function upsertWatched(
  chainId: ChainId,
  entry: WatchedWallet,
): WatchedWallet[] {
  const prev = loadWatched(chainId);
  const key = walletAddressKey(chainId, entry.address);
  if (prev.length >= WALLET_WATCH_CAP && !prev.some((w) => walletAddressKey(chainId, w.address) === key)) return prev;
  const next = [
    entry,
    ...prev.filter((w) => walletAddressKey(chainId, w.address) !== key),
  ].slice(0, WALLET_WATCH_CAP);
  return saveWatched(chainId, next);
}

export function removeWatched(chainId: ChainId, address: string): WatchedWallet[] {
  const key = walletAddressKey(chainId, address);
  return saveWatched(
    chainId,
    loadWatched(chainId).filter((w) => walletAddressKey(chainId, w.address) !== key),
  );
}

export function patchWatched(
  chainId: ChainId,
  address: string,
  patch: Partial<WatchedWallet>,
): WatchedWallet[] {
  const key = walletAddressKey(chainId, address);
  return saveWatched(
    chainId,
    loadWatched(chainId).map((w) =>
      walletAddressKey(chainId, w.address) === key ? normalizeWatchedWallet({ ...w, ...patch, address: w.address })! : w,
    ),
  );
}

/** Ignore late responses and preserve a comparison with the previous successful reading. */
export function recordWalletReading(chainId: ChainId, address: string, reading: {
  balanceNative: number | null; unit: string; fetchedAt: number;
}): WatchedWallet[] {
  const key = walletAddressKey(chainId, address);
  const list = loadWatched(chainId);
  const current = list.find((w) => walletAddressKey(chainId, w.address) === key);
  if (!current || !Number.isFinite(reading.fetchedAt) || (current.fetchedAt != null && reading.fetchedAt <= current.fetchedAt)) return list;
  if (reading.balanceNative == null || !Number.isFinite(reading.balanceNative)) return list;
  return patchWatched(chainId, address, {
    ...reading,
    previousBalanceNative: current.balanceNative,
    previousFetchedAt: current.fetchedAt,
  });
}

export type WatchSort = "newest" | "label" | "balance" | "changed";
export function sortWatched(rows: WatchedWallet[], sort: WatchSort): WatchedWallet[] {
  const delta = (w: WatchedWallet) => w.balanceNative != null && w.previousBalanceNative != null ? Math.abs(w.balanceNative - w.previousBalanceNative) : -1;
  return [...rows].sort((a, b) => {
    if (sort === "label") return (a.label || a.address).localeCompare(b.label || b.address) || a.address.localeCompare(b.address);
    if (sort === "balance") return (b.balanceNative ?? -Infinity) - (a.balanceNative ?? -Infinity) || b.addedAt - a.addedAt;
    if (sort === "changed") return delta(b) - delta(a) || b.addedAt - a.addedAt;
    return b.addedAt - a.addedAt;
  });
}

export function subscribeWatched(listener: () => void): () => void {
  const storage = (event: StorageEvent) => { if (event.key === WALLET_WATCH_KEY || event.key === null) listener(); };
  window.addEventListener(WALLET_WATCH_EVENT, listener);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(WALLET_WATCH_EVENT, listener);
    window.removeEventListener("storage", storage);
  };
}
