"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { LocalReturnNudge } from "@/components/monetization/LocalReturnNudge";
import { ProGate } from "@/components/monetization/ProGate";
import { useChain } from "@/lib/chains/context";
import { useProAccess } from "@/hooks/useProAccess";
import { useDashboardStore } from "@/lib/store";

type AlertKind = "fee_hot" | "tip_quiet" | "mempool_stuffed" | "price_move";

type Rule = {
  id?: string;
  chainId: string;
  kind: AlertKind;
  enabled: boolean;
  params: Record<string, number | string | boolean>;
};

const KIND_META: Record<
  AlertKind,
  { label: string; hint: string; defaultParams: Record<string, number> }
> = {
  fee_hot: {
    label: "Fee hottest above threshold",
    hint: "Fires when the hottest fee sample clears your number.",
    defaultParams: { threshold: 50 },
  },
  tip_quiet: {
    label: "Quiet tip",
    hint: "Fires when no new tip lands for longer than N seconds.",
    defaultParams: { seconds: 1200 },
  },
  mempool_stuffed: {
    label: "Waiting room stuffed",
    hint: "Fires when pending count exceeds your threshold.",
    defaultParams: { count: 40000 },
  },
  price_move: {
    label: "Price move",
    hint: "Browser nudge when |change| vs session open exceeds % (local).",
    defaultParams: { pct: 5 },
  },
};

function defaultRules(chainId: string): Rule[] {
  return (Object.keys(KIND_META) as AlertKind[]).map((kind) => ({
    chainId,
    kind,
    enabled: kind === "fee_hot" || kind === "tip_quiet",
    params: { ...KIND_META[kind].defaultParams },
  }));
}

export default function AlertsPage() {
  const chain = useChain();
  const { pro, signedIn, loading } = useProAccess();
  const live = useDashboardStore((s) => s.live);
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
      setRules(
        data.rules.map((r) => ({
          ...r,
          chainId: r.chainId,
          params: r.params ?? {},
        })),
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

    const feeRule = rules.find((r) => r.kind === "fee_hot" && r.enabled);
    if (feeRule && live.feeFastest != null) {
      const thr = Number(feeRule.params.threshold ?? 50);
      if (live.feeFastest >= thr && cool(`fee-${chain.id}`)) {
        new Notification(`${chain.shortName} fees hot`, {
          body: `Hottest ~${Math.round(live.feeFastest)} ${chain.feeUnit} (threshold ${thr}).`,
          tag: `fee-${chain.id}`,
        });
      }
    }

    const quiet = rules.find((r) => r.kind === "tip_quiet" && r.enabled);
    if (quiet && live.tipTimestamp != null) {
      const secs = Number(quiet.params.seconds ?? 1200);
      const since = (now - live.tipTimestamp) / 1000;
      if (since > secs && cool(`quiet-${chain.id}`)) {
        new Notification(`${chain.shortName} tip quiet`, {
          body: `No new ${chain.tipNoun} for ~${Math.round(since)}s.`,
          tag: `quiet-${chain.id}`,
        });
      }
    }

    const stuffed = rules.find((r) => r.kind === "mempool_stuffed" && r.enabled);
    if (stuffed && live.mempoolCount != null) {
      const thr = Number(stuffed.params.count ?? 40000);
      if (live.mempoolCount >= thr && cool(`mempool-${chain.id}`)) {
        new Notification(`${chain.shortName} waiting room stuffed`, {
          body: `${live.mempoolCount.toLocaleString()} pending (threshold ${thr.toLocaleString()}).`,
          tag: `mempool-${chain.id}`,
        });
      }
    }

    const move = rules.find((r) => r.kind === "price_move" && r.enabled);
    if (move && openPrice != null && live.priceUsd != null) {
      const pct = Number(move.params.pct ?? 5);
      const change = ((live.priceUsd - openPrice) / openPrice) * 100;
      if (Math.abs(change) >= pct && cool(`price-${chain.id}`)) {
        new Notification(`${chain.shortName} price move`, {
          body: `${change >= 0 ? "+" : ""}${change.toFixed(2)}% vs this session open.`,
          tag: `price-${chain.id}`,
        });
      }
    }
  }, [
    pro,
    perm,
    rules,
    live.feeFastest,
    live.tipTimestamp,
    live.mempoolCount,
    live.priceUsd,
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
        if (data.rules) setRules(data.rules);
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
          Rules sync to your account. Nudges fire in this browser when permission
          is granted.
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
        const meta = KIND_META[rule.kind];
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
              </label>
              <p className="mt-1 text-xs text-paper-muted">{meta.hint}</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-paper-muted">
              {paramKey}
              <input
                type="number"
                className="mono w-24 rounded-[8px] border border-line bg-ink px-2 py-1 text-paper"
                value={Number(rule.params[paramKey] ?? meta.defaultParams[paramKey])}
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
        {message ? <span className="text-xs text-paper-muted">{message}</span> : null}
      </div>
    </div>
  );

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-paper">Alerts</h1>
        <p className="mt-2 text-paper-muted">
          {pro
            ? `Live rules for ${chain.name}. Saved to your account; nudged in this browser.`
            : `Pro unlocks configurable rules for ${chain.name}. Free local fee/tip nudge still works below.`}
        </p>
      </div>

      {loading ? (
        <p className="text-paper-muted">Checking Pro…</p>
      ) : pro ? (
        editor
      ) : (
        <ProGate
          title="Fee & tip alerts"
          detail={
            signedIn
              ? "Upgrade to Pro to configure and sync alert rules."
              : "Sign in and upgrade to Pro to configure synced alert rules."
          }
          ctaLabel={signedIn ? "Upgrade to Pro" : "Sign in"}
          ctaHref={signedIn ? "/account" : "/account/signin?callbackUrl=/btc/alerts"}
        >
          {editor}
        </ProGate>
      )}

      {!pro ? (
        <p className="mt-4 text-sm text-paper-muted">
          Or{" "}
          <Link href="/btc/pro" className="text-accent hover:underline">
            see what Pro includes
          </Link>
          .
        </p>
      ) : null}

      <LocalReturnNudge />
    </AppShell>
  );
}
