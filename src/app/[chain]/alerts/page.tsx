"use client";

import { AppShell } from "@/components/shell/AppShell";
import { LocalReturnNudge } from "@/components/monetization/LocalReturnNudge";
import { ProGate } from "@/components/monetization/ProGate";
import { useChain } from "@/lib/chains/context";
import { isProEnabled } from "@/lib/pro";

function DemoRules({ chainName, feeUnit, cadence }: {
  chainName: string;
  feeUnit: string;
  cadence: string;
}) {
  return (
    <div className="space-y-3 bg-ink-elevated p-6">
      {[
        `Fee hottest > threshold (${feeUnit})`,
        `No new ${cadence} for a while`,
        "Waiting room looking stuffed",
        "Price ±5% in 1 hour",
      ].map((rule) => (
        <div
          key={rule}
          className="flex items-center justify-between rounded-[10px] border border-line px-4 py-3"
        >
          <span className="text-sm text-paper">{rule}</span>
          <span className="text-xs text-paper-muted">
            {isProEnabled() ? "Local sketch" : "Demo"}
          </span>
        </div>
      ))}
      <p className="text-xs text-paper-muted">
        {isProEnabled()
          ? `These are local sketches for ${chainName}. Email / webhooks still ship later.`
          : `Preview props for ${chainName}. Not emailing anyone yet.`}
      </p>
    </div>
  );
}

export default function AlertsPage() {
  const chain = useChain();
  const pro = isProEnabled();

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-paper">Alerts</h1>
        <p className="mt-2 text-paper-muted">
          {pro
            ? `Local nudge sketches for ${chain.name}. Full email rules are still warming up.`
            : `A peek at the kind of nudges Pro will send for ${chain.name}. Email and full rules are still preview. You can turn on a local browser nudge below while you wait.`}
        </p>
      </div>
      {pro ? (
        <DemoRules
          chainName={chain.name}
          feeUnit={chain.feeUnit}
          cadence={chain.cadenceLabel}
        />
      ) : (
        <ProGate
          title="Fee & tip nudges"
          detail="These rules are fake props for now. We aren’t emailing you about fees (yet)."
          ctaLabel="Join the Pro waitlist"
          ctaHref={`/${chain.slug}/pro#waitlist`}
        >
          <DemoRules
            chainName={chain.name}
            feeUnit={chain.feeUnit}
            cadence={chain.cadenceLabel}
          />
        </ProGate>
      )}
      <LocalReturnNudge />
    </AppShell>
  );
}
