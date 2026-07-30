"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  composeBoardTweet,
  composeInstrumentTweet,
  composeMetricTweet,
  composeSuiteTweet,
  type SharePayload,
} from "@/lib/share/compose";
import {
  hasNostrExtension,
  nostrWebComposeUrl,
  publishNostrNote,
} from "@/lib/share/nostr";
import type { ChainId } from "@/lib/chains/types";
import type { InstrumentId } from "@/lib/instruments";
import type { MetricId } from "@/types/metrics";
import { Hint } from "@/components/ui/Hint";

function XGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
    </svg>
  );
}

function NostrGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="none">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.18" />
      <path
        d="M8 16.5V7.5h2.1c2.4 0 3.9 1.2 3.9 3.2 0 1.35-.7 2.35-1.85 2.85L15.2 16.5h-2.35l-2.7-2.7H10.1v2.7H8zm2.1-4.55h.55c1.05 0 1.7-.55 1.7-1.45s-.65-1.4-1.7-1.4H10.1v2.85z"
        fill="currentColor"
      />
    </svg>
  );
}

function ShareGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.5 13.5l7 4M8.5 10.5l7-4" strokeLinecap="round" />
    </svg>
  );
}

export type ShareTarget =
  | {
      kind: "instrument";
      chainId: ChainId;
      instrument: InstrumentId;
      reading?: string | null;
    }
  | { kind: "metric"; chainId: ChainId; metric: MetricId; display: string }
  | {
      kind: "board";
      chainId: ChainId;
      fee?: string | null;
      since?: string | null;
    }
  | { kind: "suite" };

function build(target: ShareTarget): SharePayload {
  switch (target.kind) {
    case "instrument":
      return composeInstrumentTweet(target);
    case "metric":
      return composeMetricTweet(target);
    case "board":
      return composeBoardTweet(target);
    case "suite":
      return composeSuiteTweet();
  }
}

function canNativeShare(): boolean {
  return (
    typeof navigator !== "undefined" && typeof navigator.share === "function"
  );
}

/**
 * One quiet Share control. Menu: X · Nostr.
 * Mobile with Web Share: first action uses the system sheet.
 */
export function ShareBar({
  target,
  className = "",
  dataShare,
  /** Icon-only trigger (stage chrome). Default: labeled Share. */
  iconOnly = false,
}: {
  target: ShareTarget;
  className?: string;
  dataShare?: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"x" | "nostr" | null>(null);
  const [nip07, setNip07] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    setNip07(hasNostrExtension());
    const onDoc = (e: Event) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const shareNativeOrMenu = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const payload = build(target);

      // Capacitor native share sheet (iOS / Android)
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform()) {
          const { Share } = await import("@capacitor/share");
          const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
          try {
            await Haptics.impact({ style: ImpactStyle.Light });
          } catch {
            // optional
          }
          await Share.share({
            title: "Chain Dials",
            text: payload.text,
            url: payload.url,
            dialogTitle: "Share dial",
          });
          return;
        }
      } catch {
        // fall through
      }

      // Web Share API on mobile browsers
      if (canNativeShare() && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
        try {
          await navigator.share({
            text: payload.text,
            url: payload.url,
            title: "Chain Dials",
          });
          return;
        } catch {
          // dismissed
        }
      }
      setOpen((v) => !v);
    },
    [target],
  );

  const shareX = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setBusy("x");
      const { intentUrl } = build(target);
      window.open(intentUrl, "_blank", "noopener,noreferrer,width=560,height=650");
      setBusy(null);
      setOpen(false);
    },
    [target],
  );

  const shareNostr = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setBusy("nostr");
      const payload = build(target);

      try {
        if (hasNostrExtension()) {
          const { njump } = await publishNostrNote({
            content: payload.nostrText,
            url: payload.url,
            chainId: payload.chainId,
          });
          window.open(njump, "_blank", "noopener,noreferrer");
        } else {
          try {
            await navigator.clipboard.writeText(payload.nostrText);
          } catch {
            // still open client
          }
          window.open(
            nostrWebComposeUrl(payload.nostrText),
            "_blank",
            "noopener,noreferrer",
          );
        }
      } catch {
        try {
          await navigator.clipboard.writeText(payload.nostrText);
        } catch {
          // silent
        }
      } finally {
        setBusy(null);
        setOpen(false);
      }
    },
    [target],
  );

  const triggerClass = iconOnly
    ? "rounded-lg border border-line p-2 text-paper-muted transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    : "inline-flex items-center gap-2 rounded-full border border-line bg-ink/80 px-3.5 py-2 text-xs font-semibold text-paper-muted transition hover:border-accent hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  const itemClass =
    "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-paper transition hover:bg-ink-soft/80 disabled:opacity-50";

  return (
    <Hint tip="share.bar" className={className}>
      <div
        ref={rootRef}
        className="relative inline-flex"
        onClick={(e) => e.stopPropagation()}
      >
      <button
        type="button"
        onClick={shareNativeOrMenu}
        data-share-x={dataShare}
        data-share-nostr={dataShare}
        className={triggerClass}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label="Share"
      >
        <ShareGlyph size={iconOnly ? 16 : 14} />
        {!iconOnly && <span>Share</span>}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Share to"
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[11rem] overflow-hidden rounded-[12px] border border-line bg-ink-elevated py-1 shadow-none"
        >
          <button
            type="button"
            role="menuitem"
            onClick={shareX}
            disabled={busy != null}
            className={itemClass}
          >
            <XGlyph size={14} />
            <span>{busy === "x" ? "Opening…" : "X"}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={shareNostr}
            disabled={busy != null}
            className={itemClass}
          >
            <NostrGlyph size={14} />
            <span>
              {busy === "nostr"
                ? nip07
                  ? "Publishing…"
                  : "Opening…"
                : "Nostr"}
            </span>
          </button>
        </div>
      )}
    </div>
    </Hint>
  );
}

/** @deprecated Prefer ShareBar */
export function ShareOnX(props: {
  target: ShareTarget;
  compact?: boolean;
  className?: string;
  label?: string;
  dataShare?: string;
  iconOnly?: boolean;
}) {
  return (
    <ShareBar
      target={props.target}
      className={props.className}
      dataShare={props.dataShare}
      iconOnly={props.compact || props.iconOnly}
    />
  );
}
