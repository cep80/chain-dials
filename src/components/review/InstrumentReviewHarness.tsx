"use client";

/**
 * Instrument review harness: the page the owner and agents judge the dials on.
 * Development geometry and fixture data. Nothing here is approved art, and
 * nothing here writes to a feed. See docs/instruments/graphics-playbook.md §2.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InstrumentStage } from "@/components/viz/InstrumentStage";
import { Observatory } from "@/components/viz/Observatory";
import { ChainProvider } from "@/lib/chains/context";
import { CHAIN_ORDER, CHAINS } from "@/lib/chains/registry";
import type { ChainId } from "@/lib/chains/types";
import type { QualityTier } from "@/lib/dial-light";
import { FrameMetrics, startFrameSampler, type FrameSummary } from "@/lib/frame-metrics";
import { useInstrumentStage } from "@/lib/instrument-stage";
import { INSTRUMENT_ORDER, type InstrumentId } from "@/lib/instruments";
import { inventoryElement, type ResourceInventory } from "@/lib/resource-inventory";
import { REVIEW_SCENARIOS, reviewFixture, type ReviewScenario } from "@/lib/review/fixtures";
import { applySettingsToDocument, useSettingsStore } from "@/lib/settings/store";
import { useDashboardStore } from "@/lib/store";

type View = "board" | "wall" | "stage";
type Light = "accent" | "neutral";
type Motion = "live" | "still";
type Chrome = "on" | "off";
type Tier = "auto" | QualityTier;

const VIEWS: Array<{ id: View; label: string; viewport: string }> = [
  { id: "board", label: "Board", viewport: "1440×900 and 390×844" },
  { id: "wall", label: "Wall", viewport: "1920×1080" },
  { id: "stage", label: "Stage", viewport: "1920×1080 and 390×844" },
];

export interface ReviewRun {
  chain: ChainId;
  view: View;
  light: Light;
  scenario: ReviewScenario;
  frames: FrameSummary;
  inventory: ResourceInventory;
  readings: string[];
}

export interface ReviewReport {
  capturedAt: string;
  userAgent: string;
  viewport: { width: number; height: number; dpr: number };
  tier: Tier;
  motion: Motion;
  method: string;
  runs: ReviewRun[];
  /** Readings that differ between accent and neutral light. Must stay empty. */
  readingDrift: Array<{ chain: ChainId; view: View; scenario: ReviewScenario; accent: string[]; neutral: string[] }>;
}

const METHOD =
  "Fixture readings, not live feeds. Frame times are requestAnimationFrame deltas over a short dwell per view, not GPU timings. Canvas bytes are an RGBA estimate.";

function readingsIn(root: Element): string[] {
  return Array.from(root.querySelectorAll(".instrument-frame-reading")).map((el) => el.textContent?.trim() ?? "");
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

export function InstrumentReviewHarness() {
  const [chain, setChain] = useState<ChainId>("btc");
  const [view, setView] = useState<View>("board");
  const [scenario, setScenario] = useState<ReviewScenario>("nominal");
  const [light, setLight] = useState<Light>("accent");
  const [motion, setMotion] = useState<Motion>("still");
  const [chrome, setChrome] = useState<Chrome>("on");
  const [tier, setTier] = useState<Tier>("auto");
  const [seed, setSeed] = useState(0);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<ReviewReport | null>(null);
  const [recovery, setRecovery] = useState<"idle" | "lost" | "restored" | "unavailable">("idle");
  const targetRef = useRef<HTMLDivElement>(null);
  const openStage = useInstrumentStage((s) => s.open);
  const closeStage = useInstrumentStage((s) => s.close);
  const stageActive = useInstrumentStage((s) => s.active);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);

  // Still motion also freezes the clock, the way a fixed camera freezes a view:
  // cadence readings then hold a known age (4:10, not 4:11 a second later), so
  // captures and the reading-drift check compare like with like. Dev page only.
  useEffect(() => {
    if (motion !== "still") return;
    const original = Date.now;
    const frozen = original();
    Date.now = () => frozen;
    return () => { Date.now = original; };
  }, [motion, seed]);

  // Seed the dashboard store with fixture readings. Presentation reads; nothing writes back.
  useEffect(() => {
    const now = Date.now();
    const fixture = reviewFixture(chain, scenario, now);
    useDashboardStore.setState({ hydrated: true, live: fixture.live, connection: fixture.connection, now, boardPulse: 0, blockToast: null });
  }, [chain, scenario, seed, motion]);

  // Cadence dials read store.now; keep it moving only in live motion.
  useEffect(() => {
    if (motion !== "live") return;
    const timer = window.setInterval(() => useDashboardStore.getState().tick(), 1000);
    return () => window.clearInterval(timer);
  }, [motion]);

  // Light: the chain accent or a neutral grey that hides nothing.
  useEffect(() => {
    const root = document.documentElement;
    if (light === "neutral") {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-dim");
      root.dataset.reviewLight = "neutral";
    } else {
      delete root.dataset.reviewLight;
      root.style.setProperty("--accent", CHAINS[chain].accent);
      root.style.setProperty("--accent-dim", CHAINS[chain].accentDim);
    }
    return () => {
      delete root.dataset.reviewLight;
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-dim");
    };
  }, [chain, light]);

  useEffect(() => {
    const root = document.documentElement;
    if (chrome === "off") root.dataset.reviewChrome = "off";
    else delete root.dataset.reviewChrome;
    return () => { delete root.dataset.reviewChrome; };
  }, [chrome]);

  useEffect(() => {
    const root = document.documentElement;
    if (tier === "auto") delete root.dataset.qualityTier;
    else root.dataset.qualityTier = tier;
    return () => { delete root.dataset.qualityTier; };
  }, [tier]);

  // Motion through the settings store, without persisting review state.
  // Re-applied after the store hydrates from storage, which would otherwise win.
  useEffect(() => {
    const previous = useSettingsStore.getState().motion;
    const next = motion === "still" ? "reduce" : "full";
    useSettingsStore.setState({ motion: next, newbieTooltips: false });
    applySettingsToDocument({ ...useSettingsStore.getState(), motion: next });
    return () => {
      useSettingsStore.setState({ motion: previous });
      applySettingsToDocument({ ...useSettingsStore.getState(), motion: previous });
    };
  }, [motion, settingsHydrated]);

  useEffect(() => {
    if (view !== "stage" && stageActive) closeStage();
  }, [view, stageActive, closeStage]);

  const measure = useCallback(async (dwellMs: number): Promise<{ frames: FrameSummary; inventory: ResourceInventory; readings: string[] }> => {
    const metrics = new FrameMetrics(600);
    const stop = startFrameSampler(metrics);
    await wait(dwellMs);
    stop();
    const root = targetRef.current ?? document.body;
    return { frames: metrics.summary(), inventory: inventoryElement(root), readings: readingsIn(root) };
  }, []);

  const runReview = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setReport(null);
    const runs: ReviewRun[] = [];
    const startChain = chain, startView = view, startLight = light, startScenario = scenario;
    try {
      for (const c of CHAIN_ORDER) {
        setChain(c);
        for (const s of ["nominal", "late", "empty"] as ReviewScenario[]) {
          setScenario(s);
          for (const v of ["board", "wall"] as View[]) {
            setView(v);
            for (const l of ["accent", "neutral"] as Light[]) {
              setLight(l);
              await wait(250);
              const sample = await measure(s === "nominal" ? 900 : 400);
              runs.push({ chain: c, view: v, light: l, scenario: s, ...sample });
            }
          }
        }
      }
    } finally {
      setChain(startChain); setView(startView); setLight(startLight); setScenario(startScenario);
      setRunning(false);
    }
    const drift: ReviewReport["readingDrift"] = [];
    for (const run of runs) {
      if (run.light !== "accent") continue;
      const twin = runs.find((r) => r.chain === run.chain && r.view === run.view && r.scenario === run.scenario && r.light === "neutral");
      if (twin && twin.readings.join("|") !== run.readings.join("|")) {
        drift.push({ chain: run.chain, view: run.view, scenario: run.scenario, accent: run.readings, neutral: twin.readings });
      }
    }
    setReport({
      capturedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
      tier, motion, method: METHOD, runs, readingDrift: drift,
    });
  }, [chain, light, measure, motion, running, scenario, tier, view]);

  const testRecovery = useCallback(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("canvas[data-atmosphere-fog]");
    const ext = canvas?.getContext("webgl")?.getExtension("WEBGL_lose_context");
    if (!canvas || !ext) { setRecovery("unavailable"); return; }
    setRecovery("lost");
    ext.loseContext();
    window.setTimeout(() => { ext.restoreContext(); setRecovery("restored"); }, 700);
  }, []);

  const download = useCallback(() => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `instrument-review-${report.capturedAt.replace(/[:.]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  const scenarioNote = useMemo(() => REVIEW_SCENARIOS.find((s) => s.id === scenario)?.note ?? "", [scenario]);
  const viewNote = useMemo(() => VIEWS.find((v) => v.id === view)?.viewport ?? "", [view]);

  const toggle = <T extends string>(legend: string, value: T, options: Array<{ id: T; label: string }>, set: (v: T) => void) => (
    <fieldset>
      <legend>{legend}</legend>
      {options.map((option) => (
        <button key={option.id} type="button" aria-pressed={value === option.id} disabled={running} onClick={() => set(option.id)}>
          {option.label}
        </button>
      ))}
    </fieldset>
  );

  return (
    <div className="review-harness" data-review-running={running ? "true" : "false"}>
      <p className="border-b border-warn/40 bg-warn/10 px-3 py-1 text-center text-[10px] uppercase tracking-[0.18em] text-warn" role="note">
        Development review page · fixture data, not live feeds · not approved art
      </p>
      <div className="review-controls" role="toolbar" aria-label="Review controls">
        {toggle("Chain", chain, CHAIN_ORDER.map((id) => ({ id, label: CHAINS[id].shortName })), setChain)}
        {toggle("View", view, VIEWS.map((v) => ({ id: v.id, label: v.label })), setView)}
        {toggle("Scenario", scenario, REVIEW_SCENARIOS.map((s) => ({ id: s.id, label: s.label })), setScenario)}
        {toggle("Light", light, [{ id: "accent" as Light, label: "Accent" }, { id: "neutral" as Light, label: "Neutral" }], setLight)}
        {toggle("Motion", motion, [{ id: "still" as Motion, label: "Still" }, { id: "live" as Motion, label: "Live" }], setMotion)}
        {toggle("Chrome", chrome, [{ id: "on" as Chrome, label: "Frames" }, { id: "off" as Chrome, label: "Bare art" }], setChrome)}
        {toggle("Tier", tier, [{ id: "auto" as Tier, label: "Auto" }, { id: "desktop" as Tier, label: "Desktop" }, { id: "mobile" as Tier, label: "Mobile" }], setTier)}
        <fieldset>
          <legend>Actions</legend>
          <button type="button" disabled={running} onClick={() => setSeed((n) => n + 1)}>Reseed</button>
          <button type="button" disabled={running} onClick={() => void runReview()}>{running ? "Running…" : "Run review"}</button>
          <button type="button" disabled={!report} onClick={download}>Download JSON</button>
          <button type="button" disabled={running || chain !== "btc" || motion !== "live"} onClick={testRecovery} title="Needs BTC and live motion: the atmosphere fog is WebGL">
            Test graphics recovery
          </button>
          <span data-review-recovery={recovery}>{recovery === "idle" ? "" : `GL ${recovery}`}</span>
        </fieldset>
        <span className="ml-auto" data-review-note>{scenarioNote} Intended viewports: {viewNote}. Breakpoints follow the browser window.</span>
      </div>

      <ChainProvider chainId={chain}>
        <div ref={targetRef} id="review-target" className="review-target" data-chain={chain} data-view={view} data-scenario={scenario} data-light={light}>
          {view === "wall" ? (
            <section className="wall-theater" aria-label="Wall review">
              <p className="wall-theater-title mb-6">{CHAINS[chain].shortName} Dials</p>
              <Observatory large wall />
            </section>
          ) : view === "stage" ? (
            <div className="mx-auto max-w-7xl">
              <p className="mb-3 text-xs text-paper-muted">Open an instrument on the stage. Arrow keys switch, Escape closes.</p>
              <div className="flex flex-wrap gap-2">
                {INSTRUMENT_ORDER.map((id: InstrumentId, i) => (
                  <button key={id} type="button" className="rounded-md border border-line px-3 py-2 text-xs text-paper-muted hover:border-accent hover:text-paper" onClick={() => openStage(id)}>
                    {String(i + 1).padStart(2, "0")} · {CHAINS[chain].instruments[id].title}
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <Observatory />
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-7xl">
              <Observatory />
            </div>
          )}
        </div>
        <InstrumentStage />
      </ChainProvider>

      {report && (
        <pre className="review-report" data-review-report>{JSON.stringify(report, null, 2)}</pre>
      )}
    </div>
  );
}
