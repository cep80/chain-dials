"use client";

import Link from "next/link";
import { type MouseEvent, useEffect } from "react";
import { ChainSwitcher } from "@/components/shell/ChainSwitcher";
import { ConnectionStatus } from "@/components/status/ConnectionStatus";
import { Hint } from "@/components/ui/Hint";
import { InstrumentStage } from "@/components/viz/InstrumentStage";
import { useAltChainStore } from "@/lib/chains/alt-store";
import { useChainOptional } from "@/lib/chains/context";
import { CHAINS, freshnessLabel, SUITE } from "@/lib/chains/registry";
import { formatRelativeAge } from "@/lib/format";
import { isProEnabled } from "@/lib/pro";
import { useSettingsStore } from "@/lib/settings/store";
import { useDashboardStore } from "@/lib/store";

export function AppShell({
  children,
  suiteHome = false,
}: {
  children: React.ReactNode;
  /** Suite hub: no chain live feeds */
  suiteHome?: boolean;
}) {
  const chain = useChainOptional();
  const preferredChain = useSettingsStore((s) => s.preferredChain);
  const startBtc = useDashboardStore((s) => s.start);
  const hydrate = useDashboardStore((s) => s.hydrate);
  const resetLive = useDashboardStore((s) => s.resetLive);
  const patchLive = useDashboardStore((s) => s.patchLive);
  const loadFavoritesFor = useDashboardStore((s) => s.loadFavoritesFor);
  const startAlt = useAltChainStore((s) => s.start);
  const lastRestAt = useDashboardStore((s) => s.live.lastRestAt);
  const lastWsAt = useDashboardStore((s) => s.live.lastWsAt);
  const altLast = useAltChainStore((s) => s.live.lastAt);
  const altSource = useAltChainStore((s) => s.live.source);
  const freshest =
    chain && chain.id !== "btc"
      ? altLast
      : Math.max(lastRestAt ?? 0, lastWsAt ?? 0) || null;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const onResume = () => {
      useDashboardStore.getState().tick();
    };
    window.addEventListener("chaindials:resume", onResume);
    return () => window.removeEventListener("chaindials:resume", onResume);
  }, []);

  useEffect(() => {
    if (!chain) return;
    loadFavoritesFor(chain.id);
  }, [chain, loadFavoritesFor]);

  useEffect(() => {
    if (suiteHome || !chain) return;

    if (chain.id === "btc") {
      resetLive();
      return startBtc();
    }

    resetLive();
    const stopAlt = startAlt(chain.id);
    const tickDash = setInterval(() => {
      useDashboardStore.getState().tick();
    }, 1_000);
    const sync = (
      s: ReturnType<typeof useAltChainStore.getState>,
      prev?: ReturnType<typeof useAltChainStore.getState>,
    ) => {
      if (s.chainId !== chain.id) return;
      const pressure = s.live.mempoolPressure;
      const pulsed =
        !!prev &&
        s.live.blockHeight != null &&
        prev.live.blockHeight != null &&
        s.live.blockHeight > prev.live.blockHeight;
      const heightJump =
        pulsed && prev.live.blockHeight != null && s.live.blockHeight != null
          ? s.live.blockHeight - prev.live.blockHeight
          : 0;

      // Fast chains toast throttle: only when jump ≥ ~10 or ≥ 4s since last toast
      const toastOk =
        pulsed &&
        ((chain.id !== "sol" && chain.id !== "hype") ||
          heightJump >= 10 ||
          !useDashboardStore.getState().blockToast ||
          Date.now() - (useDashboardStore.getState().blockToast?.foundAt ?? 0) >
            4_000);

      patchLive(
        {
          priceUsd: s.live.priceUsd,
          blockHeight: s.live.blockHeight,
          tipHash: s.live.tipHash,
          tipTimestamp: s.live.tipTimestamp,
          feeFastest: s.live.feeFastest,
          feeHalfHour: s.live.feeHalfHour,
          feeHour: s.live.feeHour,
          feeEconomy: s.live.feeEconomy,
          mempoolCount: s.live.mempoolCount,
          mempoolPressure: pressure,
          mempoolVsize:
            pressure != null ? Math.round((pressure / 100) * 1_000_000) : null,
          feeHistogram: s.live.feeHistogram,
          recentTxs: s.live.recentTxs,
          baseFeeSeries: s.live.baseFeeSeries,
          prioritySeries: s.live.prioritySeries,
          securityScore: s.live.securityScore,
          forgeLabel: s.live.forgeLabel,
          issuanceProgress: s.live.issuanceProgress,
          supplyProgress: s.live.supplyProgress,
          inflationRate: s.live.inflationRate,
          burnEthPerBlock: s.live.burnEthPerBlock,
          feedSource: s.live.source,
          retargetProgress: s.live.epochProgress,
          retargetBlocks: s.live.epochBlocksLeft,
          hashrate: null,
          lastRestAt: s.live.lastAt,
        },
        { pulse: pulsed, connection: s.connection },
      );

      if (toastOk && s.live.blockHeight != null) {
        const last = useDashboardStore.getState().blockToast;
        if (!last || last.height !== s.live.blockHeight) {
          useDashboardStore.setState({
            blockToast: {
              id: `${chain.id}-${s.live.blockHeight}-${Date.now()}`,
              height: s.live.blockHeight,
              foundAt: Date.now(),
            },
          });
        }
      }
    };
    const unsub = useAltChainStore.subscribe((s, prev) => sync(s, prev));
    sync(useAltChainStore.getState());
    return () => {
      unsub();
      clearInterval(tickDash);
      stopAlt();
    };
  }, [chain, suiteHome, startBtc, startAlt, resetLive, patchLive]);

  // Theme accent from active chain
  useEffect(() => {
    if (!chain) {
      document.documentElement.style.removeProperty("--accent");
      document.documentElement.style.removeProperty("--accent-dim");
      return;
    }
    document.documentElement.style.setProperty("--accent", chain.accent);
    document.documentElement.style.setProperty("--accent-dim", chain.accentDim);
    return () => {
      document.documentElement.style.removeProperty("--accent");
      document.documentElement.style.removeProperty("--accent-dim");
    };
  }, [chain]);

  const base = chain ? `/${chain.slug}` : "";
  const focusMainContent = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const main = document.getElementById("main-content");
    main?.focus();
    main?.scrollIntoView({ block: "start" });
  };

  return (
    <div className="relative z-[1] flex min-h-full flex-col">
      <a
        href="#main-content"
        onClick={focusMainContent}
        className="sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[300] focus-visible:rounded-md focus-visible:bg-accent focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:font-bold focus-visible:text-ink"
      >
        Skip to main content
      </a>
      <div className="sticky top-0 z-40 border-b border-line/80 bg-ink/80 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Hint tip="nav.suite">
              <Link href="/" className="font-bold tracking-tight text-paper">
                Chain<span className="text-accent">Dials</span>
              </Link>
            </Hint>
            {chain && (
              <>
                <Hint tip="nav.board">
                  <Link
                    href={`/${chain.slug}`}
                    className="min-h-11 inline-flex items-center text-paper-muted transition hover:text-paper"
                  >
                    Board
                  </Link>
                </Hint>
                <Hint tip="nav.alerts">
                  <Link
                    href={`/${chain.slug}/alerts`}
                    className="min-h-11 inline-flex items-center text-paper-muted transition hover:text-paper"
                  >
                    Alerts
                    {!isProEnabled() ? (
                      <span className="ml-1 text-[10px] uppercase tracking-wider opacity-60">
                        Pro
                      </span>
                    ) : null}
                  </Link>
                </Hint>
                <Hint tip="nav.wall">
                  <Link
                    href={`/${chain.slug}/wall`}
                    className="min-h-11 inline-flex items-center text-paper-muted transition hover:text-paper"
                  >
                    Wall
                  </Link>
                </Hint>
                {chain.id === "btc" ? (
                  <Hint tip="nav.forensics">
                    <Link
                      href="/btc/forensics"
                      className="min-h-11 inline-flex items-center text-paper-muted transition hover:text-paper"
                    >
                      Trace
                    </Link>
                  </Hint>
                ) : null}
                <Hint tip="nav.pro">
                  <Link
                    href={`/${chain.slug}/pro`}
                    className="min-h-11 inline-flex items-center text-paper-muted transition hover:text-paper"
                  >
                    Pro
                    {!isProEnabled() ? (
                      <span className="ml-1 text-[10px] uppercase tracking-wider opacity-60">
                        $6
                      </span>
                    ) : null}
                  </Link>
                </Hint>
                <Hint tip="nav.account">
                  <Link
                    href="/account"
                    className="min-h-11 inline-flex items-center text-paper-muted transition hover:text-paper"
                  >
                    Account
                  </Link>
                </Hint>
              </>
            )}
            {!chain && (
              <Link
                href={`/${preferredChain}`}
                className="min-h-11 inline-flex items-center text-paper-muted transition hover:text-paper"
              >
                Open {CHAINS[preferredChain]?.shortName ?? "Bitcoin"}
              </Link>
            )}
            <Hint tip="nav.settings">
              <Link
                href="/settings"
                className="min-h-11 inline-flex items-center text-paper-muted transition hover:text-paper"
              >
                Settings
              </Link>
            </Hint>
          </nav>
          <div className="flex flex-wrap items-center gap-3">
            {!suiteHome && <ChainSwitcher />}
            <ConnectionStatus />
          </div>
        </div>
      </div>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-10"
      >
        {children}
      </main>

      <footer className="border-t border-line/80 bg-ink-elevated/80 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-paper-muted md:flex-row md:items-center md:justify-between md:px-6">
          <p>
            {chain ? (
              <>
                {chain.name}
                {" · "}
                {freshnessLabel(chain)}
                {chain.id !== "btc" && altSource ? ` · ${altSource}` : ""}
                {" · "}
                updated {formatRelativeAge(freshest)}
              </>
            ) : (
              <>{SUITE.tagline}</>
            )}
          </p>
          <p>
            Free boards forever ·{" "}
            <Link href="/settings" className="hover:text-accent">
              Settings
            </Link>
            {" · "}
            <Link href={base ? `${base}/pro` : "/btc/pro"} className="hover:text-accent">
              What’s Pro?
            </Link>
            {" · "}
            <Link href="/privacy" className="hover:text-accent">
              Privacy
            </Link>
            {" · "}
            <Link href="/terms" className="hover:text-accent">
              Terms
            </Link>
          </p>
        </div>
      </footer>

      <InstrumentStage />
    </div>
  );
}
