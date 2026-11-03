/**
 * Reference catalog for the solo odds list. Hashrate and power are the
 * manufacturer's nominal stock figures, rounded; real units drift with
 * firmware, tuning, and ambient temperature.
 */

export type MinerClass = "lottery" | "home" | "legacy" | "air" | "hydro" | "scale";

export interface MinerSpec {
  id: string;
  name: string;
  maker: string;
  class: MinerClass;
  /** Nominal hashrate in TH/s. */
  ths: number;
  /** Nominal wall power in watts; null for reference rows. */
  watts: number | null;
}

export const MINER_CLASS_META: Record<MinerClass, { label: string; blurb: string }> = {
  lottery: {
    label: "Lottery tickets",
    blurb: "USB and desk toys. Pure lottery, sipping a few watts.",
  },
  home: {
    label: "Home miners",
    blurb: "Quiet-ish boxes built for a shelf, a closet, or a space heater.",
  },
  legacy: {
    label: "Legacy ASICs",
    blurb: "Older air-cooled workhorses still humming on cheap power.",
  },
  air: {
    label: "Current air-cooled",
    blurb: "Today's mainstream rack hardware.",
  },
  hydro: {
    label: "Hydro & immersion",
    blurb: "Liquid-cooled top end: the densest single units you can buy.",
  },
  scale: {
    label: "Fleet scale",
    blurb: "For perspective: what a whole farm's worth of hash looks like solo.",
  },
};

export const MINER_CLASS_ORDER: MinerClass[] = ["lottery", "home", "legacy", "air", "hydro", "scale"];

export const MINERS: MinerSpec[] = [
  { id: "nerdminer-v2", name: "NerdMiner v2", maker: "Open source", class: "lottery", ths: 0.000_000_078, watts: 1 },
  { id: "bitaxe-ultra", name: "Bitaxe Ultra", maker: "Bitaxe", class: "lottery", ths: 0.5, watts: 12 },
  { id: "bitaxe-supra", name: "Bitaxe Supra", maker: "Bitaxe", class: "lottery", ths: 0.6, watts: 13 },
  { id: "bitaxe-gamma", name: "Bitaxe Gamma", maker: "Bitaxe", class: "lottery", ths: 1.2, watts: 18 },
  { id: "nerdqaxe-pp", name: "NerdQaxe++", maker: "Open source", class: "lottery", ths: 4.8, watts: 76 },

  { id: "avalon-nano-3", name: "Avalon Nano 3", maker: "Canaan", class: "home", ths: 4, watts: 140 },
  { id: "avalon-nano-3s", name: "Avalon Nano 3S", maker: "Canaan", class: "home", ths: 6, watts: 140 },
  { id: "avalon-mini-3", name: "Avalon Mini 3", maker: "Canaan", class: "home", ths: 37.5, watts: 800 },
  { id: "avalon-q", name: "Avalon Q", maker: "Canaan", class: "home", ths: 90, watts: 1674 },

  { id: "antminer-s9", name: "Antminer S9", maker: "Bitmain", class: "legacy", ths: 13.5, watts: 1323 },
  { id: "antminer-s17-pro", name: "Antminer S17 Pro", maker: "Bitmain", class: "legacy", ths: 53, watts: 2094 },
  { id: "antminer-s19", name: "Antminer S19", maker: "Bitmain", class: "legacy", ths: 95, watts: 3250 },
  { id: "antminer-s19k-pro", name: "Antminer S19k Pro", maker: "Bitmain", class: "legacy", ths: 120, watts: 2760 },
  { id: "antminer-s19-xp", name: "Antminer S19 XP", maker: "Bitmain", class: "legacy", ths: 140, watts: 3010 },

  { id: "whatsminer-m60s", name: "Whatsminer M60S", maker: "MicroBT", class: "air", ths: 186, watts: 3441 },
  { id: "antminer-s21", name: "Antminer S21", maker: "Bitmain", class: "air", ths: 200, watts: 3500 },
  { id: "antminer-s21-pro", name: "Antminer S21 Pro", maker: "Bitmain", class: "air", ths: 234, watts: 3510 },
  { id: "antminer-s21-xp", name: "Antminer S21 XP", maker: "Bitmain", class: "air", ths: 270, watts: 3645 },
  { id: "antminer-s23", name: "Antminer S23", maker: "Bitmain", class: "air", ths: 318, watts: 3498 },

  { id: "whatsminer-m66s", name: "Whatsminer M66S", maker: "MicroBT", class: "hydro", ths: 298, watts: 5513 },
  { id: "antminer-s21-xp-hyd", name: "Antminer S21 XP Hydro", maker: "Bitmain", class: "hydro", ths: 473, watts: 5676 },
  { id: "antminer-s23-hyd", name: "Antminer S23 Hydro", maker: "Bitmain", class: "hydro", ths: 580, watts: 5510 },
  { id: "antminer-s21e-xp-hyd-3u", name: "Antminer S21e XP Hydro 3U", maker: "Bitmain", class: "hydro", ths: 860, watts: 11_180 },

  { id: "fleet-1ph", name: "1 PH/s fleet", maker: "≈ 3–5 racks", class: "scale", ths: 1_000, watts: null },
  { id: "fleet-10ph", name: "10 PH/s fleet", maker: "≈ a container", class: "scale", ths: 10_000, watts: null },
  { id: "fleet-100ph", name: "100 PH/s farm", maker: "≈ a warehouse", class: "scale", ths: 100_000, watts: null },
  { id: "fleet-1eh", name: "1 EH/s farm", maker: "≈ a mid-size public miner", class: "scale", ths: 1_000_000, watts: null },
];
