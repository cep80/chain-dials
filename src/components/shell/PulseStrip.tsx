"use client";

import { motion } from "framer-motion";
import { Hint } from "@/components/ui/Hint";
import { useChainOptional } from "@/lib/chains/context";
import { freshnessLabel } from "@/lib/chains/registry";
import {
  formatDuration,
  formatFee,
  formatInteger,
  formatUsdSmart,
} from "@/lib/format";
import type { TipId } from "@/lib/settings/tips";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import { useDashboardStore } from "@/lib/store";

function Chip({
  label,
  value,
  tense,
  tip,
  chainId,
  feeUnit,
}: {
  label: string;
  value: string;
  tense?: boolean;
  tip: TipId;
  chainId?: Parameters<typeof Hint>[0]["chainId"];
  feeUnit?: string;
}) {
  return (
    <Hint tip={tip} chainId={chainId} feeUnit={feeUnit} as="div" className="min-w-0 flex-1">
      <div
        className={`pulse-chip min-w-0 rounded-[10px] border px-3 py-2.5 md:px-4 ${
          tense
            ? "border-warn/50 bg-warn/10"
            : "border-line bg-ink-elevated/80"
        }`}
      >
        <div className="text-[10px] uppercase tracking-[0.16em] text-paper-muted underline decoration-dotted decoration-paper-muted/40 underline-offset-2">
          {label}
        </div>
        <div className="mono mt-1 truncate text-base font-medium text-paper md:text-lg">
          {value}
        </div>
      </div>
    </Hint>
  );
}

export function PulseStrip() {
  const live = useDashboardStore((s) => s.live);
  const now = useDashboardStore((s) => s.now);
  const chain = useChainOptional();
  const reduce = useAppReducedMotion();

  const since =
    live.tipTimestamp != null ? (now - live.tipTimestamp) / 1000 : null;
  const target = chain?.targetBlockSeconds ?? 600;
  const staleSlack =
    chain?.id === "sol" || chain?.id === "hype"
      ? Math.max(8, target * 20)
      : chain?.id === "eth"
        ? Math.max(target * 2.5, 20)
        : target * 1.2;
  const tense = since != null && since > staleSlack;
  const feeUnit = chain?.feeUnit ?? "sat/vB";
  const heightLabel =
    chain?.cadenceLabel === "slot"
      ? "Slot"
      : chain?.cadenceLabel === "ledger"
        ? "Ledger"
        : "Height";
  const heightTip: TipId =
    chain?.cadenceLabel === "slot" ? "pulse.slot" : "pulse.height";
  const queueLabel =
    chain?.id === "eth"
      ? "Last block"
      : chain?.id === "hype"
        ? "Perps"
        : chain && chain.id !== "btc"
          ? "Fee samples"
          : "Mempool";
  const queueTip: TipId =
    chain?.id === "eth"
      ? "pulse.last_block"
      : chain?.id === "hype"
        ? "pulse.perps"
        : chain && chain.id !== "btc"
          ? "pulse.fee_samples"
          : "pulse.mempool";
  const feeLabel =
    chain?.id === "sol"
      ? "Priority p90"
      : chain?.id === "eth" || chain?.id === "hype"
        ? "Gas p90"
        : "Fee";

  return (
    <motion.section
      aria-label="Quick network snapshot"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <Chip
        label="Price"
        value={formatUsdSmart(live.priceUsd)}
        tip="pulse.price"
        chainId={chain?.id}
      />
      <Chip
        label={heightLabel}
        value={live.blockHeight != null ? formatInteger(live.blockHeight) : "-"}
        tip={heightTip}
        chainId={chain?.id}
      />
      <Chip
        label={queueLabel}
        value={
          live.mempoolCount != null ? formatInteger(live.mempoolCount) : "-"
        }
        tip={queueTip}
        chainId={chain?.id}
      />
      <Chip
        label={feeLabel}
        value={formatFee(live.feeFastest, feeUnit)}
        tip="pulse.fee"
        chainId={chain?.id}
        feeUnit={feeUnit}
      />
      <Chip
        label="Since tip"
        value={formatDuration(since)}
        tense={tense}
        tip="pulse.since_tip"
        chainId={chain?.id}
      />
      {chain ? (
        <Chip
          label="Feed"
          value={
            chain.id === "btc"
              ? freshnessLabel(chain)
              : live.feedSource
                ? `${freshnessLabel(chain)}`
                : freshnessLabel(chain)
          }
          tip="pulse.feed"
          chainId={chain.id}
        />
      ) : null}
    </motion.section>
  );
}
