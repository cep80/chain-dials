"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { useProAccess } from "@/hooks/useProAccess";
import {
  DESK_PACK_STORAGE_KEY,
  deskPackToMarkdown,
  emptyDeskPack,
  normalizeDeskPack,
  parseDeskPacksJson,
  type ForensicsDeskPack,
} from "@/lib/forensics/desk-pack";

function loadLocal(): ForensicsDeskPack[] {
  try {
    const raw = localStorage.getItem(DESK_PACK_STORAGE_KEY);
    if (!raw) return [emptyDeskPack()];
    const desks = parseDeskPacksJson(raw);
    return desks.length ? desks : [emptyDeskPack()];
  } catch {
    return [emptyDeskPack()];
  }
}

export default function ForensicsDeskPage() {
  const { pro, signedIn, loading } = useProAccess();
  const [desks, setDesks] = useState<ForensicsDeskPack[]>([emptyDeskPack()]);
  const [activeId, setActiveId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [txidDraft, setTxidDraft] = useState("");
  const [addrDraft, setAddrDraft] = useState("");

  useEffect(() => {
    const list = loadLocal();
    setDesks(list);
    setActiveId(list[0]!.id);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(DESK_PACK_STORAGE_KEY, JSON.stringify(desks));
    } catch {
      // ignore
    }
  }, [desks, hydrated]);

  const loadCloud = useCallback(async () => {
    if (!pro || !signedIn) return;
    const res = await fetch("/api/pro/desks", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { desks: ForensicsDeskPack[] };
    if (data.desks?.length) {
      setDesks(data.desks);
      setActiveId(data.desks[0]!.id);
      setMessage("Loaded desks from your account.");
    }
  }, [pro, signedIn]);

  useEffect(() => {
    void loadCloud();
  }, [loadCloud]);

  const active =
    desks.find((d) => d.id === activeId) ?? desks[0] ?? emptyDeskPack();

  const updateActive = (patch: Partial<ForensicsDeskPack>) => {
    setDesks((prev) =>
      prev.map((d) =>
        d.id === active.id
          ? { ...d, ...patch, updatedAt: Date.now() }
          : d,
      ),
    );
  };

  const exportMd = () => {
    const md = deskPackToMarkdown(active);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.name.replace(/\s+/g, "-").toLowerCase()}-desk.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveCloud = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/pro/desks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desks }),
      });
      const data = (await res.json()) as {
        error?: string;
        desks?: ForensicsDeskPack[];
      };
      if (!res.ok) {
        setMessage(data.error ?? "Save failed");
      } else {
        setMessage("Desks synced to your account.");
        if (data.desks?.length) setDesks(data.desks);
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  };

  const editor = (
    <div className="space-y-6">
      <div className="rounded-[14px] border border-line bg-ink-elevated p-5">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-sm text-paper">
            Desk{" "}
            <select
              className="ml-2 rounded-[8px] border border-line bg-ink px-2 py-1"
              value={active.id}
              onChange={(e) => setActiveId(e.target.value)}
            >
              {desks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-paper">
            Name{" "}
            <input
              className="ml-2 rounded-[8px] border border-line bg-ink px-2 py-1"
              value={active.name}
              onChange={(e) => updateActive({ name: e.target.value })}
            />
          </label>
          <button
            type="button"
            className="rounded-full border border-line px-3 py-1.5 text-xs"
            onClick={() => {
              const d = emptyDeskPack();
              setDesks((prev) => [d, ...prev].slice(0, 30));
              setActiveId(d.id);
            }}
          >
            New desk
          </button>
        </div>

        <label className="mt-4 block text-sm text-paper-muted">
          Summary
          <textarea
            className="mt-1 w-full rounded-[10px] border border-line bg-ink px-3 py-2 text-sm text-paper"
            rows={3}
            value={active.summary}
            onChange={(e) => updateActive({ summary: e.target.value })}
            placeholder="What are you tracking?"
          />
        </label>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-paper-muted">
              Transactions
            </p>
            <div className="mt-2 flex gap-2">
              <input
                className="mono flex-1 rounded-[8px] border border-line bg-ink px-2 py-1 text-xs"
                placeholder="txid"
                value={txidDraft}
                onChange={(e) => setTxidDraft(e.target.value)}
              />
              <button
                type="button"
                className="rounded-full border border-line px-3 text-xs"
                onClick={() => {
                  const txid = txidDraft.trim();
                  if (txid.length < 8) return;
                  updateActive({
                    txs: [...active.txs, { txid }].slice(0, 40),
                  });
                  setTxidDraft("");
                }}
              >
                Add
              </button>
            </div>
            <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs">
              {active.txs.map((t) => (
                <li key={t.txid} className="mono flex justify-between gap-2">
                  <span className="truncate">{t.txid}</span>
                  <button
                    type="button"
                    className="text-down"
                    onClick={() =>
                      updateActive({
                        txs: active.txs.filter((x) => x.txid !== t.txid),
                      })
                    }
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-paper-muted">
              Addresses
            </p>
            <div className="mt-2 flex gap-2">
              <input
                className="mono flex-1 rounded-[8px] border border-line bg-ink px-2 py-1 text-xs"
                placeholder="address"
                value={addrDraft}
                onChange={(e) => setAddrDraft(e.target.value)}
              />
              <button
                type="button"
                className="rounded-full border border-line px-3 text-xs"
                onClick={() => {
                  const address = addrDraft.trim();
                  if (!address) return;
                  updateActive({
                    addresses: [...active.addresses, { address }].slice(
                      0,
                      20,
                    ),
                  });
                  setAddrDraft("");
                }}
              >
                Add
              </button>
            </div>
            <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs">
              {active.addresses.map((a) => (
                <li key={a.address} className="mono flex justify-between gap-2">
                  <span className="truncate">{a.address}</span>
                  <button
                    type="button"
                    className="text-down"
                    onClick={() =>
                      updateActive({
                        addresses: active.addresses.filter(
                          (x) => x.address !== a.address,
                        ),
                      })
                    }
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportMd}
            className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-paper"
          >
            Export markdown
          </button>
          <button
            type="button"
            disabled={saving || !pro}
            onClick={() => void saveCloud()}
            className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-ink disabled:opacity-60"
            title={pro ? "Sync to account" : "Pro required for cloud sync"}
          >
            {saving ? "Syncing…" : pro ? "Sync desks to account" : "Sync · Pro"}
          </button>
          <Link
            href="/btc/forensics"
            className="self-center text-xs text-accent hover:underline"
          >
            Open free Trace →
          </Link>
          {message ? (
            <span className="self-center text-xs text-paper-muted">{message}</span>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-paper-muted">
        Interactive Trace stays free. Desk packs are memory + export for an
        investigation session.
      </p>
    </div>
  );

  // Validate desk still normalizes after edits (structural safety)
  void normalizeDeskPack(active);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <p className="text-xs uppercase tracking-[0.22em] text-accent">
          Pro · Forensics desk
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-paper">
          Desk packs
        </h1>
        <p className="mt-2 text-paper-muted">
          Pin txs and addresses, write a short summary, export markdown. Cloud
          sync is Pro; browsing Trace is free.
        </p>
        <div className="mt-8">
          {/* Local desks + markdown export free; cloud sync is Pro */}
          {editor}
          {!loading && !pro ? (
            <div className="mt-4 rounded-[12px] border border-dashed border-line p-4 text-sm text-paper-muted">
              Cloud desk sync is Pro.{" "}
              {signedIn ? (
                <Link href="/btc/pro#checkout" className="text-accent hover:underline">
                  Upgrade to sync across devices
                </Link>
              ) : (
                <Link
                  href="/account/signin?callbackUrl=/btc/desk"
                  className="text-accent hover:underline"
                >
                  Sign in to upgrade
                </Link>
              )}
              . Local save + export stay free.
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
