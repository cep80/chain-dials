"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { LocalReturnNudge } from "@/components/monetization/LocalReturnNudge";
import { ProGate } from "@/components/monetization/ProGate";
import { useChain } from "@/lib/chains/context";
import { useProAccess } from "@/hooks/useProAccess";
import {
  ALERT_KIND_META,
  alertKindsForChain,
  type AlertKind,
} from "@/lib/alerts/kinds";
import { advanceAlert, alertRuleError, cooldownMinutes, emptyAlertRuntime, parseAlertRuntime, type AlertDelivery } from "@/lib/alerts/runtime";
import { evaluateAlertRule } from "@/lib/alerts/evaluate";
import {
  evaluateHypeRegime,
  regimeLiveFromBoard,
} from "@/lib/regime/evaluate";
import { isRegimeId } from "@/lib/regime/types";
import { normalizeHashrate } from "@/lib/viz-scale";
import { useDashboardStore } from "@/lib/store";

type Rule = {
  id?: string;
  chainId: string;
  kind: AlertKind;
  enabled: boolean;
  params: Record<string, number | string | boolean>;
};

function defaultRules(chainId: string): Rule[] {
  return alertKindsForChain(chainId).map((kind) => ({
    chainId,
    kind,
    enabled:
      kind === "fee_hot" ||
      kind === "tip_quiet" ||
      kind === "metronome_late" ||
      kind === "regime_flip",
    params: { ...ALERT_KIND_META[kind].defaultParams },
  }));
}

export default function AlertsPage() {
  const chain = useChain();
  return <AlertsContent key={chain.id} />;
}

function AlertsContent() {
  const chain = useChain();
  const { pro, signedIn, loading, user } = useProAccess();
  const live = useDashboardStore((s) => s.live);
  const histories = useDashboardStore((s) => s.histories);
  const now = useDashboardStore((s) => s.now);
  const [rules, setRules] = useState<Rule[]>(() => defaultRules(chain.id));
  const connection = useDashboardStore((s) => s.connection);
  const [rulesReady, setRulesReady] = useState(false);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [history, setHistory] = useState<AlertDelivery[]>([]);
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const runtime = useRef(emptyAlertRuntime());
  const runtimeKey = `chain-dials:alert-history:${user?.id ?? "local"}:${chain.id}:v1`;
  const loadedRuntimeKey = useRef<string | null>(null);
  useEffect(() => {
    loadedRuntimeKey.current = null;
    const timer = setTimeout(() => {
      try { runtime.current = parseAlertRuntime(JSON.parse(localStorage.getItem(runtimeKey) ?? "null")); } catch { runtime.current = emptyAlertRuntime(); }
      loadedRuntimeKey.current = runtimeKey;
      setHistory(runtime.current.history);
      setHistoryKey(runtimeKey);
      setRuntimeReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [runtimeKey]);
  useEffect(() => {
    const syncOtherTab = (event: StorageEvent) => {
      if (event.key !== runtimeKey || !event.newValue) return;
      try {
        const remote = parseAlertRuntime(JSON.parse(event.newValue) as unknown);
        runtime.current = remote;
        loadedRuntimeKey.current = runtimeKey;
        setHistory(remote.history);
        setHistoryKey(runtimeKey);
      } catch { /* A malformed remote value does not replace valid local history. */ }
    };
    window.addEventListener("storage", syncOtherTab);
    return () => window.removeEventListener("storage", syncOtherTab);
  }, [runtimeKey]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("unsupported");
  useEffect(() => {
    const timer = setTimeout(() => setPerm("Notification" in window ? Notification.permission : "unsupported"), 0);
    return () => clearTimeout(timer);
  }, []);
  const [openPrice, setOpenPrice] = useState<number | null>(null);

  if (live.priceUsd != null && openPrice == null) {
    setOpenPrice(live.priceUsd);
  }

  const loadedRulesKey = useRef<string | null>(null);
  const [rulesLoadedKey, setRulesLoadedKey] = useState<string | null>(null);
  const rulesKey = `${user?.id ?? "local"}:${chain.id}`;
  const load = useCallback(async (signal: AbortSignal) => {
    if (!pro) return;
    if (!signedIn) { loadedRulesKey.current = rulesKey; setRulesLoadedKey(rulesKey); setRulesReady(true); return; }
    try {
    const res = await fetch(`/api/pro/alerts?chainId=${chain.id}`, {
      cache: "no-store",
      signal,
    });
    if (!res.ok) throw new Error("Could not load saved rules. Reload this page to retry.");
    const data = (await res.json()) as { rules: Rule[] };
    if (signal.aborted) return;
    if (data.rules.length === 0) {
      setRules(defaultRules(chain.id));
    } else {
      // Merge known kinds so new instrument alerts appear after upgrades
      const byKind = new Map(data.rules.map((r) => [r.kind, r]));
      setRules(
        alertKindsForChain(chain.id).map((kind) => {
          const existing = byKind.get(kind);
          if (existing) {
            return {
              ...existing,
              chainId: chain.id,
              params: {
                ...ALERT_KIND_META[kind].defaultParams,
                ...(existing.params ?? {}),
              },
            };
          }
          return {
            chainId: chain.id,
            kind,
            enabled: false,
            params: { ...ALERT_KIND_META[kind].defaultParams },
          };
        }),
      );
    }
    loadedRulesKey.current = rulesKey;
    setRulesLoadedKey(rulesKey);
    setRulesReady(true);
    } catch (error) { if (!signal.aborted) setMessage(error instanceof Error ? error.message : "Could not load saved rules."); }
  }, [pro, signedIn, chain.id, rulesKey]);

  useEffect(() => {
    loadedRulesKey.current = null;
    const controller = new AbortController();
    const t = window.setTimeout(() => {
      void load(controller.signal);
    }, 0);
    return () => { controller.abort(); window.clearTimeout(t); };
  }, [load]);

  const lastHypeRegime = useRef<string | null>(null);

  useEffect(() => {
    if (!pro || !rulesReady || !runtimeReady || loadedRulesKey.current !== rulesKey || loadedRuntimeKey.current !== runtimeKey) return;
    const fresh = connection === "connected" && live.lastRestAt != null && now - live.lastRestAt < 120_000;
    const nextPreviews: Record<string, string> = {};
    let nextRuntime = runtime.current;

    const forgeIntensity =
      chain.id === "btc"
        ? normalizeHashrate(live.hashrate, histories.hashrate ?? [])
        : live.securityScore;

    const hypeLive =
      chain.id === "hype" ? regimeLiveFromBoard(live, now) : null;
    const hypeReady = (hypeLive?.fundingBps.length ?? 0) > 0;
    const hypeReading =
      hypeLive && hypeReady
        ? evaluateHypeRegime(
            hypeLive,
            {},
            lastHypeRegime.current && isRegimeId(lastHypeRegime.current)
              ? lastHypeRegime.current
              : null,
          )
        : null;

    const snap = {
      feeFastest: live.feeFastest,
      tipTimestamp: live.tipTimestamp,
      mempoolCount: live.mempoolCount,
      mempoolPressure: live.mempoolPressure,
      priceUsd: live.priceUsd,
      securityScore: live.securityScore,
      forgeIntensity,
      previousRegime: lastHypeRegime.current,
      regime: hypeReading?.regime ?? null,
      regimeConfidence: hypeReading?.confidence ?? null,
      regimeReasons: hypeReading?.reasons ?? [],
      regimeStance: hypeReading?.stance ?? null,
    };
    const ctx = {
      nowMs: now,
      targetBlockSeconds: chain.targetBlockSeconds,
      feeUnit: chain.feeUnit,
      tipNoun: chain.tipNoun,
      shortName: chain.shortName,
      sessionOpenPrice: openPrice,
    };

    for (const rule of rules) {
      const invalid = alertRuleError(rule.kind, rule.params);
      const fire = !invalid && fresh ? evaluateAlertRule(rule.kind, rule.params, snap, ctx, chain.id) : null;
      nextPreviews[rule.kind] = invalid ?? (!fresh ? "Waiting for a fresh reading." : fire ? `Would trigger now: ${fire.body}` : "Not triggered by the current reading.");
      if (!fresh) continue;
      const transition = advanceAlert(nextRuntime, rule.kind, rule.enabled && !!fire, now, cooldownMinutes(rule.kind, rule.params) * 60_000);
      nextRuntime = transition.state;
      if (!transition.fire || !fire) continue;
      let delivery: AlertDelivery["delivery"] = "in-app";
      if (perm === "granted") {
        try {
          new Notification(fire.title, { body: fire.body, tag: fire.tag });
          delivery = "notified";
        } catch { delivery = "failed"; }
      }
      nextRuntime = { ...nextRuntime, history: [{ ...fire, at: now, delivery }, ...nextRuntime.history].slice(0, 100) };
    }
    const persist = nextRuntime !== runtime.current;
    runtime.current = nextRuntime;
    let storageFailed = false;
    if (persist) {
      try { localStorage.setItem(runtimeKey, JSON.stringify(nextRuntime)); } catch { storageFailed = true; }
    }
    const timer = window.setTimeout(() => {
      setPreviews((previous) => JSON.stringify(previous) === JSON.stringify(nextPreviews) ? previous : nextPreviews);
      setHistory(runtime.current.history);
      if (storageFailed) setMessage("Alert history is available for this visit; device storage is unavailable.");
    }, 0);
    if (hypeReading && fresh) lastHypeRegime.current = hypeReading.regime;
    return () => window.clearTimeout(timer);
  }, [
    pro,
    rulesReady,
    rulesKey,
    runtimeReady,
    runtimeKey,
    connection,
    perm,
    rules,
    live,
    histories.hashrate,
    now,
    chain,
    openPrice,
  ]);

  const save = async () => {
    if (rules.some((rule) => alertRuleError(rule.kind, rule.params))) { setMessage("Correct the highlighted rule values before saving."); return; }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/pro/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: rules.map((r) => ({ ...r, chainId: chain.id })),
        }),
      });
      const data = (await res.json()) as { error?: string; rules?: Rule[] };
      if (!res.ok) {
        setMessage(data.error ?? "Save failed");
      } else {
        setMessage("Saved to your account.");
        if (data.rules) {
          const byKind = new Map(data.rules.map((r) => [r.kind, r]));
          setRules(
            alertKindsForChain(chain.id).map((kind) => {
              const existing = byKind.get(kind);
              if (existing) {
                return {
                  ...existing,
                  chainId: chain.id,
                  params: {
                    ...ALERT_KIND_META[kind].defaultParams,
                    ...(existing.params ?? {}),
                  },
                };
              }
              return {
                chainId: chain.id,
                kind,
                enabled: false,
                params: { ...ALERT_KIND_META[kind].defaultParams },
              };
            }),
          );
        }
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  };

  const enableNotes = async () => {
    if (!("Notification" in window)) return;
    try { const p = await Notification.requestPermission(); setPerm(p); } catch { setMessage("This browser could not enable notifications. Alerts remain in your history."); }
  };

  const editor = (
    <div className="space-y-3 rounded-[14px] border border-line bg-ink-elevated p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-paper-muted">
          Rules run while this page is open with fresh data. Changes apply here immediately; Save rules syncs them to your account. A condition must clear before it can trigger again.
        </p>
        {perm !== "granted" && perm !== "unsupported" ? (
          <button
            type="button"
            onClick={() => void enableNotes()}
            className="rounded-full border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent"
          >
            Allow notifications
          </button>
        ) : null}
      </div>
      {rules.map((rule) => {
        const meta = ALERT_KIND_META[rule.kind];
        const paramKey = Object.keys(meta.defaultParams)[0]!;
        return (
          <div
            key={rule.kind}
            className="flex flex-col gap-3 rounded-[10px] border border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <label className="flex items-center gap-2 text-sm text-paper">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => {
                    setRules((prev) =>
                      prev.map((r) =>
                        r.kind === rule.kind
                          ? { ...r, enabled: e.target.checked }
                          : r,
                      ),
                    );
                  }}
                />
                {meta.label}
                {meta.instrument ? (
                  <span className="rounded-full border border-accent/30 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-accent">
                    {meta.instrument}
                  </span>
                ) : null}
              </label>
              <p className="mt-1 text-xs text-paper-muted">{meta.hint}</p>
              <p className={`mt-2 text-xs ${alertRuleError(rule.kind, rule.params) ? "text-warn" : "text-paper-muted"}`}>{previews[rule.kind] ?? "Waiting for rule preview…"}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
            <label className="flex items-center gap-2 text-xs text-paper-muted">
              {paramKey}
              <input
                type="number"
                step="any"
                aria-label={`${meta.label} threshold`}
                aria-invalid={!!alertRuleError(rule.kind, rule.params)}
                className="mono w-24 rounded-[8px] border border-line bg-ink px-2 py-1 text-paper"
                value={Number(
                  rule.params[paramKey] ?? meta.defaultParams[paramKey],
                )}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setRules((prev) =>
                    prev.map((r) =>
                      r.kind === rule.kind
                        ? { ...r, params: { ...r.params, [paramKey]: v } }
                        : r,
                    ),
                  );
                }}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-paper-muted">Cooldown
              <select aria-label={`${meta.label} cooldown`} value={cooldownMinutes(rule.kind, rule.params)} onChange={(event) => setRules((previous) => previous.map((r) => r.kind === rule.kind ? { ...r, params: { ...r.params, cooldownMinutes: Number(event.target.value) } } : r))} className="min-h-11 rounded-lg border border-line bg-ink px-2 text-paper">
                {[1, 5, 15, 30, 60, 240, 1440].map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} min` : `${minutes / 60} hr`}</option>)}
              </select>
            </label>
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          disabled={saving || !rulesReady || rules.some((rule) => !!alertRuleError(rule.kind, rule.params))}
          onClick={() => void save()}
          className="btn-cta rounded-full px-4 py-2 text-sm disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save rules"}
        </button>
        {message ? (
          <span className="text-xs text-paper-muted">{message}</span>
        ) : null}
      </div>
    </div>
  );
  const visibleHistory = historyKey === runtimeKey ? history : [];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-paper">Alerts</h1>
        <p className="mt-2 text-paper-muted">
          {pro
            ? `Live rules for ${chain.name}, including instrument-state dials. Saved to your account.`
            : `Synced multi-rule + instrument alerts are a Pro extra for ${chain.name}. Free local fee/quiet-block nudge still runs below.`}
        </p>
      </div>

      {loading ? (
        <p className="text-paper-muted">Checking account…</p>
      ) : pro ? (
        rulesLoadedKey === rulesKey ? editor : <p className="text-paper-muted">Loading saved rules…</p>
      ) : (
        <ProGate
          title="Instrument + synced alerts"
          detail={
            signedIn
              ? "Pro: multi-rule alerts in dial language (metronome late, atmosphere pressure, forge heat, HYPE regime flips) plus classic fee and quiet-block rules."
              : "Sign in and optionally upgrade for instrument-state and synced alert rules. Boards stay free."
          }
          ctaLabel={signedIn ? "See Pro" : "Sign in"}
          ctaHref={
            signedIn
              ? `/${chain.slug}/pro#checkout`
              : `/account/signin?callbackUrl=/${chain.slug}/alerts`
          }
        >
          {editor}
        </ProGate>
      )}

      {!pro ? (
        <p className="mt-4 text-sm text-paper-muted">
          Or{" "}
          <Link
            href={`/${chain.slug}/pro`}
            className="text-accent hover:underline"
          >
            read what Pro actually is
          </Link>
          .
        </p>
      ) : null}

      {pro ? <section aria-labelledby="alert-history-heading" className="mt-6 rounded-[14px] border border-line bg-ink-elevated p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="alert-history-heading" className="text-xl font-bold text-paper">Trigger history</h2><button type="button" disabled={!visibleHistory.length} onClick={() => { runtime.current = { ...runtime.current, history: [] }; setHistory([]); try { localStorage.setItem(runtimeKey, JSON.stringify(runtime.current)); } catch { setMessage("Could not clear stored history."); } }} className="min-h-11 px-3 text-sm text-paper-muted disabled:opacity-40">Clear history</button></div>
        <p className="mt-1 text-xs text-paper-muted">Last 100 triggers on this device. Cooldowns survive reloads. Clearing history keeps repeat protection.</p>
        {visibleHistory.length ? <ol className="mt-4 divide-y divide-line">{visibleHistory.map((entry, index) => <li key={`${entry.tag}-${entry.at}-${index}`} className="py-3"><p className="text-sm font-semibold text-paper">{entry.title}</p><p className="mt-1 text-xs text-paper-muted">{entry.body}</p><p className="mt-1 text-xs text-paper-muted"><time dateTime={new Date(entry.at).toISOString()}>{new Date(entry.at).toLocaleString()}</time> · {entry.delivery === "notified" ? "Browser notification sent" : entry.delivery === "failed" ? "Browser notification unavailable; recorded here" : "Recorded in app"}</p></li>)}</ol> : <p className="mt-4 text-sm text-paper-muted">No triggers yet. Matching rules will appear here even without browser notifications.</p>}
      </section> : <LocalReturnNudge /> }
    </AppShell>
  );
}
