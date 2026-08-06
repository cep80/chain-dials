"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { ProGate } from "@/components/monetization/ProGate";
import { useProAccess } from "@/hooks/useProAccess";
import { CHAIN_ORDER, CHAINS } from "@/lib/chains/registry";
import type { ChainId } from "@/lib/chains/types";
import { INSTRUMENT_ORDER, type InstrumentId } from "@/lib/instruments";
import {
  activeSlotIndex,
  defaultWallPack,
  parseWallPacksJson,
  WALL_PACK_ACTIVE_KEY,
  WALL_PACK_STORAGE_KEY,
  wallPackBoardHref,
  type WallPack,
  type WallPackSlot,
} from "@/lib/wall-packs";

function loadLocalPacks(): WallPack[] {
  try {
    const raw = localStorage.getItem(WALL_PACK_STORAGE_KEY);
    if (!raw) return [defaultWallPack()];
    const packs = parseWallPacksJson(raw);
    return packs.length ? packs : [defaultWallPack()];
  } catch {
    return [defaultWallPack()];
  }
}

function saveLocalPacks(packs: WallPack[]) {
  try {
    localStorage.setItem(WALL_PACK_STORAGE_KEY, JSON.stringify(packs));
  } catch {
    // ignore
  }
}

export default function ControlRoomPage() {
  const { pro, signedIn, loading } = useProAccess();
  const [packs, setPacks] = useState<WallPack[]>([defaultWallPack()]);
  const [activeId, setActiveId] = useState("default-suite");
  const [startMs] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const packsLocal = loadLocalPacks();
    setPacks(packsLocal);
    try {
      const id = localStorage.getItem(WALL_PACK_ACTIVE_KEY);
      if (id && packsLocal.some((p) => p.id === id)) setActiveId(id);
      else setActiveId(packsLocal[0]!.id);
    } catch {
      setActiveId(packsLocal[0]!.id);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveLocalPacks(packs);
    try {
      localStorage.setItem(WALL_PACK_ACTIVE_KEY, activeId);
    } catch {
      // ignore
    }
  }, [packs, activeId, hydrated]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const loadCloud = useCallback(async () => {
    if (!pro || !signedIn) return;
    const res = await fetch("/api/pro/wall-packs", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { packs: WallPack[] };
    if (data.packs?.length) {
      setPacks(data.packs);
      setActiveId(data.packs[0]!.id);
      setMessage("Loaded packs from your account.");
    }
  }, [pro, signedIn]);

  useEffect(() => {
    void loadCloud();
  }, [loadCloud]);

  const active = useMemo(
    () => packs.find((p) => p.id === activeId) ?? packs[0] ?? defaultWallPack(),
    [packs, activeId],
  );

  const slotIdx = activeSlotIndex(active, now, startMs);
  const currentSlot = active.slots[slotIdx] ?? active.slots[0];

  const saveCloud = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/pro/wall-packs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packs }),
      });
      const data = (await res.json()) as { error?: string; packs?: WallPack[] };
      if (!res.ok) {
        setMessage(data.error ?? "Save failed");
      } else {
        setMessage("Control room packs synced to your account.");
        if (data.packs?.length) setPacks(data.packs);
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  };

  const updateActive = (patch: Partial<WallPack>) => {
    setPacks((prev) =>
      prev.map((p) =>
        p.id === active.id
          ? { ...p, ...patch, updatedAt: Date.now() }
          : p,
      ),
    );
  };

  const setSlot = (index: number, slot: WallPackSlot) => {
    const slots = active.slots.map((s, i) => (i === index ? slot : s));
    updateActive({ slots });
  };

  const editor = (
    <div className="space-y-6">
      <div className="rounded-[14px] border border-line bg-ink-elevated p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-paper-muted">
              Pack
            </label>
            <select
              className="mt-1 block rounded-[8px] border border-line bg-ink px-3 py-2 text-paper"
              value={active.id}
              onChange={(e) => setActiveId(e.target.value)}
            >
              {packs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <label className="text-sm text-paper">
            Name{" "}
            <input
              className="ml-2 rounded-[8px] border border-line bg-ink px-2 py-1"
              value={active.name}
              onChange={(e) => updateActive({ name: e.target.value })}
            />
          </label>
          <label className="text-sm text-paper">
            Rotate (s){" "}
            <input
              type="number"
              min={10}
              max={600}
              className="mono ml-2 w-20 rounded-[8px] border border-line bg-ink px-2 py-1"
              value={active.rotateSeconds}
              onChange={(e) =>
                updateActive({ rotateSeconds: Number(e.target.value) })
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-paper">
            <input
              type="checkbox"
              checked={active.kiosk}
              onChange={(e) => updateActive({ kiosk: e.target.checked })}
            />
            Kiosk mode
          </label>
        </div>

        <ul className="mt-6 space-y-3">
          {active.slots.map((slot, i) => (
            <li
              key={`${slot.chainId}-${i}`}
              className={`flex flex-wrap items-center gap-3 rounded-[10px] border px-3 py-2 ${
                i === slotIdx
                  ? "border-accent bg-accent/10"
                  : "border-line bg-ink/40"
              }`}
            >
              <span className="mono text-xs text-paper-muted w-6">{i + 1}</span>
              <select
                className="rounded-[8px] border border-line bg-ink px-2 py-1 text-sm text-paper"
                value={slot.chainId}
                onChange={(e) =>
                  setSlot(i, {
                    ...slot,
                    chainId: e.target.value as ChainId,
                  })
                }
              >
                {CHAIN_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {CHAINS[id].shortName}
                  </option>
                ))}
              </select>
              <select
                className="rounded-[8px] border border-line bg-ink px-2 py-1 text-sm text-paper"
                value={slot.instrument ?? ""}
                onChange={(e) =>
                  setSlot(i, {
                    ...slot,
                    instrument: (e.target.value || null) as InstrumentId | null,
                  })
                }
              >
                <option value="">Full wall</option>
                {INSTRUMENT_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
              <Link
                href={wallPackBoardHref(slot)}
                className="text-xs text-accent hover:underline"
              >
                Open now
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-line px-3 py-1.5 text-xs text-paper-muted"
            onClick={() => {
              if (active.slots.length >= 8) return;
              updateActive({
                slots: [
                  ...active.slots,
                  { chainId: "btc", instrument: null },
                ],
              });
            }}
          >
            Add slot
          </button>
          <button
            type="button"
            className="rounded-full border border-line px-3 py-1.5 text-xs text-paper-muted"
            onClick={() => {
              if (active.slots.length <= 1) return;
              updateActive({ slots: active.slots.slice(0, -1) });
            }}
          >
            Remove last
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveCloud()}
            className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-ink disabled:opacity-60"
          >
            {saving ? "Syncing…" : "Sync packs to account"}
          </button>
          {message ? (
            <span className="text-xs text-paper-muted self-center">{message}</span>
          ) : null}
        </div>
      </div>

      {currentSlot ? (
        <div className="rounded-[14px] border border-accent/40 bg-ink p-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-accent">
            Now showing · slot {slotIdx + 1}/{active.slots.length}
          </p>
          <p className="mt-2 text-2xl font-bold text-paper">
            {CHAINS[currentSlot.chainId].name}
            {currentSlot.instrument
              ? ` · ${currentSlot.instrument}`
              : " · wall"}
          </p>
          <Link
            href={wallPackBoardHref(currentSlot)}
            className="mt-4 inline-flex rounded-full bg-paper px-5 py-2.5 text-sm font-semibold text-ink"
          >
            Launch on this display
          </Link>
          <p className="mt-3 text-xs text-paper-muted">
            Auto-rotates every {active.rotateSeconds}s. Single-chain wall stays
            free at each chain&apos;s /wall route.
          </p>
        </div>
      ) : null}
    </div>
  );

  return (
    <AppShell suiteHome>
      <div className="mx-auto max-w-3xl">
        <p className="text-xs uppercase tracking-[0.22em] text-accent">
          Pro · Control room
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-paper md:text-4xl">
          Multi-chain wall packs
        </h1>
        <p className="mt-2 text-paper-muted">
          Orchestrate a TV: rotate BTC, ETH, SOL, and HYPE walls or open a
          specific dial. Free single-chain wall stays free forever.
        </p>

        <div className="mt-8">
          {loading ? (
            <p className="text-paper-muted">Checking account…</p>
          ) : pro ? (
            editor
          ) : (
            <ProGate
              title="Control room packs"
              detail={
                signedIn
                  ? "Pro unlocks multi-chain wall packs, rotation, and account sync. Each chain’s solo wall stays free."
                  : "Sign in and upgrade for multi-chain control-room packs. Single-chain wall mode stays free."
              }
              ctaLabel={signedIn ? "See Pro" : "Sign in"}
              ctaHref={
                signedIn
                  ? "/btc/pro#checkout"
                  : "/account/signin?callbackUrl=/control-room"
              }
            >
              {editor}
            </ProGate>
          )}
        </div>
      </div>
    </AppShell>
  );
}
