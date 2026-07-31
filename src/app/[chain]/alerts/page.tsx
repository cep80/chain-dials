"use client";

import { AppShell } from "@/components/shell/AppShell";
import { LocalReturnNudge } from "@/components/monetization/LocalReturnNudge";
import { ProGate } from "@/components/monetization/ProGate";
import { useChain } from "@/lib/chains/context";

export default function AlertsPage() {
  const chain = useChain();
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-paper">Alerts</h1>
        <p className="mt-2 text-paper-muted">
          A preview of the nudges Pro will send for {chain.name}. Email and full
          rules are still coming. You can turn on a local browser nudge below
          while you wait.
        </p>
      </div>
      <ProGate
        title="Fee & tip nudges"
        detail="These rules are placeholders for now. We aren’t emailing you about fees yet."
        ctaLabel="Join the Pro waitlist"
        ctaHref={`/${chain.slug}/pro#waitlist`}
      >
        <div className="space-y-3 bg-ink-elevated p-6">
          {[
            `Fee hottest > threshold (${chain.feeUnit})`,
            `No new ${chain.cadenceLabel} for a while`,
            "Mempool looking full",
            "Price ±5% in 1 hour",
          ].map((rule) => (
            <div
              key={rule}
              className="flex items-center justify-between rounded-[10px] border border-line px-4 py-3"
            >
              <span className="text-sm text-paper">{rule}</span>
              <span className="text-xs text-paper-muted">Demo</span>
            </div>
          ))}
        </div>
      </ProGate>
      <LocalReturnNudge />
    </AppShell>
  );
}
