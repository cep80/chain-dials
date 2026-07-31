"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  SettingsRow,
  SettingsSection,
  SettingsSegmented,
  SettingsSelect,
  SettingsToggle,
} from "@/components/settings/SettingsControls";
import { Hint } from "@/components/ui/Hint";
import { CHAIN_ORDER, CHAINS } from "@/lib/chains/registry";
import type { ChainId } from "@/lib/chains/types";
import {
  SETTINGS_DEFAULTS,
  useSettingsStore,
  type BoardDensity,
  type MotionPreference,
} from "@/lib/settings/store";
import { PRICE_RANGE_ORDER, type PriceRangeId } from "@/lib/price/types";

function clearLocalExtras() {
  if (typeof window === "undefined") return;
  const keep = new Set(["chain-dials:settings:v1"]);
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (
      k.startsWith("btc-dash:") ||
      k.startsWith("chain-dials:") ||
      k.startsWith("chaindials:")
    ) {
      if (!keep.has(k)) keys.push(k);
    }
  }
  for (const k of keys) localStorage.removeItem(k);
}

export function SettingsPageClient() {
  const newbieTooltips = useSettingsStore((s) => s.newbieTooltips);
  const showTermHints = useSettingsStore((s) => s.showTermHints);
  const blockToasts = useSettingsStore((s) => s.blockToasts);
  const motion = useSettingsStore((s) => s.motion);
  const density = useSettingsStore((s) => s.density);
  const preferredChain = useSettingsStore((s) => s.preferredChain);
  const defaultPriceRange = useSettingsStore((s) => s.defaultPriceRange);
  const set = useSettingsStore((s) => s.set);
  const reset = useSettingsStore((s) => s.reset);
  const hydrated = useSettingsStore((s) => s.hydrated);

  const chainOptions = useMemo(
    () =>
      CHAIN_ORDER.map((id) => ({
        value: id,
        label: CHAINS[id].name,
      })),
    [],
  );

  const rangeOptions = useMemo(
    () =>
      PRICE_RANGE_ORDER.map((id) => ({
        value: id,
        label: id,
      })),
    [],
  );

  if (!hydrated) {
    return (
      <div className="rounded-[14px] border border-line bg-ink-elevated/50 px-5 py-10 text-sm text-paper-muted">
        Loading your preferences…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[14px] border border-line bg-ink-soft/40 px-5 py-4 text-sm text-paper-muted md:px-6">
        Preferences stay on this device only. No account, no sync cloud, just
        localStorage.{" "}
        <Hint tip="settings.newbie">
          <span className="underline decoration-dotted underline-offset-4">
            Newbie tooltips
          </span>
        </Hint>{" "}
        are on by default so jargon like “tip” doesn’t feel like a secret
        handshake.
      </div>

      <SettingsSection
        id="guidance"
        eyebrow="Guidance"
        title="Help for humans"
        blurb="Plain language overlaid on the board. Turn it down once the dials feel obvious."
      >
        <SettingsRow
          label="Newbie tooltips"
          description="Hover or focus almost any label to get a short explanation. Works with keyboard focus too."
          tip="settings.newbie"
          control={
            <SettingsToggle
              checked={newbieTooltips}
              onChange={(v) => set("newbieTooltips", v)}
              label="Newbie tooltips"
            />
          }
        />
        <SettingsRow
          label="Term hints panel"
          description="Show the glossary section under Ethereum, Solana, and Hyperliquid boards."
          tip="settings.terms"
          control={
            <SettingsToggle
              checked={showTermHints}
              onChange={(v) => set("showTermHints", v)}
              label="Term hints panel"
            />
          }
        />
        <SettingsRow
          label="Block found toasts"
          description="Show a little popup when a new block or slot lands while you’re watching."
          tip="settings.toasts"
          control={
            <SettingsToggle
              checked={blockToasts}
              onChange={(v) => set("blockToasts", v)}
              label="Block found toasts"
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        id="display"
        eyebrow="Display"
        title="Motion & density"
        blurb="Keep the observatory calm or lively. Density helps when you park this on a laptop wall."
      >
        <SettingsRow
          label="Motion"
          description="System follows your OS reduced-motion preference. Reduce calms springs and pulses."
          tip="settings.motion"
          control={
            <SettingsSegmented<MotionPreference>
              label="Motion"
              value={motion}
              onChange={(v) => set("motion", v)}
              options={[
                { value: "system", label: "System" },
                { value: "full", label: "Full" },
                { value: "reduce", label: "Reduce" },
              ]}
            />
          }
        />
        <SettingsRow
          label="Board density"
          description="Compact tightens instrument frames and strip spacing."
          tip="settings.density"
          control={
            <SettingsSegmented<BoardDensity>
              label="Board density"
              value={density}
              onChange={(v) => set("density", v)}
              options={[
                { value: "comfortable", label: "Comfortable" },
                { value: "compact", label: "Compact" },
              ]}
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        id="defaults"
        eyebrow="Defaults"
        title="Starting points"
        blurb="Small conveniences for the next time you open a board."
      >
        <SettingsRow
          label="Preferred chain"
          description="Used when a shortcut needs a default board (for example, “Open board” from suite chrome)."
          tip="settings.chain"
          control={
            <SettingsSelect<ChainId>
              label="Preferred chain"
              value={preferredChain}
              onChange={(v) => set("preferredChain", v)}
              options={chainOptions}
            />
          }
        />
        <SettingsRow
          label="Default price range"
          description="Which window the spot chart opens with on chain boards."
          tip="settings.range"
          control={
            <SettingsSelect<PriceRangeId>
              label="Default price range"
              value={defaultPriceRange}
              onChange={(v) => set("defaultPriceRange", v)}
              options={rangeOptions}
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        id="data"
        eyebrow="Data"
        title="This device"
        blurb="Favorites, history sparks, and settings live in your browser. You can wipe them without touching the live feeds."
      >
        <SettingsRow
          label="Reset settings"
          description={`Restore defaults (tooltips ${SETTINGS_DEFAULTS.newbieTooltips ? "on" : "off"}, comfortable density, Bitcoin preferred).`}
          control={
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-paper transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Reset preferences
            </button>
          }
        />
        <SettingsRow
          label="Clear local board data"
          description="Removes favorites, cached metric history, and similar keys. Keeps your settings unless you reset those separately."
          control={
            <button
              type="button"
              onClick={() => {
                clearLocalExtras();
                window.location.reload();
              }}
              className="rounded-full border border-warn/40 px-4 py-2 text-xs font-semibold text-warn transition hover:border-warn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warn"
            >
              Clear & reload
            </button>
          }
        />
      </SettingsSection>

      <p className="text-center text-xs text-paper-muted">
        Prefer a chain board?{" "}
        <Link
          href={`/${preferredChain}`}
          className="text-accent hover:underline"
        >
          Open {CHAINS[preferredChain].name}
        </Link>
        {" · "}
        <Link href="/privacy" className="hover:text-accent">
          Privacy
        </Link>
      </p>
    </div>
  );
}
