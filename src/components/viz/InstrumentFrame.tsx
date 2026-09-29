"use client";

import { Hint } from "@/components/ui/Hint";
import { ReadingStatus } from "@/components/status/ReadingStatus";
import { useInstrumentPreview } from "@/components/viz/instrument-preview";
import { useInstrumentActive } from "@/components/viz/InstrumentActivity";
import { useChainOptional } from "@/lib/chains/context";
import { feedCatchupLabel } from "@/lib/feed-status";
import { useInstrumentStage } from "@/lib/instrument-stage";
import { INSTRUMENT_ORDER, type InstrumentId } from "@/lib/instruments";
import type { TipId } from "@/lib/settings/tips";
import { useDashboardStore } from "@/lib/store";

function ExpandIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M9 3H3v6M15 3h6v6M9 21H3v-6M21 15v6h-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 3l7 7M21 3l-7 7M3 21l7-7M21 21l-7-7"
        strokeLinecap="round"
      />
    </svg>
  );
}

const INSTRUMENT_TIP: Record<InstrumentId, TipId> = {
  metronome: "instrument.metronome",
  atmosphere: "instrument.atmosphere",
  sigil: "instrument.sigil",
  issuance: "instrument.issuance",
  forge: "instrument.forge",
};

export function InstrumentFrame({
  title,
  subtitle,
  reading,
  children,
  className = "",
  large = false,
  instrumentId,
}: {
  title: string;
  subtitle: string;
  reading?: string;
  children: React.ReactNode;
  className?: string;
  large?: boolean;
  instrumentId?: InstrumentId;
}) {
  const open = useInstrumentStage((s) => s.open);
  const chain = useChainOptional();
  const preview = useInstrumentPreview();
  const active = useInstrumentActive();
  const connection = useDashboardStore((s) => s.connection);
  const live = useDashboardStore((s) => s.live);
  const feedKey = instrumentId === "forge" ? "hashrate" : instrumentId === "atmosphere" ? "mempool" : "blocks";
  const primaryFeed = chain?.id === "btc" ? live.feeds?.[feedKey] : undefined;
  const difficultyFeed = chain?.id === "btc" && instrumentId === "forge" ? live.feeds?.difficulty : undefined;
  const feed = difficultyFeed && primaryFeed ? {
    updatedAt: difficultyFeed.updatedAt != null && primaryFeed.updatedAt != null ? Math.min(difficultyFeed.updatedAt, primaryFeed.updatedAt) : null,
    error: difficultyFeed.error ?? primaryFeed.error,
    loading: difficultyFeed.loading || primaryFeed.loading,
  } : difficultyFeed ?? primaryFeed;
  const updatedAt = chain?.id === "btc" ? feed?.updatedAt ?? null : live.lastRestAt;
  const catchupNote = feedCatchupLabel(connection);
  const narrative =
    instrumentId && chain
      ? chain.instruments[instrumentId].narrative
      : null;

  const expand = () => {
    if (instrumentId) open(instrumentId);
  };

  // Keep title markup identical whether tips are armed or not. Hint only
  // adds behavior; it must not change the kicker's class tree across hydrate.
  const titleNode =
    instrumentId && !preview ? (
      <Hint tip={INSTRUMENT_TIP[instrumentId]} chainId={chain?.id} as="div">
        <p className="instrument-frame-kicker underline decoration-dotted decoration-accent/40 underline-offset-2">
          {title}
        </p>
      </Hint>
    ) : (
      <p className="instrument-frame-kicker">{title}</p>
    );

  return (
    <article
      data-instrument={instrumentId}
      className={`instrument-frame group/frame relative flex flex-col overflow-hidden ${
        large ? "instrument-frame--large" : ""
      } ${preview ? "instrument-frame--preview" : ""} ${className}`}
    >
      {/* Specular edge + depth layers (CSS paints the glass) */}
      <div className="instrument-frame-sheen pointer-events-none absolute inset-0" aria-hidden />
      <div className="instrument-frame-vignette pointer-events-none absolute inset-0" aria-hidden />

      <header className="instrument-frame-header relative z-[1]">
        <div className="instrument-frame-heading">
          <div className="flex items-center gap-2">
            <span className="instrument-index mono" aria-hidden>{instrumentId ? String(INSTRUMENT_ORDER.indexOf(instrumentId) + 1).padStart(2, "0") : "CD"}</span>
            {titleNode}
          </div>
          <p
            className="instrument-frame-subtitle mt-1"
            title={narrative ?? subtitle}
          >
            {subtitle}
          </p>
          {!preview && <ReadingStatus updatedAt={updatedAt} error={chain?.id === "btc" ? feed?.error : connection === "degraded" || connection === "disconnected" ? "Feed is reconnecting" : null} loading={feed?.loading ?? connection === "connecting"} staleMs={120_000} />}
        </div>
        <div className="instrument-frame-controls">
          {catchupNote ? (
            <span
              className="rounded-md border border-warn/40 bg-warn/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-warn"
              role="status"
            >
              {catchupNote}
            </span>
          ) : null}
          {reading != null && (
            <p
              className={`instrument-frame-reading mono text-paper ${
                large ? "instrument-frame-reading--large" : ""
              }`}
            >
              {reading}
            </p>
          )}
          {instrumentId && !preview && (
            <Hint tip="instrument.expand">
              <button
                type="button"
                onClick={expand}
                className="instrument-expand-btn inline-flex min-h-10 items-center gap-1.5 rounded-md border border-line/80 bg-ink/40 px-2.5 text-paper-muted backdrop-blur-sm transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={`Open ${title} fullscreen`}
              >
                <ExpandIcon />
              </button>
            </Hint>
          )}
        </div>
      </header>
      <div
        className={`instrument-frame-body relative z-[1] flex flex-1 items-center justify-center ${
          large ? "instrument-frame-body--large" : ""
        }`}
      >
        {/* Soft stage well under the canvas */}
        <div className="instrument-stage-well pointer-events-none absolute inset-3 rounded-[12px]" aria-hidden />
        <div className="instrument-calibration" aria-hidden><span>+</span><span>+</span><span>+</span><span>+</span></div>
        <div key={active ? "animated" : "still"} className="instrument-art relative z-[1] flex h-full w-full items-center justify-center">
          {children}
        </div>
      </div>
    </article>
  );
}
