"use client";

import { useCallback, useEffect, useState } from "react";
import { useChain } from "@/lib/chains/context";
import { useProAccess } from "@/hooks/useProAccess";
import { useDashboardStore } from "@/lib/store";
import { saveFavorites } from "@/lib/favorites";
import type { MetricId } from "@/types/metrics";
import { sessionFetch } from "@/lib/session-fetch";

type LayoutRow = {
  id: string;
  name: string;
  chainId: string;
  favorites: string[];
  updatedAt: string;
};

const LOCAL_KEY = "chain-dials:layouts:v1";
const MAX_LOCAL = 20;

function readLocal(): LayoutRow[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? (parsed as LayoutRow[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: LayoutRow[]): boolean {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
    return true;
  } catch {
    return false;
  }
}

/** Free on this device; Pro syncs the same layouts to the account. */
export function SavedLayoutsPanel() {
  const chain = useChain();
  const { pro, signedIn, loading } = useProAccess();
  const cloud = pro && signedIn;
  const favorites = useDashboardStore((s) => s.favorites);
  const favoriteChainId = useDashboardStore((s) => s.favoriteChainId);
  const [layouts, setLayouts] = useState<LayoutRow[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (loading) return;
    if (!cloud) {
      setLayouts(readLocal().filter((l) => l.chainId === chain.id));
      return;
    }
    const res = await sessionFetch(`/api/pro/layouts?chainId=${chain.id}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { layouts: LayoutRow[] };
    setLayouts(data.layouts);
  }, [loading, cloud, chain.id]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(t);
  }, [refresh]);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!cloud) {
      const all = readLocal();
      if (all.length >= MAX_LOCAL) {
        setMessage(`Up to ${MAX_LOCAL} layouts on this device. Delete one first.`);
        return;
      }
      const row: LayoutRow = {
        id: `local-${Date.now().toString(36)}`,
        name: trimmed,
        chainId: chain.id,
        favorites: [...favorites],
        updatedAt: new Date().toISOString(),
      };
      if (!writeLocal([row, ...all])) {
        setMessage("This browser could not save the layout.");
        return;
      }
      setName("");
      setMessage("Layout saved on this device.");
      await refresh();
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await sessionFetch("/api/pro/layouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          chainId: chain.id,
          favorites,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Save failed");
      } else {
        setName("");
        setMessage("Layout saved.");
        await refresh();
      }
    } catch {
      setMessage("Network error");
    } finally {
      setBusy(false);
    }
  };

  const apply = (layout: LayoutRow) => {
    const ids = layout.favorites.filter(
      (id): id is MetricId => typeof id === "string",
    );
    const chainId = favoriteChainId || chain.id;
    saveFavorites(ids, chainId);
    useDashboardStore.setState({ favorites: ids, favoriteChainId: chainId });
    setMessage(`Loaded "${layout.name}".`);
  };

  const remove = async (id: string) => {
    if (!cloud) {
      writeLocal(readLocal().filter((l) => l.id !== id));
      await refresh();
      return;
    }
    setBusy(true);
    try {
      await sessionFetch(`/api/pro/layouts?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 rounded-[14px] border border-line bg-ink-elevated/60 p-5">
      <h2 className="text-lg font-bold text-paper">Saved layouts</h2>
      <p className="mt-1 text-sm text-paper-muted">
        Name the current {chain.shortName} layout and restore it later.{" "}
        {cloud
          ? "Synced to your account."
          : "Saved on this device; Pro syncs them across devices."}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Just fees"
          maxLength={60}
          className="min-h-11 flex-1 rounded-[10px] border border-line bg-ink px-3 text-sm text-paper outline-none focus:border-accent"
        />
        <button
          type="button"
          disabled={busy || !name.trim() || favorites.length === 0}
          onClick={() => void save()}
          className="btn-cta rounded-full px-4 py-2 text-sm disabled:opacity-60"
        >
          Save current pins
        </button>
      </div>
      {message ? <p className="mt-2 text-xs text-paper-muted">{message}</p> : null}
      <ul className="mt-4 space-y-2">
        {layouts.length === 0 ? (
          <li className="text-sm text-paper-muted">No saved layouts yet.</li>
        ) : (
          layouts.map((layout) => (
            <li
              key={layout.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-line px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold text-paper">{layout.name}</p>
                <p className="text-[11px] text-paper-muted">
                  {layout.favorites.length} pins ·{" "}
                  {new Date(layout.updatedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs text-accent hover:underline"
                  onClick={() => apply(layout)}
                >
                  Load
                </button>
                <button
                  type="button"
                  className="text-xs text-paper-muted hover:text-down"
                  onClick={() => void remove(layout.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
