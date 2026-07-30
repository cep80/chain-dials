import { CHAINS } from "@/lib/chains/registry";
import type { ChainId } from "@/lib/chains/types";
import { INSTRUMENT_ORDER, type InstrumentId } from "@/lib/instruments";
import { METRIC_BY_ID } from "@/lib/metrics";
import { chainHashtags } from "@/lib/share/nostr";
import { siteUrl } from "@/lib/site";
import type { MetricId } from "@/types/metrics";

export function isInstrumentId(v: string): v is InstrumentId {
  return (INSTRUMENT_ORDER as string[]).includes(v);
}

export function instrumentSharePath(
  chainId: ChainId,
  instrument: InstrumentId,
): string {
  return `/${chainId}/i/${instrument}`;
}

export function metricSharePath(chainId: ChainId, metric: MetricId): string {
  return `/${chainId}/m/${metric}`;
}

export function boardSharePath(chainId: ChainId): string {
  return `/${chainId}`;
}

export function absoluteShareUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Punchy one-liners tuned for X - short, human, no bait. */
const INSTRUMENT_HOOKS: Record<
  ChainId,
  Record<InstrumentId, (reading: string) => string>
> = {
  btc: {
    metronome: (r) =>
      r.includes("m") || r.includes("s")
        ? `Since tip: ${r}. Still humming?`
        : `Block cadence check: ${r}.`,
    atmosphere: (r) => `Mempool weather: ${r}. Fee mist, live.`,
    sigil: () => `New tip face just dropped.`,
    issuance: (r) => `Halving clock: ${r} through this era.`,
    forge: (r) => `Hashrate heat: ${r}.`,
  },
  eth: {
    metronome: (r) => `Slot lattice: ${r} since tip.`,
    atmosphere: (r) => `Base fee tide: ${r}.`,
    sigil: () => `ETH tip mosaic, fresh hash glass.`,
    issuance: (r) => `Burn candle: ${r} last block.`,
    forge: (r) => `Validator sky: ${r}.`,
  },
  sol: {
    metronome: (r) => `Turbine tach: ${r} since slot.`,
    atmosphere: (r) => `Priority jets: ${r}.`,
    sigil: () => `Leader ribbon, new blockhash parade.`,
    issuance: (r) => `Inflation fountain: ${r}.`,
    forge: (r) => `Stake reef: ${r}.`,
  },
  hype: {
    metronome: (r) => `Clearing clock: ${r} since tip.`,
    atmosphere: (r) => `Funding tide: ${r}.`,
    sigil: () => `Hash tape just printed a new tip.`,
    issuance: (r) => `Volume fountain: ${r} notional spray.`,
    forge: (r) => `OI vault: ${r}.`,
  },
};

function hashLine(chainId?: ChainId): string {
  const tags = chainId ? chainHashtags(chainId) : ["nostr", "bitcoin"];
  return tags.map((t) => `#${t}`).join(" ");
}

export type SharePayload = {
  /** X / generic share text (URL included, no hashtag spam). */
  text: string;
  /** Nostr kind:1 body (same story + topical hashtags). */
  nostrText: string;
  url: string;
  chainId?: ChainId;
  intentUrl: string;
};

function asSharePayload(
  text: string,
  url: string,
  chainId?: ChainId,
): SharePayload {
  const nostrText = `${text}\n\n${hashLine(chainId)}`;
  return {
    text,
    nostrText,
    url,
    chainId,
    intentUrl: xIntentUrl(text),
  };
}

export function composeInstrumentTweet(opts: {
  chainId: ChainId;
  instrument: InstrumentId;
  reading?: string | null;
}): SharePayload {
  const chain = CHAINS[opts.chainId];
  const meta = chain.instruments[opts.instrument];
  const reading = (opts.reading ?? "").trim() || "live";
  const url = absoluteShareUrl(
    instrumentSharePath(opts.chainId, opts.instrument),
  );
  const hook = INSTRUMENT_HOOKS[opts.chainId][opts.instrument](reading);
  const text = [`${chain.shortName} · ${meta.frameTitle}`, hook, "", url].join(
    "\n",
  );
  return asSharePayload(text, url, opts.chainId);
}

export function composeMetricTweet(opts: {
  chainId: ChainId;
  metric: MetricId;
  display: string;
}): SharePayload {
  const chain = CHAINS[opts.chainId];
  const def = METRIC_BY_ID[opts.metric];
  const label = def?.label ?? opts.metric;
  const url = absoluteShareUrl(metricSharePath(opts.chainId, opts.metric));
  const text = [`${chain.shortName} · ${label}`, opts.display, "", url].join(
    "\n",
  );
  return asSharePayload(text, url, opts.chainId);
}

export function composeBoardTweet(opts: {
  chainId: ChainId;
  fee?: string | null;
  since?: string | null;
}): SharePayload {
  const chain = CHAINS[opts.chainId];
  const url = absoluteShareUrl(boardSharePath(opts.chainId));
  const bits = [
    opts.since ? `tip ${opts.since}` : null,
    opts.fee ? `fee ${opts.fee}` : null,
  ].filter(Boolean);
  const text = [
    `${chain.name} dials`,
    bits.length ? bits.join(" · ") : chain.blurb,
    "",
    url,
  ].join("\n");
  return asSharePayload(text, url, opts.chainId);
}

export function composeSuiteTweet(): SharePayload {
  const url = absoluteShareUrl("/");
  const text = [
    "Chain Dials",
    "Bitcoin, Ethereum, Solana - same habit, different toys.",
    "",
    url,
  ].join("\n");
  return asSharePayload(text, url);
}

/** Current X compose intent (twitter.com still redirects). */
export function xIntentUrl(text: string): string {
  const q = new URLSearchParams({ text });
  return `https://x.com/intent/post?${q.toString()}`;
}
