"use client";

import { formatPercent, formatRelativeAge } from "@/lib/format";
import { usePredictionMarketCrosscheck } from "@/hooks/usePredictionMarketCrosscheck";
import type { ChainId } from "@/lib/chains/types";

function VenueLink({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-accent underline decoration-dotted underline-offset-2 hover:text-paper"
    >
      {children}
    </a>
  );
}

export function PredictionMarketCrosscheck({ chain }: { chain: ChainId }) {
  const { data, loading, error, reload } = usePredictionMarketCrosscheck(chain);
  const hasGaps = Boolean(data?.crossVenue.length || data?.withinVenue.length);
  const mismatch = data?.ruleMismatches[0] ?? null;
  const kalshiOn = data?.venues.kalshi ?? false;

  return (
    <aside className="mx-3 mb-3 rounded-[10px] border border-line/80 bg-ink-soft/45 p-3.5 md:mx-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-accent">
            Prediction-market cross-check
          </p>
          <h3 className="mt-1 text-sm font-semibold text-paper">
            {kalshiOn
              ? "Rule-matched parity scanner"
              : "Polymarket book scanner"}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="min-h-8 rounded-md border border-line px-2.5 text-[10px] uppercase tracking-wider text-paper-muted transition hover:border-accent/50 hover:text-paper"
        >
          Refresh
        </button>
      </div>

      {data && !kalshiOn ? (
        <p className="mt-2 text-xs leading-relaxed text-paper-muted">
          No Kalshi series ticker for this board yet. Scanning Polymarket only
          (within-venue YES+NO parity).
        </p>
      ) : null}

      {loading && !data ? (
        <p className="mt-2 text-xs text-paper-muted">Reading public order books…</p>
      ) : error && !data ? (
        <p className="mt-2 text-xs text-warn">{error}</p>
      ) : data ? (
        <>
          {hasGaps ? (
            <div className="mt-3 space-y-2">
              {data.crossVenue.map((gap) => (
                <div
                  key={`${gap.polymarketUrl}:${gap.kalshiUrl}`}
                  className="rounded-md border border-up/35 bg-up/5 p-2.5 text-xs text-paper-muted"
                >
                  <p className="text-paper">{gap.title}</p>
                  <p className="mt-1">
                    Buy Polymarket {gap.buyPolymarket.toUpperCase()} + Kalshi{" "}
                    {gap.buyKalshi.toUpperCase()} · gross edge{" "}
                    {formatPercent(gap.grossEdgePct, 2)}
                  </p>
                  <p className="mt-1">
                    <VenueLink href={gap.polymarketUrl}>Polymarket book</VenueLink>
                    {" · "}
                    <VenueLink href={gap.kalshiUrl}>Kalshi book</VenueLink>
                  </p>
                </div>
              ))}
              {data.withinVenue.map((gap) => (
                <div
                  key={gap.url}
                  className="rounded-md border border-up/35 bg-up/5 p-2.5 text-xs text-paper-muted"
                >
                  <p className="text-paper">{gap.title}</p>
                  <p className="mt-1">
                    {gap.venue} YES + NO asks · gross edge{" "}
                    {formatPercent(gap.grossEdgePct, 2)}
                  </p>
                  <p className="mt-1">
                    <VenueLink href={gap.url}>Open order book</VenueLink>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-paper-muted">
              No gross parity gaps above 1.0% found in the public books
              {kalshiOn
                ? `. Exact cross-venue pairs: ${data.exactPairCount}.`
                : "."}
            </p>
          )}

          {kalshiOn && mismatch ? (
            <div className="mt-3 rounded-md border border-line/70 bg-ink/40 p-2.5 text-[11px] leading-relaxed text-paper-muted">
              <p className="text-[10px] uppercase tracking-wider">
                Closest look-alike
              </p>
              <p className="mt-1">
                {mismatch.polymarket ? (
                  <VenueLink href={mismatch.polymarket.url}>Polymarket</VenueLink>
                ) : (
                  "Polymarket"
                )}
                {mismatch.polymarket
                  ? `: ${mismatch.polymarket.settlement}.`
                  : " contract unavailable."}{" "}
                {mismatch.kalshi ? (
                  <VenueLink href={mismatch.kalshi.url}>Kalshi</VenueLink>
                ) : (
                  "Kalshi"
                )}
                {mismatch.kalshi
                  ? `: ${mismatch.kalshi.settlement}.`
                  : " contract unavailable."}
              </p>
              <p className="mt-1">{mismatch.reasons.join(" ")}</p>
            </div>
          ) : null}
          <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-paper-muted">
            {kalshiOn ? "Polymarket + Kalshi" : "Polymarket only"} ·{" "}
            {formatRelativeAge(data.asOf)} · fees and fill risk excluded
          </p>
        </>
      ) : null}
    </aside>
  );
}
