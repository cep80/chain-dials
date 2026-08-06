/** Alert rule kinds: commodity metrics + instrument-state intelligence. */

export const ALERT_KINDS = [
  "fee_hot",
  "tip_quiet",
  "mempool_stuffed",
  "price_move",
  /** Instrument: metronome late / stale vs target cadence */
  "metronome_late",
  /** Instrument: atmosphere / fee-pressure intensity high */
  "atmosphere_pressure",
  /** Instrument: forge heat (securityScore 0-1 or hashrate EH proxy) */
  "forge_heat",
] as const;

export type AlertKind = (typeof ALERT_KINDS)[number];

export function isAlertKind(v: string): v is AlertKind {
  return (ALERT_KINDS as readonly string[]).includes(v);
}

export const ALERT_KIND_META: Record<
  AlertKind,
  {
    label: string;
    hint: string;
    defaultParams: Record<string, number>;
    /** Chain Dials instrument language */
    instrument?: "metronome" | "atmosphere" | "forge";
  }
> = {
  fee_hot: {
    label: "Fee hottest above threshold",
    hint: "Fires when the hottest fee sample clears your number.",
    defaultParams: { threshold: 50 },
  },
  tip_quiet: {
    label: "Quiet tip",
    hint: "Fires when no new tip lands for longer than N seconds.",
    defaultParams: { seconds: 1200 },
  },
  mempool_stuffed: {
    label: "Waiting room stuffed",
    hint: "Fires when pending count exceeds your threshold.",
    defaultParams: { count: 40000 },
  },
  price_move: {
    label: "Price move",
    hint: "Browser nudge when |change| vs session open exceeds % (local).",
    defaultParams: { pct: 5 },
  },
  metronome_late: {
    label: "Metronome late",
    hint: "Fires when time since tip exceeds target cadence × multiplier (instrument tone).",
    defaultParams: { multiplier: 1.2 },
    instrument: "metronome",
  },
  atmosphere_pressure: {
    label: "Atmosphere pressure",
    hint: "Fires when mempool pressure intensity (0–1 mapped) clears your floor.",
    defaultParams: { intensity: 0.55 },
    instrument: "atmosphere",
  },
  forge_heat: {
    label: "Forge heat",
    hint: "Fires when security/forge heat score (0–1) clears your floor.",
    defaultParams: { score: 0.7 },
    instrument: "forge",
  },
};
