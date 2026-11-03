/** Expected hashes to find a block at difficulty 1. */
const HASHES_PER_DIFF_1 = 2 ** 32;

const DAY_S = 86_400;
const YEAR_S = 365.25 * DAY_S;

export interface SoloOddsInput {
  /** Miner hashrate in H/s. */
  hashrate: number;
  /** Current network difficulty. */
  difficulty: number;
  /** Estimated network hashrate in H/s; used for per-block share. */
  networkHashrate: number | null;
}

export interface SoloOdds {
  /** Expected blocks found per second. */
  blocksPerSecond: number;
  /** Chance of winning any single block (share of network hash). */
  perBlock: number;
  perDay: number;
  perMonth: number;
  perYear: number;
  /** Mean time to a block, in seconds. */
  expectedSeconds: number;
}

/** Chance of at least one block in `seconds`, from a Poisson block process. */
export function chanceWithin(blocksPerSecond: number, seconds: number): number {
  // -expm1(-x) keeps precision for the tiny rates of lottery miners.
  return -Math.expm1(-blocksPerSecond * seconds);
}

export function soloOdds({ hashrate, difficulty, networkHashrate }: SoloOddsInput): SoloOdds | null {
  if (!(hashrate > 0) || !(difficulty > 0)) return null;
  const blocksPerSecond = hashrate / (difficulty * HASHES_PER_DIFF_1);
  // Without a network estimate, the difficulty implies one at a 600 s cadence.
  const network = networkHashrate && networkHashrate > 0 ? networkHashrate : (difficulty * HASHES_PER_DIFF_1) / 600;
  return {
    blocksPerSecond,
    perBlock: Math.min(1, hashrate / network),
    perDay: chanceWithin(blocksPerSecond, DAY_S),
    perMonth: chanceWithin(blocksPerSecond, YEAR_S / 12),
    perYear: chanceWithin(blocksPerSecond, YEAR_S),
    expectedSeconds: 1 / blocksPerSecond,
  };
}

/** Expected BTC per day if rewards were smooth (they are not, solo). */
export function expectedBtcPerDay(odds: SoloOdds, rewardBtc: number): number {
  return odds.blocksPerSecond * DAY_S * rewardBtc;
}

function compact(n: number): string {
  if (n < 1_000) return n < 10 ? n.toFixed(1).replace(/\.0$/, "") : Math.round(n).toString();
  const units: [number, string][] = [
    [1e15, "Q"],
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [size, suffix] of units) {
    if (n >= size) {
      const v = n / size;
      return `${v >= 100 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")}${suffix}`;
    }
  }
  return Math.round(n).toString();
}

/** "1 in 4.3M" style odds; reads better than tiny percentages. */
export function formatOneIn(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p) || p <= 0) return "-";
  if (p >= 0.5) return formatChance(p);
  return `1 in ${compact(1 / p)}`;
}

/** Percent for likely events, "1 in N" once it drops under 0.1%. */
export function formatChance(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p) || p <= 0) return "-";
  if (p >= 0.9995) return ">99.9%";
  if (p >= 0.001) {
    const pct = p * 100;
    return `${pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)}%`;
  }
  return `1 in ${compact(1 / p)}`;
}

export function formatExpectedWait(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "-";
  const hours = seconds / 3_600;
  if (hours < 1) return `${Math.max(1, Math.round(seconds / 60))} min`;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)} h`;
  const days = seconds / DAY_S;
  if (days < 60) return `${Math.round(days)} days`;
  const years = seconds / YEAR_S;
  if (years < 2) return `${Math.round(days / 30.44)} months`;
  if (years > 13.8e9) return `${compact(years / 13.8e9)}× the age of the universe`;
  return `${compact(years)} years`;
}

/** TH/s with sensible units, from kH/s toys to EH/s farms. */
export function formatThs(ths: number): string {
  const hps = ths * 1e12;
  const units: [number, string][] = [
    [1e18, "EH/s"],
    [1e15, "PH/s"],
    [1e12, "TH/s"],
    [1e9, "GH/s"],
    [1e6, "MH/s"],
    [1e3, "kH/s"],
  ];
  for (const [size, unit] of units) {
    if (hps >= size) {
      const v = hps / size;
      return `${v >= 100 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")} ${unit}`;
    }
  }
  return `${Math.round(hps)} H/s`;
}
