const HALVING_INTERVAL = 210_000;
const MAX_SUPPLY_BTC = 21_000_000;
const INITIAL_SUBSIDY_SATS = 5_000_000_000; // 50 BTC

/** Circulating supply in BTC after `height` blocks (0-indexed tip height). */
export function issuedSupplyBtc(height: number): number {
  if (height < 0 || !Number.isFinite(height)) return 0;
  let remaining = height + 1; // include genesis block reward accounting
  let subsidy = INITIAL_SUBSIDY_SATS;
  let supplySats = 0;
  while (remaining > 0 && subsidy > 0) {
    const blocks = Math.min(remaining, HALVING_INTERVAL);
    supplySats += blocks * subsidy;
    remaining -= blocks;
    subsidy = Math.floor(subsidy / 2);
  }
  return supplySats / 100_000_000;
}

export function subsidyEpoch(height: number): number {
  if (height < 0) return 1;
  return Math.floor(height / HALVING_INTERVAL) + 1;
}

export function blocksToHalving(height: number): number {
  if (height < 0) return HALVING_INTERVAL;
  return HALVING_INTERVAL - (height % HALVING_INTERVAL);
}

export function halvingProgressPercent(height: number): number {
  if (height < 0) return 0;
  return ((height % HALVING_INTERVAL) / HALVING_INTERVAL) * 100;
}

/** Estimate next halving date assuming ~10 min blocks from now. */
export function estimateHalvingDate(height: number, now = Date.now()): number {
  const remaining = blocksToHalving(height);
  return now + remaining * 10 * 60 * 1000;
}

export function percentIssued(height: number): number {
  const issued = issuedSupplyBtc(height);
  return (issued / MAX_SUPPLY_BTC) * 100;
}

export function blockSubsidyBtc(height: number): number {
  const epoch = Math.floor(Math.max(0, height) / HALVING_INTERVAL);
  const sats = Math.floor(INITIAL_SUBSIDY_SATS / 2 ** epoch);
  return sats / 100_000_000;
}

export { HALVING_INTERVAL, MAX_SUPPLY_BTC };
