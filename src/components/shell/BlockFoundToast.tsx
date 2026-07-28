"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { useDashboardStore } from "@/lib/store";

export function BlockFoundToast() {
  const toast = useDashboardStore((s) => s.blockToast);
  const clearToast = useDashboardStore((s) => s.clearToast);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => clearToast(), 3200);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

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
          <div className="rounded-full border border-accent/40 bg-ink-elevated px-5 py-2.5 text-sm shadow-[0_0_0_1px_rgba(247,147,26,0.15)]">
            <span className="text-accent">Block found</span>
            <span className="mono ml-2 text-paper">{toast.height.toLocaleString()}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
