/**
 * Curated Liquid Network September 2026 peg-drain set.
 * Public reconstructions only (incident report, Bitquery, CertiK, mempool.space).
 */

import type {
  ForensicsCaseId,
  ForensicsSummary,
  HolderMeta,
  LiquidAddress,
  LiquidTimelineEvent,
} from "@/lib/forensics/types";

export const LIQUID_CASE_HREF = "/btc/forensics?case=liquid";
export const COLDCARD_CASE_HREF = "/btc/forensics?case=coldcard";

export function parseForensicsCase(raw: string | null | undefined): ForensicsCaseId {
  return raw === "liquid" ? "liquid" : "coldcard";
}

export const LIQUID_ACTOR =
  "bc1ql4mfu6aundtkksxklfajs2h3t9nzcd6gyqjlte";
export const LIQUID_PEG =
  "bc1qdlld6antmv4xug242ed83q7k4rqw50cwfns38szx4qu2f4jwaxxsuhwxxr";
export const LIQUID_SIDESWAP_PAYOUT =
  "bc1qgslsydz56d0ed6827hdemfmk5w2f6ldyc6wt7p";
export const LIQUID_BLOCKSTREAM_MSG =
  "bc1qn8mgsmxx42j3fflqfkh0cqhdd6mj4h9q2mfqym";

export const LIQUID_TX_FEDERATION_PEGOUT =
  "8db751a650ae2f12006b7e8c69a75e4df360e8afd6b9e05ae0b9fa6458a7b140";
export const LIQUID_TX_SIDESWAP_FORWARD =
  "85d2ca15bea33a592e73ed40c6a5da887feecf1e77f58ec7f580e00841645043";
export const LIQUID_TX_RETURN =
  "a6d697a25266ce3c78774fd1d75f896b7af522ada209b0f6228ea497bc49a46d";
export const LIQUID_TX_MINT =
  "f24a4b179b5cc7e88b25a763911f7cbdf2bf45d1d1b5ab611e94461cef0a183f";
export const LIQUID_TX_PEGOUT_REQUEST =
  "ce4caece413cd9d444ce7ed9f54e5b328b3da5e4af301aff59a3571f76e988f2";

/** Federation payout to SideSwap's customer desk (3,996.01834922 BTC). */
export const LIQUID_PEGOUT_SATS = 399_601_834_922;
/** SideSwap forward to the actor wallet (3,995.99999857 BTC). */
export const LIQUID_FORWARDED_SATS = 399_599_999_857;
/** Returned to the federation peg on 7 Sep 2026 (3,400 BTC). */
export const LIQUID_RETURNED_SATS = 340_000_000_000;
/** Change kept by the actor in the return tx (598.49955894 BTC). */
export const LIQUID_KEPT_SATS = 59_849_955_894;

const addresses: LiquidAddress[] = [
  {
    address: LIQUID_ACTOR,
    label: "Actor consolidation wallet",
    role: "actor",
    note: "Received the SideSwap forward, posted on-chain messages, returned 3,400 BTC, still holds the remainder.",
    receivedSats: 2_877_899_220_453,
    sentSats: 2_818_049_176_338,
  },
  {
    address: LIQUID_PEG,
    label: "Liquid Federation peg wallet",
    role: "federation-peg",
    note: "11-of-15 federation reserve. Paid the peg-out on 6 Sep, received 3,400 BTC back on 7 Sep.",
    receivedSats: 2_336_286_329_624,
    sentSats: 1_976_139_125_852,
  },
  {
    address: LIQUID_SIDESWAP_PAYOUT,
    label: "SideSwap peg-out payout",
    role: "sideswap-payout",
    note: "Federation paid 3,996.01834922 BTC here; SideSwap forwarded it to the actor in the same block.",
    receivedSats: 399_601_834_922,
    sentSats: 399_601_834_922,
  },
  {
    address: LIQUID_BLOCKSTREAM_MSG,
    label: "Blockstream on-chain reply",
    role: "blockstream",
    note: "One of the addresses used to PGP-sign OP_RETURN replies to the actor.",
    receivedSats: 9_495,
    sentSats: 8_495,
  },
];

const byAddress = new Map(addresses.map((a) => [a.address, a]));

export const liquidSummary: ForensicsSummary = {
  generatedAt: "2026-09-10T14:00:00.000Z",
  source:
    "Public reconstructions: Liquid incident report, Bitquery, CertiK, mempool.space",
  totalSweptSats: LIQUID_FORWARDED_SATS,
  victimAddressCount: 0,
  sweepTxCount: 1,
  blockSpan: [965_783, 965_950],
  firstSweepTime: 1_788_704_936,
  lastSweepTime: 1_788_797_365,
  waveCount: 1,
  attribution:
    "Self-described whitehats via OP_RETURN. Bitcoin main chain was not affected. Remaining 598.5 BTC is outstanding, not a confirmed bounty.",
};

export const liquidTimeline: LiquidTimelineEvent[] = [
  {
    at: "2026-09-06T13:53:10Z",
    title: "Unbacked L-BTC minted",
    detail:
      "Elements range-proof cache collision on Liquid block 4,050,336. About 4,000 L-BTC created without BTC in reserve.",
    href: `https://blockstream.info/liquid/tx/${LIQUID_TX_MINT}`,
    chain: "liquid",
  },
  {
    at: "2026-09-06T14:06:10Z",
    title: "Peg-out requested through SideSwap",
    detail:
      "SideSwap, a federation member with a peg-out authorization key, requested 3,996.01834922 L-BTC out. No keys were stolen; the invalid L-BTC already looked valid.",
    href: `https://blockstream.info/liquid/tx/${LIQUID_TX_PEGOUT_REQUEST}`,
    chain: "liquid",
  },
  {
    at: "2026-09-06T14:28:56Z",
    title: "Federation paid 3,996 BTC",
    detail:
      "Bitcoin block 965,783. Eleven of fifteen functionaries signed a normal peg-out. Reserve fell from about 4,205 BTC toward 197 BTC after later peg-outs and the halt.",
    href: `https://mempool.space/tx/${LIQUID_TX_FEDERATION_PEGOUT}`,
    chain: "btc",
  },
  {
    at: "2026-09-06T14:28:56Z",
    title: "SideSwap forwarded coins to the actor",
    detail:
      "3,995.99999857 BTC landed at the actor wallet in the same Bitcoin block.",
    href: `https://mempool.space/tx/${LIQUID_TX_SIDESWAP_FORWARD}`,
    chain: "btc",
  },
  {
    at: "2026-09-06T18:30:00Z",
    title: "On-chain contact",
    detail:
      'Actor OP_RETURN: "we are whitehats. contact us on chain." Blockstream answered in OP_RETURN with PGP-signed notes. Unsigned "keep a bounty, send here" replies were hijack attempts.',
    chain: "btc",
  },
  {
    at: "2026-09-07T16:09:25Z",
    title: "3,400 BTC returned to the peg",
    detail:
      "Bitcoin block 965,950. Change of 598.49955894 BTC stayed with the actor. Liquid says discussions continue; no public bounty agreement covers the remainder.",
    href: `https://mempool.space/tx/${LIQUID_TX_RETURN}`,
    chain: "btc",
  },
  {
    at: "2026-09-09T00:00:00Z",
    title: "Elements v23.3.4",
    detail:
      "Emergency release hardens range-proof cache keys. Liquid warned about fake update sites. Peg-ins and peg-outs stay paused while functionaries restore a corrected state.",
    href: "https://github.com/ElementsProject/elements",
    chain: "liquid",
  },
];

export function normalizeLiquidKey(address: string): string {
  const trimmed = address.trim();
  if (trimmed.toLowerCase().startsWith("bc1")) return trimmed.toLowerCase();
  return trimmed;
}

export function getLiquidAddress(address: string): LiquidAddress | undefined {
  return byAddress.get(normalizeLiquidKey(address));
}

export function allLiquidAddresses(): LiquidAddress[] {
  return addresses;
}

export function liquidAsHolder(row: LiquidAddress): HolderMeta {
  return {
    address: row.address,
    label: row.label,
    role: row.role,
    wave: 1,
    receivedSats: row.receivedSats,
    sentSats: row.sentSats,
  };
}

export function liquidWatchAddresses(): HolderMeta[] {
  return addresses.map(liquidAsHolder);
}

export function isLiquidActor(address: string): boolean {
  return normalizeLiquidKey(address) === LIQUID_ACTOR;
}
