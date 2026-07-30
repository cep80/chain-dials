"use client";

import { useChain } from "@/lib/chains/context";
import {
  formatDuration,
  formatFee,
  formatInteger,
  formatPlainPercent,
  formatUsd,
} from "@/lib/format";
import { useSettingsStore } from "@/lib/settings/store";
import { useDashboardStore } from "@/lib/store";

/** Slim term-hint row for ETH/SOL/HYPE core boards. */
export function CoreTermHints() {
  const chain = useChain();
  const show = useSettingsStore((s) => s.showTermHints);
  const live = useDashboardStore((s) => s.live);
  const now = useDashboardStore((s) => s.now);
  const since =
    live.tipTimestamp != null ? (now - live.tipTimestamp) / 1000 : null;

  if (!show) return null;

  const rows =
    chain.id === "eth"
      ? [
          {
            term: "Base fee",
            value: formatFee(
              live.baseFeeSeries[live.baseFeeSeries.length - 1] ??
                live.feeFastest,
              "gwei",
            ),
            hint: "Burned with every unit of gas (EIP-1559).",
          },
          {
            term: "Burn (last block)",
            value:
              live.burnEthPerBlock != null
                ? `${live.burnEthPerBlock.toFixed(3)} ETH`
                : "-",
            hint: "Approx base fee × gas used in the tip block.",
          },
          {
            term: "Block fullness",
            value:
              live.mempoolPressure != null
                ? formatPlainPercent(live.mempoolPressure, 0)
                : "-",
            hint: "Mean gas-used ratio across recent blocks - not a pending mempool.",
          },
          {
            term: "Epoch",
            value:
              live.retargetProgress != null
                ? formatPlainPercent(live.retargetProgress, 0)
                : "-",
            hint: "Execution height mapped onto a 32-slot epoch window.",
          },
          {
            term: "Stake warmth",
            value: live.forgeLabel ?? "-",
            hint: "Bonded validator stake from beacon sources when available.",
          },
        ]
      : chain.id === "hype"
        ? [
            {
              term: "Funding",
              value: (() => {
                const f = live.baseFeeSeries[live.baseFeeSeries.length - 1];
                if (f == null) return "-";
                const sign = f > 0 ? "+" : "";
                return `${sign}${f.toFixed(2)} bps`;
              })(),
              hint: "Latest sample from top-volume perps (info API).",
            },
            {
              term: "Gas (HyperEVM)",
              value: formatFee(live.feeFastest, "gwei"),
              hint: "Base + priority tip from HyperEVM fee history.",
            },
            {
              term: "Since tip",
              value: formatDuration(since),
              hint: "Time since last HyperEVM block.",
            },
            {
              term: "24h notional",
              value:
                live.inflationRate != null
                  ? `$${live.inflationRate.toFixed(1)}B`
                  : "-",
              hint: "Sum of dayNtlVlm across the perp universe.",
            },
            {
              term: "OI vault",
              value: live.forgeLabel ?? "-",
              hint: "Aggregate open interest (coin × mark) across perps.",
            },
          ]
        : [
          {
            term: "Priority fee",
            value: formatFee(live.feeFastest, "µLamports"),
            hint: "p90 of recent prioritization fee samples.",
          },
          {
            term: "Since tip",
            value: formatDuration(since),
            hint: "Time since last slot (block time when RPC provides it).",
          },
          {
            term: "Epoch",
            value:
              live.retargetProgress != null
                ? formatPlainPercent(live.retargetProgress, 1)
                : "-",
            hint: "How far through the current Solana epoch.",
          },
          {
            term: "Inflation",
            value:
              live.inflationRate != null
                ? `${live.inflationRate.toFixed(1)}%`
                : "-",
            hint: "On-chain getInflationRate total - drives fountain spray.",
          },
          {
            term: "Stake reef",
            value: live.forgeLabel ?? "-",
            hint: "Activated stake across vote accounts.",
          },
        ];

  return (
    <section className="mt-8" aria-labelledby="term-hints-heading">
      <div className="mb-4">
        <h2 id="term-hints-heading" className="text-2xl font-bold text-paper">
          Term hints
        </h2>
        <p className="mt-1 text-sm text-paper-muted">
          A short glossary for this board. Price right now:{" "}
          {formatUsd(live.priceUsd, 0)}
          {live.blockHeight != null
            ? ` · ${chain.cadenceLabel} ${formatInteger(live.blockHeight)}`
            : ""}
        </p>
      </div>
      <ul className="divide-y divide-line rounded-[14px] border border-line bg-ink-elevated/70">
        {rows.map((r) => (
          <li
            key={r.term}
            className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-paper">{r.term}</p>
              <p className="mt-0.5 text-xs text-paper-muted">{r.hint}</p>
            </div>
            <p className="mono shrink-0 text-sm text-accent">{r.value}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
