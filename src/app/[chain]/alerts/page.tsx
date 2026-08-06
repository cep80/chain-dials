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
  ALERT_KINDS,
  type AlertKind,
} from "@/lib/alerts/kinds";
import { evaluateAlertRule } from "@/lib/alerts/evaluate";
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
  return ALERT_KINDS.map((kind) => ({
    chainId,
    kind,
    enabled:
      kind === "fee_hot" ||
      kind === "tip_quiet" ||
      kind === "metronome_late",
    params: { ...ALERT_KIND_META[kind].defaultParams },
  }));
}

export default function AlertsPage() {
  const chain = useChain();
  const { pro, signedIn, loading } = useProAccess();
  const live = useDashboardStore((s) => s.live);
  const histories = useDashboardStore((s) => s.histories);
  const now = useDashboardStore((s) => s.now);
  const [rules, setRules] = useState<Rule[]>(() => defaultRules(chain.id));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    () => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return "unsupported";
      }
      return Notification.permission;
    },
  );
  const [openPrice, setOpenPrice] = useState<number | null>(null);

  useEffect(() => {
    if (live.priceUsd != null && openPrice == null) {
      setOpenPrice(live.priceUsd);
    }
  }, [live.priceUsd, openPrice]);

  const load = useCallback(async () => {
    if (!pro || !signedIn) return;
    const res = await fetch(`/api/pro/alerts?chainId=${chain.id}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { rules: Rule[] };
    if (data.rules.length === 0) {
      setRules(defaultRules(chain.id));
    } else {
      // Merge known kinds so new instrument alerts appear after upgrades
      const byKind = new Map(data.rules.map((r) => [r.kind, r]));
      setRules(
        ALERT_KINDS.map((kind) => {
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
  }, [pro, signedIn, chain.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const lastFire = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!pro || perm !== "granted") return;
    const cool = (key: string, ms = 30 * 60_000) => {
      const prev = lastFire.current[key] ?? 0;
      if (Date.now() - prev < ms) return false;
      lastFire.current[key] = Date.now();
      return true;
    };

    const forgeIntensity =
      chain.id === "btc"
        ? normalizeHashrate(live.hashrate, histories.hashrate ?? [])
        : live.securityScore;

    const snap = {
      feeFastest: live.feeFastest,
      tipTimestamp: live.tipTimestamp,
      mempoolCount: live.mempoolCount,
      mempoolPressure: live.mempoolPressure,
      priceUsd: live.priceUsd,
      securityScore: live.securityScore,
      forgeIntensity,
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
      if (!rule.enabled) continue;
      const fire = evaluateAlertRule(
        rule.kind,
        rule.params,
        snap,
        ctx,
        chain.id,
      );
      if (!fire) continue;
      if (!cool(fire.tag)) continue;
      new Notification(fire.title, {
        body: fire.body,
        tag: fire.tag,
      });
    }
  }, [
    pro,
    perm,
    rules,
    live.feeFastest,
    live.tipTimestamp,
    live.mempoolCount,
    live.mempoolPressure,
    live.priceUsd,
    live.hashrate,
    live.securityScore,
    histories.hashrate,
    now,
    chain,
    openPrice,
  ]);

  const save = async () => {
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
            ALERT_KINDS.map((kind) => {
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
    const p = await Notification.requestPermission();
    setPerm(p);
  };

  const editor = (
    <div className="space-y-3 rounded-[14px] border border-line bg-ink-elevated p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-paper-muted">
          Rules sync to your account. Instrument rules use the same language as
          the dials (metronome, atmosphere, forge).
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
            </div>
            <label className="flex items-center gap-2 text-xs text-paper-muted">
              {paramKey}
              <input
                type="number"
                step="any"
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
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save rules"}
        </button>
        {message ? (
          <span className="text-xs text-paper-muted">{message}</span>
        ) : null}
      </div>
    </div>
  );

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-paper">Alerts</h1>
        <p className="mt-2 text-paper-muted">
          {pro
            ? `Live rules for ${chain.name}, including instrument-state dials. Saved to your account.`
            : `Synced multi-rule + instrument alerts are a Pro extra for ${chain.name}. Free local fee/tip nudge still runs below.`}
        </p>
      </div>

      {loading ? (
        <p className="text-paper-muted">Checking account…</p>
      ) : pro ? (
        editor
      ) : (
        <ProGate
          title="Instrument + synced alerts"
          detail={
            signedIn
              ? "Pro: multi-rule alerts in dial language (metronome late, atmosphere pressure, forge heat) plus classic fee/tip rules."
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

      <LocalReturnNudge />
    </AppShell>
  );
}
