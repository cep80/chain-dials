/**
 * Server-only Coldcard dataset indexes.
 * Sourced from Kelbie/coldcard-rng-postmortem chain.json (public reconstruction).
 */

import dataset from "@/lib/forensics/coldcard-dataset.json";
import type {
  ForensicsSummary,
  HolderMeta,
  VictimMeta,
} from "@/lib/forensics/types";

type RawHolder = {
  a: string;
  l: string;
  r: string;
  w: number;
  recv: number;
  sent: number;
};

type RawVictim = {
  a: string;
  v: number;
  w: number;
  t: number;
};

type RawDataset = {
  summary: ForensicsSummary;
  watchSeed: string[];
  holders: RawHolder[];
  victims: RawVictim[];
};

const raw = dataset as RawDataset;

function toHolder(h: RawHolder): HolderMeta {
  return {
    address: h.a,
    label: h.l,
    role: h.r,
    wave: h.w,
    receivedSats: h.recv,
    sentSats: h.sent,
  };
}

function toVictim(v: RawVictim): VictimMeta {
  return {
    address: v.a,
    valueSats: v.v,
    wave: v.w,
    sweptAt: v.t,
  };
}

const holders: HolderMeta[] = raw.holders.map(toHolder);
const victims: VictimMeta[] = raw.victims.map(toVictim);

const holderByAddress = new Map(holders.map((h) => [h.address, h]));
const victimByAddress = new Map(victims.map((v) => [v.address, v]));

export const coldcardSummary: ForensicsSummary = raw.summary;

export const coldcardWatchSeed: string[] = raw.watchSeed;

export function getHolder(address: string): HolderMeta | undefined {
  return holderByAddress.get(address.toLowerCase()) ?? holderByAddress.get(address);
}

export function getVictim(address: string): VictimMeta | undefined {
  return victimByAddress.get(address.toLowerCase()) ?? victimByAddress.get(address);
}

export function allHolders(): HolderMeta[] {
  return holders;
}

/** Addresses to poll live: seed set + largest remaining balances from curated snapshot. */
export function watchAddresses(limit = 48): HolderMeta[] {
  const seed = new Set(coldcardWatchSeed.map((a) => a.toLowerCase()));
  const bySeed = coldcardWatchSeed
    .map((a) => getHolder(a))
    .filter((h): h is HolderMeta => !!h);

  const rest = holders
    .filter((h) => !seed.has(h.address.toLowerCase()))
    .map((h) => ({
      h,
      bal: Math.max(0, h.receivedSats - h.sentSats),
    }))
    .filter((x) => x.bal > 0)
    .sort((a, b) => b.bal - a.bal)
    .slice(0, Math.max(0, limit - bySeed.length))
    .map((x) => x.h);

  const seen = new Set<string>();
  const out: HolderMeta[] = [];
  for (const h of [...bySeed, ...rest]) {
    const key = h.address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out;
}
