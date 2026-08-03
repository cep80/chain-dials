"use client";

import { useCallback, useEffect, useState } from "react";
import { useChain } from "@/lib/chains/context";
import { useProAccess } from "@/hooks/useProAccess";
import { useDashboardStore } from "@/lib/store";
import { saveFavorites } from "@/lib/favorites";
import type { MetricId } from "@/types/metrics";

type LayoutRow = {
  id: string;
  name: string;
  chainId: string;
  favorites: string[];
  updatedAt: string;
};

export function SavedLayoutsPanel() {
  const chain = useChain();
  const { pro, signedIn } = useProAccess();
  const favorites = useDashboardStore((s) => s.favorites);
  const favoriteChainId = useDashboardStore((s) => s.favoriteChainId);
  const [layouts, setLayouts] = useState<LayoutRow[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!pro || !signedIn) return;
    const res = await fetch(`/api/pro/layouts?chainId=${chain.id}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { layouts: LayoutRow[] };
    setLayouts(data.layouts);
  }, [pro, signedIn, chain.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!pro) return null;

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/pro/layouts", {
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
    setBusy(true);
    try {
      await fetch(`/api/pro/layouts?id=${encodeURIComponent(id)}`, {
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
        Name the current {chain.shortName} layout and restore it later. Pro
        syncs these to your account.
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
          disabled={busy || !name.trim()}
          onClick={() => void save()}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
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
