"use client";

import {
  REGIME_BLURBS,
  REGIME_HOWTO_STEPS,
  REGIME_IDS,
  REGIME_LABELS,
  STANCE_BY_REGIME,
  STANCE_LABELS,
  type RegimeId,
} from "@/lib/regime/types";

export function RegimeHowTo({ current }: { current: RegimeId | null }) {
  return (
    <div className="mt-4 max-w-2xl">
      <p className="text-sm leading-relaxed text-paper-muted">
        The dials pick the weather. This picks a paper stance. Nothing is sent
        to Hyperliquid, and it does not promise returns.
      </p>
      <details className="group mt-3">
        <summary className="cursor-pointer text-sm text-paper underline decoration-dotted decoration-paper-muted/50 underline-offset-4 marker:text-accent hover:text-accent">
          How to use it
        </summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-paper-muted">
          {REGIME_HOWTO_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="mt-5 text-[10px] uppercase tracking-[0.18em] text-paper-muted">
          Weather map
        </p>
        <dl className="mt-2 divide-y divide-line/80">
          {REGIME_IDS.map((id) => {
            const active = current === id;
            const stance = STANCE_BY_REGIME[id];
            return (
              <div
                key={id}
                className={`flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 ${
                  active ? "text-paper" : "text-paper-muted"
                }`}
              >
                <dt className="text-sm font-semibold">
                  {REGIME_LABELS[id]}
                  <span className="font-medium text-paper-muted">
                    {" "}
                    → {STANCE_LABELS[stance]}
                  </span>
                  {active ? (
                    <span className="ml-2 text-[10px] font-medium uppercase tracking-[0.14em] text-accent">
                      now
                    </span>
                  ) : null}
                </dt>
                <dd className="text-xs leading-relaxed sm:max-w-sm sm:text-right">
                  {REGIME_BLURBS[id]}
                </dd>
              </div>
            );
          })}
        </dl>
      </details>
    </div>
  );
}
