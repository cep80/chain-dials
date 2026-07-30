import { fetchChainSnapshot } from "@/lib/chains/snapshot";
import { fetchTip } from "@/lib/chains/fetch";
import type { ChainId } from "@/lib/chains/types";
import type { InstrumentId } from "@/lib/instruments";
import { formatDuration, formatFee, formatHash, formatInteger, formatPlainPercent } from "@/lib/format";

export interface ShareReading {
  headline: string;
  sub: string;
  accent: string;
}

function fmtSince(ts: number | null): string {
  if (ts == null) return "-";
  return formatDuration(Math.max(0, (Date.now() - ts) / 1000));
}

export async function readingForInstrument(
  chainId: ChainId,
  instrument: InstrumentId,
): Promise<ShareReading> {
  if (chainId === "btc") {
    return btcReading(instrument);
  }
  const snap = await fetchChainSnapshot(chainId);
  if (chainId === "eth") return ethReading(instrument, snap);
  if (chainId === "hype") return hypeReading(instrument, snap);
  return solReading(instrument, snap);
}

async function btcReading(instrument: InstrumentId): Promise<ShareReading> {
  const accent = "#f7931a";
  try {
    const tip = await fetchTip("btc");
    const since = fmtSince(tip.timestamp);
    const [feesRes, mempoolRes] = await Promise.all([
      fetch("https://mempool.space/api/v1/fees/recommended", {
        next: { revalidate: 0 },
      }).catch(() => null),
      fetch("https://mempool.space/api/mempool", {
        next: { revalidate: 0 },
      }).catch(() => null),
    ]);
    const fees = feesRes?.ok
      ? ((await feesRes.json()) as { fastestFee?: number })
      : null;
    const mempool = mempoolRes?.ok
      ? ((await mempoolRes.json()) as { count?: number; vsize?: number })
      : null;

    switch (instrument) {
      case "metronome":
        return { headline: since, sub: "since tip", accent };
      case "atmosphere":
        return {
          headline:
            mempool?.count != null
              ? formatInteger(mempool.count)
              : formatFee(fees?.fastestFee, "sat/vB"),
          sub:
            mempool?.count != null
              ? "txs waiting"
              : "fastest fee",
          accent,
        };
      case "sigil":
        return {
          headline: formatHash(tip.hash),
          sub:
            tip.height != null
              ? `block ${formatInteger(tip.height)}`
              : "tip hash",
          accent,
        };
      case "issuance":
        return {
          headline: tip.height != null ? formatInteger(tip.height) : "-",
          sub: "height · halving clock on board",
          accent,
        };
      case "forge":
        return {
          headline: formatFee(fees?.fastestFee, "sat/vB"),
          sub: "fee mood · hashrate on board",
          accent,
        };
    }
  } catch {
    return { headline: "live", sub: "Bitcoin dial", accent };
  }
}

async function ethReading(
  instrument: InstrumentId,
  snap: Awaited<ReturnType<typeof fetchChainSnapshot>>,
): Promise<ShareReading> {
  const accent = "#627eea";
  const base =
    snap.baseFeeSeries[snap.baseFeeSeries.length - 1] ?? snap.feeFastest;
  switch (instrument) {
    case "metronome":
      return {
        headline: fmtSince(snap.tip.timestamp),
        sub: "since tip · lattice",
        accent,
      };
    case "atmosphere":
      return {
        headline: formatFee(base, "gwei"),
        sub: "base fee",
        accent,
      };
    case "sigil":
      return {
        headline: formatHash(snap.tip.hash),
        sub:
          snap.tip.height != null
            ? `block ${formatInteger(snap.tip.height)}`
            : "tip mosaic",
        accent,
      };
    case "issuance":
      return {
        headline:
          snap.burnEthPerBlock != null
            ? `${snap.burnEthPerBlock.toFixed(3)} ETH`
            : formatPlainPercent(snap.issuanceProgress, 0),
        sub: "burned last block",
        accent,
      };
    case "forge":
      return {
        headline: snap.forgeLabel ?? formatPlainPercent(snap.securityScore != null ? snap.securityScore * 100 : null, 0),
        sub: "stake sky",
        accent,
      };
  }
}

async function solReading(
  instrument: InstrumentId,
  snap: Awaited<ReturnType<typeof fetchChainSnapshot>>,
): Promise<ShareReading> {
  const accent = "#14f195";
  switch (instrument) {
    case "metronome":
      return {
        headline: fmtSince(snap.tip.timestamp),
        sub: "since slot",
        accent,
      };
    case "atmosphere":
      return {
        headline: formatFee(snap.feeFastest, "µLamports"),
        sub: "priority p90",
        accent,
      };
    case "sigil":
      return {
        headline: formatHash(snap.tip.hash),
        sub:
          snap.tip.height != null
            ? `slot ${formatInteger(snap.tip.height)}`
            : "leader ribbon",
        accent,
      };
    case "issuance":
      return {
        headline:
          snap.inflationRate != null
            ? `${snap.inflationRate.toFixed(1)}%`
            : formatPlainPercent(snap.issuanceProgress, 1),
        sub:
          snap.inflationRate != null
            ? "inflation · epoch on board"
            : "through epoch",
        accent,
      };
    case "forge":
      return {
        headline: snap.forgeLabel ?? "-",
        sub: "stake reef",
        accent,
      };
  }
}

async function hypeReading(
  instrument: InstrumentId,
  snap: Awaited<ReturnType<typeof fetchChainSnapshot>>,
): Promise<ShareReading> {
  const accent = "#97FCE4";
  const funding = snap.baseFeeSeries[snap.baseFeeSeries.length - 1];
  switch (instrument) {
    case "metronome":
      return {
        headline: fmtSince(snap.tip.timestamp),
        sub: "since tip · clearing clock",
        accent,
      };
    case "atmosphere":
      return {
        headline:
          funding != null
            ? `${funding > 0 ? "+" : ""}${funding.toFixed(2)} bps`
            : formatFee(snap.feeFastest, "gwei"),
        sub: funding != null ? "funding" : "gas",
        accent,
      };
    case "sigil":
      return {
        headline: formatHash(snap.tip.hash),
        sub:
          snap.tip.height != null
            ? `block ${formatInteger(snap.tip.height)}`
            : "hash tape",
        accent,
      };
    case "issuance":
      return {
        headline:
          snap.inflationRate != null
            ? `$${snap.inflationRate.toFixed(1)}B`
            : formatPlainPercent(snap.issuanceProgress, 0),
        sub: "24h notional",
        accent,
      };
    case "forge":
      return {
        headline: snap.forgeLabel ?? "-",
        sub: "OI vault",
        accent,
      };
  }
}
