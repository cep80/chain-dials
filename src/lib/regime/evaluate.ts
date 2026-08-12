import {
  REGIME_DEFAULTS,
  STANCE_BY_REGIME,
  type RegimeId,
  type RegimeLiveSnapshot,
  type RegimeParams,
  type RegimeReading,
} from "@/lib/regime/types";

const RANK: Record<RegimeId, number> = {
  calm: 0,
  crowded_long: 2,
  crowded_short: 2,
  stressed: 3,
  funding_extreme: 4,
};

export function median(values: number[]): number | null {
  const xs = values.filter((v) => Number.isFinite(v));
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  if (s.length % 2 === 0) return (s[mid - 1]! + s[mid]!) / 2;
  return s[mid]!;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function rawRegime(
  funding: number,
  oi: number,
  volume: number,
  p: RegimeParams,
): RegimeId {
  const abs = Math.abs(funding);
  if (abs >= p.extremeBps) return "funding_extreme";
  if (abs >= p.crowdedBps && volume >= p.volumeFloor) return "stressed";
  if (funding >= p.crowdedBps && oi >= p.oiFloor) return "crowded_long";
  if (funding <= -p.crowdedBps && oi >= p.oiFloor) return "crowded_short";
  return "calm";
}

function reasonsFor(
  regime: RegimeId,
  funding: number | null,
  oi: number | null,
  volume: number | null,
): string[] {
  const tide =
    funding == null
      ? "Funding Tide has no sample yet."
      : `Funding Tide ${funding >= 0 ? "high" : "low"} (${funding >= 0 ? "+" : ""}${funding.toFixed(1)} bps).`;
  const vault =
    oi == null
      ? "OI Vault is quiet."
      : oi >= 0.45
        ? "OI Vault dense."
        : "OI Vault moderate.";
  const spray =
    volume == null
      ? null
      : volume >= 70
        ? "Volume Fountain spraying."
        : null;

  switch (regime) {
    case "funding_extreme":
      return [tide, "Extreme funding: paper risk cuts."].slice(0, 2);
    case "stressed":
      return [tide, spray ?? "Book is chasing."].filter(Boolean).slice(0, 2);
    case "crowded_long":
      return [tide, vault];
    case "crowded_short":
      return [tide, vault];
    default:
      return ["Funding Tide near still water.", vault];
  }
}

function confidenceFor(
  regime: RegimeId,
  funding: number,
  oi: number,
  volume: number,
  p: RegimeParams,
): number {
  if (regime === "calm") {
    const slack = 1 - Math.min(1, Math.abs(funding) / Math.max(p.crowdedBps, 1));
    return clamp01(0.35 + 0.4 * slack);
  }
  if (regime === "funding_extreme") {
    const excess =
      (Math.abs(funding) - p.extremeBps) / Math.max(p.extremeBps, 1);
    return clamp01(0.55 + 0.45 * excess);
  }
  if (regime === "stressed") {
    const f = (Math.abs(funding) - p.crowdedBps) / Math.max(p.crowdedBps, 1);
    const v = (volume - p.volumeFloor) / Math.max(100 - p.volumeFloor, 1);
    return clamp01(0.5 + 0.5 * Math.max(f, v));
  }
  const f = (Math.abs(funding) - p.crowdedBps) / Math.max(p.crowdedBps, 1);
  const o = (oi - p.oiFloor) / Math.max(1 - p.oiFloor, 0.01);
  return clamp01(0.45 + 0.55 * Math.max(f, o));
}

/**
 * Map live HYPE dial fields into a regime reading.
 * `prevRegime` applies hysteresis so tiny crosses do not flicker.
 */
export function evaluateHypeRegime(
  live: RegimeLiveSnapshot,
  params: Partial<RegimeParams> = {},
  prevRegime: RegimeId | null = null,
): RegimeReading {
  const p: RegimeParams = { ...REGIME_DEFAULTS, ...params };
  const funding = median(live.fundingBps);
  const oi =
    live.oiScore != null && Number.isFinite(live.oiScore) ? live.oiScore : 0;
  const volume =
    live.volumeHeat != null && Number.isFinite(live.volumeHeat)
      ? live.volumeHeat
      : 0;

  let regime: RegimeId = "calm";
  if (funding != null) {
    regime = rawRegime(funding, oi, volume, p);
    if (
      prevRegime &&
      prevRegime !== "calm" &&
      regime !== prevRegime &&
      RANK[regime] <= RANK[prevRegime]
    ) {
      const relaxed: RegimeParams = {
        ...p,
        crowdedBps: Math.max(0, p.crowdedBps - p.hysteresisBps),
        extremeBps: Math.max(0, p.extremeBps - p.hysteresisBps),
        oiFloor: Math.max(0, p.oiFloor - p.hysteresisOi),
        volumeFloor: Math.max(0, p.volumeFloor - p.hysteresisVolume),
      };
      const held = rawRegime(funding, oi, volume, relaxed);
      if (held === prevRegime) regime = prevRegime;
    }
  }

  const stance = STANCE_BY_REGIME[regime];
  const conf =
    funding == null
      ? 0.2
      : confidenceFor(regime, funding, oi, volume, p);

  return {
    regime,
    stance,
    confidence: conf,
    reasons: reasonsFor(regime, funding, oi, live.volumeHeat),
    fundingMedianBps: funding,
    oiScore: live.oiScore,
    volumeHeat: live.volumeHeat,
    asOf: live.asOf,
  };
}

/** Pull funding/OI/volume from the board live snapshot (HYPE encodings). */
export function regimeLiveFromBoard(
  live: {
    recentTxs?: Array<{ feeRate?: number }>;
    baseFeeSeries?: number[];
    securityScore?: number | null;
    issuanceProgress?: number | null;
  },
  asOf: number,
): RegimeLiveSnapshot {
  const fromBook = (live.recentTxs ?? [])
    .map((t) => t.feeRate)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const fromSeries = (live.baseFeeSeries ?? []).filter((n) =>
    Number.isFinite(n),
  );
  const fundingBps = fromBook.length >= 3 ? fromBook : fromSeries;
  return {
    fundingBps,
    oiScore: live.securityScore ?? null,
    volumeHeat: live.issuanceProgress ?? null,
    asOf,
  };
}
