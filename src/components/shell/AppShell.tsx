"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ConnectionStatus } from "@/components/status/ConnectionStatus";
import { InstrumentStage } from "@/components/viz/InstrumentStage";
import { formatRelativeAge } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const start = useDashboardStore((s) => s.start);
  const lastRestAt = useDashboardStore((s) => s.live.lastRestAt);
  const lastWsAt = useDashboardStore((s) => s.live.lastWsAt);
  const freshest = Math.max(lastRestAt ?? 0, lastWsAt ?? 0) || null;

  useEffect(() => {
    const stop = start();
    return () => stop();
  }, [start]);

  return (
    <div className="relative z-[1] flex min-h-full flex-col">
      <div className="border-b border-line/80 bg-ink/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/" className="font-bold tracking-tight text-paper">
              BTC<span className="text-accent">Dash</span>
            </Link>
            <Link href="/" className="text-paper-muted transition hover:text-paper">
              Board
            </Link>
            <Link href="/alerts" className="text-paper-muted transition hover:text-paper">
              Alerts
            </Link>
            <Link href="/wall" className="text-paper-muted transition hover:text-paper">
              Wall
            </Link>
            <Link href="/pro" className="text-paper-muted transition hover:text-paper">
              Pro
            </Link>
          </nav>
          <ConnectionStatus />
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6 md:py-10">
        {children}
      </main>

      <footer className="border-t border-line/80 bg-ink-elevated/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-paper-muted md:flex-row md:items-center md:justify-between md:px-6">
          <p>
            Data:{" "}
            <a
              href="https://mempool.space"
              target="_blank"
              rel="noreferrer"
              className="text-paper underline-offset-2 hover:text-accent hover:underline"
            >
              mempool.space
            </a>
            {" · "}
            updated {formatRelativeAge(freshest)}
          </p>
          <p>
            Free fundamentals forever ·{" "}
            <Link href="/pro" className="hover:text-accent">
              Unlock Pro
            </Link>
          </p>
        </div>
      </footer>

      <InstrumentStage />
    </div>
  );
}
