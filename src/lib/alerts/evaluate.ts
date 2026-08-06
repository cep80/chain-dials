import {
  type AlertKind,
  ALERT_KIND_META,
} from "@/lib/alerts/kinds";
import {
  metronomeTone,
  pressureIntensity,
} from "@/lib/viz-scale";

export type AlertLiveSnapshot = {
  feeFastest: number | null;
  tipTimestamp: number | null;
  mempoolCount: number | null;
  mempoolPressure: number | null;
  priceUsd: number | null;
  /** 0–1 security / forge heat when known */
  securityScore: number | null;
  /** Optional hashrate intensity 0–1 if mapped client-side */
  forgeIntensity: number | null;
};

export type AlertEvalContext = {
  nowMs: number;
  /** Target tip interval seconds for this chain */
  targetBlockSeconds: number;
  feeUnit: string;
  tipNoun: string;
  shortName: string;
  sessionOpenPrice: number | null;
};

export type AlertFire = {
  kind: AlertKind;
  title: string;
  body: string;
  tag: string;
  /** Deep link path for the instrument when relevant */
  pathHint?: string;
};

/**
 * Pure evaluation of one enabled rule against live board state.
 * Used by the alerts page and unit tests.
 */
export function evaluateAlertRule(
  kind: AlertKind,
  params: Record<string, number | string | boolean>,
  live: AlertLiveSnapshot,
  ctx: AlertEvalContext,
  chainId: string,
): AlertFire | null {
  const meta = ALERT_KIND_META[kind];

  switch (kind) {
    case "fee_hot": {
      if (live.feeFastest == null) return null;
      const thr = Number(params.threshold ?? meta.defaultParams.threshold);
      if (!(live.feeFastest >= thr)) return null;
      return {
        kind,
        title: `${ctx.shortName} fees hot`,
        body: `Hottest ~${Math.round(live.feeFastest)} ${ctx.feeUnit} (threshold ${thr}).`,
        tag: `fee-${chainId}`,
      };
    }
    case "tip_quiet": {
      if (live.tipTimestamp == null) return null;
      const secs = Number(params.seconds ?? meta.defaultParams.seconds);
      const since = (ctx.nowMs - live.tipTimestamp) / 1000;
      if (!(since > secs)) return null;
      return {
        kind,
        title: `${ctx.shortName} tip quiet`,
        body: `No new ${ctx.tipNoun} for ~${Math.round(since)}s.`,
        tag: `quiet-${chainId}`,
      };
    }
    case "mempool_stuffed": {
      if (live.mempoolCount == null) return null;
      const thr = Number(params.count ?? meta.defaultParams.count);
      if (!(live.mempoolCount >= thr)) return null;
      return {
        kind,
        title: `${ctx.shortName} waiting room stuffed`,
        body: `${live.mempoolCount.toLocaleString()} pending (threshold ${thr.toLocaleString()}).`,
        tag: `mempool-${chainId}`,
      };
    }
    case "price_move": {
      if (ctx.sessionOpenPrice == null || live.priceUsd == null) return null;
      if (!(ctx.sessionOpenPrice > 0)) return null;
      const pct = Number(params.pct ?? meta.defaultParams.pct);
      const change =
        ((live.priceUsd - ctx.sessionOpenPrice) / ctx.sessionOpenPrice) * 100;
      if (!(Math.abs(change) >= pct)) return null;
      return {
        kind,
        title: `${ctx.shortName} price move`,
        body: `${change >= 0 ? "+" : ""}${change.toFixed(2)}% vs this session open.`,
        tag: `price-${chainId}`,
      };
    }
    case "metronome_late": {
      if (live.tipTimestamp == null) return null;
      const mult = Number(params.multiplier ?? meta.defaultParams.multiplier);
      const since = (ctx.nowMs - live.tipTimestamp) / 1000;
      const tone = metronomeTone(since, ctx.targetBlockSeconds);
      // Fire on late or stale; multiplier can raise the bar above default 1.2×
      const threshold = ctx.targetBlockSeconds * mult;
      if (!(since > threshold) && tone === "calm") return null;
      if (!(since > threshold)) return null;
      return {
        kind,
        title: `${ctx.shortName} metronome ${tone === "stale" ? "stale" : "late"}`,
        body: `${Math.round(since)}s since tip (target ~${ctx.targetBlockSeconds}s × ${mult}).`,
        tag: `metro-${chainId}`,
        pathHint: `/${chainId}?i=metronome`,
      };
    }
    case "atmosphere_pressure": {
      const intensity = pressureIntensity(live.mempoolPressure);
      const floor = Number(params.intensity ?? meta.defaultParams.intensity);
      if (!(intensity >= floor)) return null;
      return {
        kind,
        title: `${ctx.shortName} atmosphere pressure`,
        body: `Pressure intensity ${(intensity * 100).toFixed(0)}% (floor ${(floor * 100).toFixed(0)}%).`,
        tag: `atmo-${chainId}`,
        pathHint: `/${chainId}?i=atmosphere`,
      };
    }
    case "forge_heat": {
      const score =
        live.forgeIntensity ??
        (live.securityScore != null && Number.isFinite(live.securityScore)
          ? live.securityScore
          : null);
      if (score == null) return null;
      const floor = Number(params.score ?? meta.defaultParams.score);
      if (!(score >= floor)) return null;
      return {
        kind,
        title: `${ctx.shortName} forge heat`,
        body: `Heat score ${(score * 100).toFixed(0)}% (floor ${(floor * 100).toFixed(0)}%).`,
        tag: `forge-${chainId}`,
        pathHint: `/${chainId}?i=forge`,
      };
    }
    default:
      return null;
  }
}
