"use client";

import { useEffect, useState } from "react";
import { readingFreshness } from "@/lib/data/freshness";
import { formatRelativeAge } from "@/lib/format";

export function ReadingStatus({ updatedAt, loading = false, error = null, staleMs = 60_000 }: {
  updatedAt: number | null;
  loading?: boolean;
  error?: string | null;
  staleMs?: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const sync = () => { if (document.visibilityState !== "hidden") setNow(Date.now()); };
    const timer = window.setInterval(sync, 10_000);
    document.addEventListener("visibilitychange", sync);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", sync); };
  }, []);
  const status = readingFreshness({ updatedAt, loading, error, now, staleMs });
  const validTime = updatedAt != null && Number.isFinite(updatedAt) && Math.abs(updatedAt) <= 8.64e15;
  const labels = { loading: "Loading", live: "Live", stale: "Stale", unavailable: "Unavailable" };
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-paper-muted" title={error ?? undefined}>
      <span className={status === "live" ? "text-up" : status === "stale" ? "text-warn" : "text-paper-muted"}>{labels[status]}</span>
      {validTime ? <time dateTime={new Date(updatedAt).toISOString()} title={new Date(updatedAt).toLocaleString()}>Updated {formatRelativeAge(updatedAt)}</time> : null}
      {loading && updatedAt != null ? <span>Refreshing…</span> : null}
      {error && updatedAt != null ? <span>Last successful reading retained</span> : null}
    </span>
  );
}
