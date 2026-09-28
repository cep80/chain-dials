import {
  coldcardSummary,
  watchAddresses,
} from "@/lib/forensics/dataset";
import {
  isLiquidActor,
  liquidSummary,
  liquidWatchAddresses,
} from "@/lib/forensics/liquid";
import {
  fetchAddressesBatched,
  fetchPriceUsd,
} from "@/lib/forensics/mempool";
import type {
  ForensicsCaseId,
  WatchResponse,
  WatchedAddress,
} from "@/lib/forensics/types";

export { parseForensicsCase } from "@/lib/forensics/liquid";

export async function buildWatchboard(
  limit = 48,
  caseId: ForensicsCaseId = "coldcard",
): Promise<WatchResponse> {
  const metas =
    caseId === "liquid" ? liquidWatchAddresses() : watchAddresses(limit);
  const liveMap = await fetchAddressesBatched(metas.map((m) => m.address));
  const priceUsd = await fetchPriceUsd();

  const watched: WatchedAddress[] = metas.map((meta) => {
    const liveOrErr = liveMap.get(meta.address);
    if (!liveOrErr) {
      return { ...meta, live: null, error: "missing" };
    }
    if (liveOrErr instanceof Error) {
      return { ...meta, live: null, error: liveOrErr.message };
    }
    const trackMoves = caseId !== "liquid" || isLiquidActor(meta.address);
    const moved =
      trackMoves &&
      (liveOrErr.spentSats > meta.sentSats ||
        liveOrErr.balanceSats <
          Math.max(0, meta.receivedSats - meta.sentSats) - 1000);
    return { ...meta, live: liveOrErr, moved };
  });

  watched.sort((a, b) => {
    const ab = a.live?.balanceSats ?? Math.max(0, a.receivedSats - a.sentSats);
    const bb = b.live?.balanceSats ?? Math.max(0, b.receivedSats - b.sentSats);
    return bb - ab;
  });

  const totalLiveBalanceSats = watched.reduce(
    (sum, w) => sum + (w.live?.balanceSats ?? 0),
    0,
  );

  return {
    fetchedAt: Date.now(),
    priceUsd,
    summary: caseId === "liquid" ? liquidSummary : coldcardSummary,
    watched,
    totalLiveBalanceSats,
    movers: watched.filter((w) => w.moved),
  };
}
