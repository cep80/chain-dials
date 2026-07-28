"use client";

import type { HistoryPoint } from "@/types/metrics";

export function Sparkline({
  points,
  width = 56,
  height = 18,
  positive,
}: {
  points: HistoryPoint[];
  width?: number;
  height?: number;
  positive?: boolean | null;
}) {
  if (!points || points.length < 2) {
    return (
      <svg width={width} height={height} aria-hidden className="opacity-30">
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth={1}
        />
      </svg>
    );
  }

  const values = points.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  });

  const color =
    positive == null ? "var(--paper-muted)" : positive ? "var(--up)" : "var(--down)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className="overflow-visible"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords.join(" ")}
      />
    </svg>
  );
}
