"use client";

import { useInstrumentStage } from "@/lib/instrument-stage";
import type { InstrumentId } from "@/lib/instruments";

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

  const expand = () => {
    if (instrumentId) open(instrumentId);
  };

  return (
    <article
      className={`group/frame relative flex flex-col overflow-hidden rounded-[14px] border border-line bg-ink-elevated/75 transition hover:border-accent/40 ${className}`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-line/80 px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-accent">
            {title}
          </p>
          <p className="mt-0.5 truncate text-xs text-paper-muted">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {reading != null && (
            <p
              className={`mono text-right text-paper ${
                large ? "text-sm" : "text-xs"
              }`}
            >
              {reading}
            </p>
          )}
          {instrumentId && (
            <button
              type="button"
              onClick={expand}
              className="rounded-md border border-line p-1.5 text-paper-muted transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={`Open ${title} fullscreen`}
              title="Fullscreen"
            >
              <ExpandIcon />
            </button>
          )}
        </div>
      </header>
      <div
        className={`relative flex flex-1 items-center justify-center ${
          large ? "min-h-[220px] p-5" : "min-h-[160px] p-4"
        } ${instrumentId ? "cursor-zoom-in" : ""}`}
        onClick={expand}
      >
        {children}
        {instrumentId && (
          <span className="pointer-events-none absolute bottom-2 right-2 rounded-full border border-line bg-ink/85 px-2 py-0.5 text-[9px] uppercase tracking-wider text-paper-muted opacity-0 transition group-hover/frame:opacity-100">
            Fullscreen
          </span>
        )}
      </div>
    </article>
  );
}
