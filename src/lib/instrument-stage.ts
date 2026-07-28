"use client";

import { create } from "zustand";
import {
  type InstrumentId,
  nextInstrument,
  prevInstrument,
} from "@/lib/instruments";

interface StageState {
  active: InstrumentId | null;
  open: (id: InstrumentId) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
}

export const useInstrumentStage = create<StageState>((set, get) => ({
  active: null,
  open: (id) => set({ active: id }),
  close: () => set({ active: null }),
  next: () => {
    const cur = get().active;
    if (!cur) return;
    set({ active: nextInstrument(cur) });
  },
  prev: () => {
    const cur = get().active;
    if (!cur) return;
    set({ active: prevInstrument(cur) });
  },
}));
