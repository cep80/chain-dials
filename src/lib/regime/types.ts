/** Hyperliquid dial-regime co-pilot: discrete weather, not orders. */

export const REGIME_IDS = [
  "calm",
  "crowded_long",
  "crowded_short",
  "stressed",
  "funding_extreme",
] as const;

export type RegimeId = (typeof REGIME_IDS)[number];

export const STANCE_IDS = ["long", "short", "flat", "reduce"] as const;

export type StanceId = (typeof STANCE_IDS)[number];

export function isRegimeId(v: string): v is RegimeId {
  return (REGIME_IDS as readonly string[]).includes(v);
}

export function isStanceId(v: string): v is StanceId {
  return (STANCE_IDS as readonly string[]).includes(v);
}

/** Fixed map: crowded books fade; extremes and stress stand down. */
export const STANCE_BY_REGIME: Record<RegimeId, StanceId> = {
  calm: "flat",
  crowded_long: "short",
  crowded_short: "long",
  stressed: "flat",
  funding_extreme: "reduce",
};

export const REGIME_LABELS: Record<RegimeId, string> = {
  calm: "Calm",
  crowded_long: "Crowded long",
  crowded_short: "Crowded short",
  stressed: "Stressed",
  funding_extreme: "Funding extreme",
};

export const STANCE_LABELS: Record<StanceId, string> = {
  long: "Long",
  short: "Short",
  flat: "Flat",
  reduce: "Reduce",
};

/** Dial-language gloss for the built-in how-to. */
export const REGIME_BLURBS: Record<RegimeId, string> = {
  calm: "Funding Tide near still water. Paper stays flat.",
  crowded_long:
    "Tide high and OI Vault dense: longs are paying. Paper shorts the crowd.",
  crowded_short:
    "Tide low and vault dense: shorts are paying. Paper longs the crowd.",
  stressed:
    "Tide is moving and Volume Fountain is spraying. Paper stands down.",
  funding_extreme:
    "Tide off the chart. Paper cuts risk (closes the book).",
};

export const REGIME_HOWTO_STEPS = [
  "Watch the reading. It follows Funding Tide, OI Vault, and Volume Fountain as the board refreshes.",
  "Optional: allow flip nudges if you want a browser ping when the weather changes.",
  "Optional: turn on auto paper. On a stance change (after a short cooldown) it opens or closes a fake $1,000 HYPE position on this device. Turn it off anytime.",
] as const;

export type RegimeLiveSnapshot = {
  /** Signed funding samples in bps (top markets and/or HYPE history). */
  fundingBps: number[];
  /** 0–1 OI Vault heat (snapshot securityScore). */
  oiScore: number | null;
  /** 0–100 Volume Fountain spray (issuanceProgress). */
  volumeHeat: number | null;
  asOf: number;
};

export type RegimeParams = {
  /** |median funding| (bps) to count as crowded. */
  crowdedBps: number;
  /** |median funding| (bps) that always wins as extreme. */
  extremeBps: number;
  /** OI score floor for crowded regimes. */
  oiFloor: number;
  /** Volume heat floor (0–100) that promotes to stressed. */
  volumeFloor: number;
  /** Deadband when leaving a non-calm regime (bps). */
  hysteresisBps: number;
  hysteresisOi: number;
  hysteresisVolume: number;
};

export const REGIME_DEFAULTS: RegimeParams = {
  crowdedBps: 8,
  extremeBps: 25,
  oiFloor: 0.45,
  volumeFloor: 70,
  hysteresisBps: 2,
  hysteresisOi: 0.05,
  hysteresisVolume: 8,
};

export type RegimeReading = {
  regime: RegimeId;
  stance: StanceId;
  confidence: number;
  reasons: string[];
  fundingMedianBps: number | null;
  oiScore: number | null;
  volumeHeat: number | null;
  asOf: number;
};
