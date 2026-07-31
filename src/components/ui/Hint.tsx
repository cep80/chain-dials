"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useSettingsStore } from "@/lib/settings/store";
import { resolveTip, type TipId } from "@/lib/settings/tips";
import type { ChainId } from "@/lib/chains/types";

type HintProps = {
  tip: TipId;
  children: ReactNode;
  className?: string;
  /** Extra context for tip copy */
  chainId?: ChainId;
  feeUnit?: string;
  /** Prefer wrapping as span (default) or div */
  as?: "span" | "div";
  /** Side preference */
  side?: "top" | "bottom";
};

/**
 * Accessible hover/focus tip for newcomers.
 * Renders children unchanged when guidance tooltips are off.
 */
export function Hint({
  tip,
  children,
  className = "",
  chainId,
  feeUnit,
  as = "span",
  side = "top",
}: HintProps) {
  const enabled = useSettingsStore((s) => s.newbieTooltips);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number; place: "top" | "bottom" } | null>(
    null,
  );
  const anchorRef = useRef<HTMLElement | null>(null);
  const tipId = useId();
  const copy = resolveTip(tip, { chainId, feeUnit });

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const prefer = side;
    const spaceAbove = r.top;
    const place =
      prefer === "top"
        ? spaceAbove > 72
          ? "top"
          : "bottom"
        : r.bottom + 72 < window.innerHeight
          ? "bottom"
          : "top";
    setCoords({
      x: Math.min(window.innerWidth - 16, Math.max(16, r.left + r.width / 2)),
      y: place === "top" ? r.top - 8 : r.bottom + 8,
      place,
    });
  }, [side]);

  const show = useCallback(() => {
    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    const onScroll = () => updatePosition();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, hide, updatePosition]);

  if (!hydrated || !enabled) {
    const Tag = as;
    const layoutClass = as === "div" ? "block w-full" : "inline-flex";
    return <Tag className={`max-w-full ${layoutClass} ${className}`}>{children}</Tag>;
  }

  const Tag = as;
  const canPortal = typeof document !== "undefined";
  const layoutClass = as === "div" ? "block w-full" : "inline-flex";

  return (
    <Tag
      ref={anchorRef as never}
      className={`relative max-w-full ${layoutClass} ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={open ? tipId : undefined}
    >
      {children}
      {open && coords && canPortal
        ? createPortal(
            <div
              id={tipId}
              role="tooltip"
              className="pointer-events-none fixed z-[200] w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-[10px] border border-line bg-ink-elevated px-3 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
              style={{
                left: coords.x,
                top: coords.y,
                transform:
                  coords.place === "top"
                    ? "translate(-50%, -100%)"
                    : "translate(-50%, 0)",
              }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                {copy.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-paper-muted">
                {copy.body}
              </p>
            </div>,
            document.body,
          )
        : null}
    </Tag>
  );
}
