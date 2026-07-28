"use client";

import { AppShell } from "@/components/shell/AppShell";
import { ProGate } from "@/components/monetization/ProGate";

export default function AlertsPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-paper">Alerts</h1>
        <p className="mt-2 text-paper-muted">
          Fee spikes, stagnant tips, and pressure bands — Pro preview (not armed).
        </p>
      </div>
      <ProGate
        title="Fee & tip alerts"
        detail="Rules below are mockups for the upcoming Pro alerts product. Nothing is monitoring your network yet."
        ctaLabel="Join Pro waitlist"
        ctaHref="/pro#waitlist"
      >
        <div className="space-y-3 bg-ink-elevated p-6">
          {[
            "Fee fastest > 50 sat/vB",
            "No block for 30 minutes",
            "Mempool pressure > 200%",
            "Price ±5% in 1 hour",
          ].map((rule) => (
            <div
              key={rule}
              className="flex items-center justify-between rounded-[10px] border border-line px-4 py-3"
            >
              <span className="text-sm text-paper">{rule}</span>
              <span className="text-xs text-paper-muted">Preview</span>
            </div>
          ))}
        </div>
      </ProGate>
    </AppShell>
  );
}
