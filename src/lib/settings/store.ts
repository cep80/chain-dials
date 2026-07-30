import { create } from "zustand";
import type { ChainId } from "@/lib/chains/types";
import type { PriceRangeId } from "@/lib/price/types";

export type MotionPreference = "system" | "full" | "reduce";
export type BoardDensity = "comfortable" | "compact";

export interface SettingsState {
  /** Plain-language hover/focus tips for newcomers. Default on. */
  newbieTooltips: boolean;
  /** Show the Term hints glossary section on core boards. */
  showTermHints: boolean;
  /** Block / slot found toast popups. */
  blockToasts: boolean;
  /** Motion override; system follows prefers-reduced-motion. */
  motion: MotionPreference;
  /** Tighter instrument and metric spacing. */
  density: BoardDensity;
  /** Preferred chain when opening the suite “home” actions. */
  preferredChain: ChainId;
  /** Default range for the price chart panel. */
  defaultPriceRange: PriceRangeId;
  hydrated: boolean;
  hydrate: () => void;
  set: <K extends keyof SettingsPersisted>(key: K, value: SettingsPersisted[K]) => void;
  reset: () => void;
}

export type SettingsPersisted = Omit<SettingsState, "hydrated" | "hydrate" | "set" | "reset">;

const STORAGE_KEY = "chain-dials:settings:v1";

export const SETTINGS_DEFAULTS: SettingsPersisted = {
  newbieTooltips: true,
  showTermHints: true,
  blockToasts: true,
  motion: "system",
  density: "comfortable",
  preferredChain: "btc",
  defaultPriceRange: "7D",
};

function readStored(): Partial<SettingsPersisted> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<SettingsPersisted>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStored(state: SettingsPersisted) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota
  }
}

function persistSlice(get: () => SettingsState): SettingsPersisted {
  const s = get();
  return {
    newbieTooltips: s.newbieTooltips,
    showTermHints: s.showTermHints,
    blockToasts: s.blockToasts,
    motion: s.motion,
    density: s.density,
    preferredChain: s.preferredChain,
    defaultPriceRange: s.defaultPriceRange,
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...SETTINGS_DEFAULTS,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    const stored = readStored();
    set({
      ...SETTINGS_DEFAULTS,
      ...stored,
      hydrated: true,
    });
  },
  set: (key, value) => {
    set({ [key]: value } as Partial<SettingsState>);
    writeStored(persistSlice(get));
  },
  reset: () => {
    set({ ...SETTINGS_DEFAULTS, hydrated: true });
    writeStored({ ...SETTINGS_DEFAULTS });
  },
}));

/** Apply document-level effects from settings (motion class, density). */
export function applySettingsToDocument(s: SettingsPersisted) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.density = s.density;
  if (s.motion === "reduce") {
    root.dataset.motion = "reduce";
  } else if (s.motion === "full") {
    root.dataset.motion = "full";
  } else {
    delete root.dataset.motion;
  }
}
