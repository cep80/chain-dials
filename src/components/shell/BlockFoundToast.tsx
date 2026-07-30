"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useChainOptional } from "@/lib/chains/context";
import { useSettingsStore } from "@/lib/settings/store";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import { useDashboardStore } from "@/lib/store";

export function BlockFoundToast() {
  const toast = useDashboardStore((s) => s.blockToast);
  const clearToast = useDashboardStore((s) => s.clearToast);
  const blockToasts = useSettingsStore((s) => s.blockToasts);
  const chain = useChainOptional();
  const reduce = useAppReducedMotion();
  const noun = chain?.tipNoun ?? "block";
  const label =
    noun === "slot" ? "New slot" : noun === "ledger" ? "New ledger" : "New block";

  useEffect(() => {
    if (!toast || !blockToasts) return;
    const t = setTimeout(() => clearToast(), 3200);
    return () => clearTimeout(t);
  }, [toast, clearToast, blockToasts]);

  if (!blockToasts) return null;

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
          initial={reduce ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
        >
          <div className="rounded-full border border-accent/40 bg-ink-elevated px-5 py-2.5 text-sm shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent)_20%,transparent)]">
            <span className="text-accent">{label}</span>
            <span className="mono ml-2 text-paper">
              {toast.height.toLocaleString()}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
