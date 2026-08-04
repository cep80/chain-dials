"use client";

import { Hint } from "@/components/ui/Hint";
import { useChainOptional } from "@/lib/chains/context";
import { useInstrumentStage } from "@/lib/instrument-stage";
import type { InstrumentId } from "@/lib/instruments";
import type { TipId } from "@/lib/settings/tips";

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
  const narrative =
    instrumentId && chain
      ? chain.instruments[instrumentId].narrative
      : null;

  const expand = () => {
    if (instrumentId) open(instrumentId);
  };

  const titleNode = instrumentId ? (
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
      className={`instrument-frame group/frame relative flex flex-col overflow-hidden ${
        large ? "instrument-frame--large" : ""
      } ${className}`}
    >
      {/* Specular edge + depth layers (CSS paints the glass) */}
      <div className="instrument-frame-sheen pointer-events-none absolute inset-0" aria-hidden />
      <div className="instrument-frame-vignette pointer-events-none absolute inset-0" aria-hidden />

      <header className="instrument-frame-header relative z-[1] flex items-start justify-between gap-3">
        <div className="min-w-0">
          {titleNode}
          <p
            className="instrument-frame-subtitle mt-0.5 truncate"
            title={narrative ?? subtitle}
          >
            {subtitle}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {reading != null && (
            <p
              className={`instrument-frame-reading mono text-right text-paper ${
                large ? "instrument-frame-reading--large" : ""
              }`}
            >
              {reading}
            </p>
          )}
          {instrumentId && (
            <Hint tip="instrument.expand">
              <button
                type="button"
                onClick={expand}
                className="instrument-expand-btn inline-flex min-h-10 items-center gap-1.5 rounded-md border border-line/80 bg-ink/40 px-2.5 text-paper-muted backdrop-blur-sm transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={`Open ${title} fullscreen`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Expand
                </span>
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
        <div className="relative z-[1] flex h-full w-full items-center justify-center">
          {children}
        </div>
      </div>
    </article>
  );
}
