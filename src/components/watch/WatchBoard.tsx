"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useProAccess } from "@/hooks/useProAccess";
import { useIsNativeApp } from "@/hooks/useIsNativeApp";
import { sessionFetch } from "@/lib/session-fetch";
import { storePurchasesAvailable } from "@/lib/store-purchase";
import { shortId } from "@/lib/watch/transitions";
import type { WatchKind } from "@/lib/watch/transitions";

type Watch = {
  id: string;
  kind: WatchKind;
  target: string;
  label: string | null;
  params: { ths?: number };
  created_at: string;
  done_at: string | null;
};

type Target = { id: string; channel: string; last_ok_at: string | null };

type WatchEvent = {
  id: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  at: string;
};

const KINDS: { id: WatchKind; label: string; placeholder: string; hint: string }[] = [
  {
    id: "tx",
    label: "Transaction",
    placeholder: "Transaction id (64 characters)",
    hint: "Notifies on the first confirmation and at 3, or if it looks stuck after 6 hours.",
  },
  {
    id: "address",
    label: "Wallet",
    placeholder: "Bitcoin address (bc1…, 1…, 3…)",
    hint: "Notifies when the address receives or spends, as soon as it hits the mempool.",
  },
  {
    id: "solo",
    label: "Solo miner",
    placeholder: "Your miner's payout address",
    hint: "Notifies if a block pays this address, plus a daily odds summary when you give your hashrate.",
  },
];

const CHANNEL_LABEL: Record<string, string> = {
  push_ios: "This iPhone",
  push_android: "Android phone",
  telegram: "Telegram",
};

const card = "rounded-[14px] border border-line bg-ink-elevated p-5";
const input =
  "min-h-11 w-full rounded-[10px] border border-line bg-ink px-3 text-sm text-paper outline-none focus:border-accent";

export function WatchBoard({
  initialKind,
  initialTarget,
  initialThs,
}: {
  initialKind: WatchKind;
  initialTarget: string;
  initialThs: string;
}) {
  const { pro, signedIn, loading } = useProAccess();
  const native = useIsNativeApp();
  const [kind, setKind] = useState<WatchKind>(initialKind);
  const [target, setTarget] = useState(initialTarget);
  const [label, setLabel] = useState("");
  const [ths, setThs] = useState(initialThs);
  const [watches, setWatches] = useState<Watch[] | null>(null);
  const [limit, setLimit] = useState(1);
  const [targets, setTargets] = useState<Target[]>([]);
  const [available, setAvailable] = useState({ pushIos: false, pushAndroid: false, telegram: false });
  const [events, setEvents] = useState<WatchEvent[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [needsPro, setNeedsPro] = useState(false);

  const refresh = useCallback(async () => {
    const [w, t, e] = await Promise.all([
      sessionFetch("/api/watch", { cache: "no-store" }),
      sessionFetch("/api/notify/targets", { cache: "no-store" }),
      sessionFetch("/api/watch/events", { cache: "no-store" }),
    ]);
    if (w.ok) {
      const data = (await w.json()) as { watches: Watch[]; limit: number };
      setWatches(data.watches);
      setLimit(data.limit);
    }
    if (t.ok) {
      const data = (await t.json()) as { targets: Target[]; available: typeof available };
      setTargets(data.targets);
      setAvailable(data.available);
    }
    if (e.ok) setEvents(((await e.json()) as { events: WatchEvent[] }).events);
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    const t = window.setTimeout(() => void refresh().catch(() => setMessage("Couldn't load your watches.")), 0);
    return () => window.clearTimeout(t);
  }, [signedIn, refresh]);

  const enablePhone = async (quiet = false) => {
    const { enablePush } = await import("@/lib/native-push");
    const result = await enablePush();
    if (!quiet || result !== "granted") {
      setMessage(
        result === "granted"
          ? "Notifications are on for this phone."
          : "Notifications are off. Turn them on for Chain Dials in your phone's Settings.",
      );
    }
    window.setTimeout(() => void refresh(), 1500);
  };

  const add = async () => {
    setBusy("add");
    setMessage(null);
    setNeedsPro(false);
    try {
      const res = await sessionFetch("/api/watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          target,
          label: label.trim() || null,
          ths: kind === "solo" && Number(ths) > 0 ? Number(ths) : null,
        }),
      });
      const data = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Couldn't add that watch.");
        setNeedsPro(data.code === "pro_required");
        return;
      }
      setTarget("");
      setLabel("");
      setMessage("Watching. You'll hear about it wherever notifications go below.");
      if (native && !targets.some((t) => t.channel.startsWith("push_"))) await enablePhone(true);
      await refresh();
    } catch {
      setMessage("Network error");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    try {
      await sessionFetch(`/api/watch?id=${id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const unlink = async (id: string) => {
    setBusy(id);
    try {
      await sessionFetch(`/api/notify/targets?id=${id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const connectTelegram = async () => {
    setBusy("telegram");
    try {
      const res = await sessionFetch("/api/notify/telegram", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setMessage(data.error ?? "Telegram isn't available right now.");
        return;
      }
      window.open(data.url, "_blank", "noopener");
      setMessage("Tap Start in Telegram, then come back. It links within a few seconds.");
      window.setTimeout(() => void refresh(), 8000);
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    setBusy("test");
    try {
      const res = await sessionFetch("/api/notify/test", { method: "POST" });
      const data = (await res.json()) as { status?: string; error?: string };
      setMessage(
        data.status === "sent"
          ? "Test sent. Check your phone or Telegram."
          : data.status === "no_target"
            ? "Nothing linked yet. Turn on phone notifications or connect Telegram first."
            : (data.error ?? "The test didn't go through everywhere. Try relinking."),
      );
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <p className="text-paper-muted">Checking account…</p>;

  if (!signedIn) {
    const query = new URLSearchParams({ kind: initialKind });
    if (initialTarget) query.set("target", initialTarget);
    if (initialThs) query.set("ths", initialThs);
    const back = `/btc/watch?${query}`;
    return (
      <div className={card}>
        <p className="text-paper">Sign in to start watching. Your first watch is free.</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-paper-muted">
          {KINDS.map((k) => (
            <li key={k.id}>
              <span className="text-paper">{k.label}:</span> {k.hint}
            </li>
          ))}
        </ul>
        <Link
          href={`/account/signin?callbackUrl=${encodeURIComponent(back)}`}
          className="btn-cta mt-4 inline-block rounded-full px-5 py-2.5 text-sm"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const active = (watches ?? []).filter((w) => !w.done_at);
  // The engine runs each user's oldest watches up to their allowance.
  const running = new Set(
    [...active].sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(0, limit).map((w) => w.id),
  );
  const meta = KINDS.find((k) => k.id === kind)!;
  const hasPhone = targets.some((t) => t.channel.startsWith("push_"));
  const phoneAvailable = native && (available.pushIos || available.pushAndroid);

  return (
    <div className="space-y-6">
      <section className={card} aria-labelledby="watch-add">
        <h2 id="watch-add" className="text-lg font-bold text-paper">New watch</h2>
        <div className="mt-3 flex flex-wrap gap-2" role="tablist">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              role="tab"
              aria-selected={kind === k.id}
              onClick={() => setKind(k.id)}
              className={`min-h-11 rounded-full border px-4 text-sm ${kind === k.id ? "border-accent text-paper" : "border-line text-paper-muted"}`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-paper-muted">{meta.hint}</p>
        <div className="mt-3 grid gap-2">
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={meta.placeholder}
            aria-label={meta.placeholder}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className={`${input} mono`}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Name (optional), e.g. Cold storage"
              aria-label="Name"
              maxLength={40}
              className={input}
            />
            {kind === "solo" ? (
              <input
                value={ths}
                onChange={(e) => setThs(e.target.value)}
                placeholder="Hashrate TH/s (optional)"
                aria-label="Hashrate in TH/s"
                inputMode="decimal"
                className={`${input} sm:max-w-[220px]`}
              />
            ) : null}
          </div>
        </div>
        <button
          type="button"
          disabled={busy === "add" || !target.trim()}
          onClick={() => void add()}
          className="btn-cta mt-4 rounded-full px-5 py-2.5 text-sm disabled:opacity-60"
        >
          {busy === "add" ? "Adding…" : "Start watching"}
        </button>
        {message ? <p className="mt-3 text-sm text-paper-muted" role="status">{message}</p> : null}
        {needsPro ? (
          native && !storePurchasesAvailable() ? (
            <p className="mt-2 text-sm text-paper-muted">
              Pro watches up to 25 at once. Pro isn&apos;t sold in this app; if you have it, it unlocks here when you
              sign in.
            </p>
          ) : (
            <Link href="/btc/pro#checkout" className="mt-2 inline-block text-sm font-semibold text-accent hover:underline">
              Watch up to 25 with Pro →
            </Link>
          )
        ) : null}
      </section>

      <section className={card} aria-labelledby="watch-list">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="watch-list" className="text-lg font-bold text-paper">Your watches</h2>
          <p className="text-xs text-paper-muted">
            {active.length} of {limit} {pro ? "(Pro)" : "(free)"}
          </p>
        </div>
        {watches == null ? (
          <p className="mt-3 text-sm text-paper-muted">Loading…</p>
        ) : watches.length === 0 ? (
          <p className="mt-3 text-sm text-paper-muted">Nothing yet. Add a transaction, wallet or miner above.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {watches.map((w) => {
              const status = w.done_at ? "Done" : running.has(w.id) ? "Watching" : "Paused (over your limit)";
              return (
                <li
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-line px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-paper">
                      {KINDS.find((k) => k.id === w.kind)?.label} · {w.label || <span className="mono">{shortId(w.target)}</span>}
                    </p>
                    <p className="text-[11px] text-paper-muted">
                      {status}
                      {w.kind === "solo" && w.params?.ths ? ` · ${w.params.ths} TH/s` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy === w.id}
                    onClick={() => void remove(w.id)}
                    className="min-h-11 px-2 text-xs text-paper-muted hover:text-down disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={card} aria-labelledby="watch-where">
        <h2 id="watch-where" className="text-lg font-bold text-paper">Where notifications go</h2>
        {targets.length ? (
          <ul className="mt-3 space-y-2">
            {targets.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-paper">{CHANNEL_LABEL[t.channel] ?? t.channel}</span>
                <button
                  type="button"
                  disabled={busy === t.id}
                  onClick={() => void unlink(t.id)}
                  className="min-h-11 px-2 text-xs text-paper-muted hover:text-down"
                >
                  Unlink
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-paper-muted">
            Nothing linked yet. {native ? "Turn on notifications for this phone" : "Install the app for phone notifications, or connect Telegram"}.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {phoneAvailable && !hasPhone ? (
            <button type="button" onClick={() => void enablePhone()} className="btn-cta rounded-full px-4 py-2 text-sm">
              Turn on phone notifications
            </button>
          ) : null}
          {available.telegram ? (
            <button
              type="button"
              disabled={busy === "telegram"}
              onClick={() => void connectTelegram()}
              className="rounded-full border border-line px-4 py-2 text-sm text-paper hover:border-accent disabled:opacity-60"
            >
              {targets.some((t) => t.channel === "telegram") ? "Link another Telegram chat" : "Connect Telegram"}
            </button>
          ) : null}
          {targets.length ? (
            <button
              type="button"
              disabled={busy === "test"}
              onClick={() => void sendTest()}
              className="rounded-full border border-line px-4 py-2 text-sm text-paper-muted hover:text-paper disabled:opacity-60"
            >
              Send a test
            </button>
          ) : null}
        </div>
      </section>

      <section className={card} aria-labelledby="watch-history">
        <h2 id="watch-history" className="text-lg font-bold text-paper">Recent notifications</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-paper-muted">None yet. They&apos;ll show here for 30 days.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {events.map((e) => (
              <li key={e.id} className="text-sm">
                <p className="font-semibold text-paper">{e.title}</p>
                <p className="text-paper-muted">{e.body}</p>
                <p className="text-[11px] text-paper-muted">
                  {new Date(e.at).toLocaleString()} ·{" "}
                  {e.status === "no_target" ? "not delivered (nothing linked)" : e.status === "failed" ? "delivery failed" : `sent via ${e.channel.replace("push_ios", "iPhone").replace("push_android", "Android")}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
