"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import {
  formatChartTime,
  formatCompactUsd,
  formatUsdSmart,
} from "@/lib/format";
import type { OhlcCandle, PricePoint } from "@/lib/price/types";

import { chartPoints, chartCandles, nearestSample, sampleInterval, seriesSegments } from "@/lib/price/chart-series";

export type ChartMode = "line" | "candle";

interface Props {
  points: PricePoint[];
  candles: OhlcCandle[];
  mode: ChartMode;
  accent: string;
  positive: boolean | null;
  height?: number;
}

function nicePad(min: number, max: number) {
  const span = max - min || Math.abs(max) * 0.02 || 1;
  const pad = span * 0.08;
  return { min: min - pad, max: max + pad };
}

export function PriceChart({
  points: rawPoints,
  candles: rawCandles,
  mode,
  accent,
  positive,
  height = 280,
}: Props) {
  const points = useMemo(() => chartPoints(rawPoints), [rawPoints]);
  const candles = useMemo(() => chartCandles(rawCandles), [rawCandles]);
  const gid = useId().replace(/:/g, "");
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const [width, setWidth] = useState(640);
  const [hoverI, setHoverI] = useState<number | null>(null);

  const setWrap = useCallback((node: HTMLDivElement | null) => {
    if (wrapRef.current && roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }
    wrapRef.current = node;
    if (!node) return;
    const apply = () => {
      const w = node.clientWidth;
      if (w > 0) setWidth(w);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(node);
    roRef.current = ro;
  }, []);

  const useCandles = mode === "candle" && candles.length >= 2;
  const series = useCandles ? candles : points;
  const segments = useMemo(() => seriesSegments<{ t: number }>(series), [series]);
  const interval = useMemo(() => sampleInterval(series), [series]);
  const spanMs = useMemo(() => {
    const src = useCandles ? candles : points;
    if (src.length < 2) return 0;
    return src[src.length - 1]!.t - src[0]!.t;
  }, [useCandles, candles, points]);

  const padL = 8;
  const padR = 56;
  const padT = height < 180 ? 10 : 14;
  const padB = height < 180 ? 20 : 26;
  const showVol = points.some((p) => (p.volume ?? 0) > 0) && !useCandles;
  const volH = !showVol ? 0 : height < 180 ? 22 : 40;
  const chartH = height - volH;
  const innerW = Math.max(40, width - padL - padR);
  const plotH = Math.max(40, chartH - padT - padB);

  const priceExtent = useMemo(() => {
    if (useCandles) {
      return nicePad(
        Math.min(...candles.map((c) => c.l)),
        Math.max(...candles.map((c) => c.h)),
      );
    }
    const prices = points.map((p) => p.price);
    return nicePad(Math.min(...prices), Math.max(...prices));
  }, [useCandles, candles, points]);

  const yAt = useCallback(
    (v: number) => {
      const range = priceExtent.max - priceExtent.min || 1;
      return padT + (1 - (v - priceExtent.min) / range) * plotH;
    },
    [priceExtent, plotH, padT],
  );

  const firstT = series[0]?.t ?? 0;
  const xAtTime = useCallback((timestamp: number) => spanMs <= 0 ? padL + innerW / 2 : padL + ((timestamp - firstT) / spanMs) * innerW, [firstT, spanMs, innerW]);
  const xAtLine = (i: number) => xAtTime(points[i]?.t ?? firstT);
  const xAtCandle = (i: number) => xAtTime(candles[i]?.t ?? firstT);

  const linePaths = useMemo(() => {
    if (useCandles || points.length < 2) return [];
    return seriesSegments(points).map((segment) => {
      const line = segment.map((p, i) => `${i === 0 ? "M" : "L"}${xAtTime(p.t).toFixed(2)},${yAt(p.price).toFixed(2)}`).join(" ");
      const start = segment[0]!;
      const end = segment[segment.length - 1]!;
      const area = `${line} L${xAtTime(end.t).toFixed(2)},${(padT + plotH).toFixed(2)} L${xAtTime(start.t).toFixed(2)},${(padT + plotH).toFixed(2)} Z`;
      return { line, area };
    });
  }, [useCandles, points, xAtTime, yAt, plotH, padT]);

  const maxVol = useMemo(() => {
    if (useCandles) return 0;
    return Math.max(0, ...points.map((p) => p.volume ?? 0));
  }, [useCandles, points]);

  const stroke =
    positive == null ? accent : positive ? "var(--up)" : "var(--down)";

  const count = useCandles ? candles.length : points.length;

  const pickIndex = (clientX: number) => {
    const el = wrapRef.current;
    if (!el || count < 2) return;
    const x = clientX - el.getBoundingClientRect().left;
    setHoverI(nearestSample(series, firstT + Math.max(0, Math.min(1, (x - padL) / innerW)) * spanMs));
  };

  const activeI = Math.max(0, Math.min(count - 1, hoverI ?? count - 1));
  const activePoint = !useCandles ? points[activeI] : null;
  const activeCandle = useCandles ? candles[activeI] : null;
  const activePrice = activePoint?.price ?? activeCandle?.c ?? null;
  const activeT = activePoint?.t ?? activeCandle?.t ?? null;
  const hoverX = useCandles
    ? xAtCandle(activeI)
    : xAtLine(activeI);
  const hoverY =
    activePrice != null ? yAt(activePrice) : padT + plotH / 2;

  const yTicks = [0, 0.5, 1].map((f) => ({
    y: padT + f * plotH,
    v: priceExtent.min + (priceExtent.max - priceExtent.min) * (1 - f),
  }));

  if (count < 2) {
    return (
      <div
        ref={setWrap}
        className="flex items-center justify-center text-sm text-paper-muted"
        style={{ height }}
      >
        Not enough history for this range.
      </div>
    );
  }

  const candleW = Math.max(1, Math.min(24, (interval / (spanMs || 1)) * innerW * 0.62));

  return (
    <div ref={setWrap} className="relative w-full select-none">
      <p id={`instructions-${gid}`} className="sr-only">Use left and right arrow keys to inspect prices, Home and End to jump to the first or latest reading. Drag horizontally on touch screens.</p>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="slider"
        tabIndex={0}
        aria-label="Historical USD price chart"
        aria-describedby={`instructions-${gid}`}
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={activeI}
        aria-valuetext={`${activeT != null ? new Date(activeT).toLocaleString() : ""}: ${formatUsdSmart(activePrice)}`}
        className="block w-full touch-pan-y rounded focus-visible:outline-2 focus-visible:outline-accent"
        onFocus={() => setHoverI((value) => value ?? count - 1)}
        onKeyDown={(event) => {
          const steps: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 };
          if (event.key === "Home" || event.key === "End" || event.key in steps) {
            event.preventDefault();
            setHoverI(event.key === "Home" ? 0 : event.key === "End" ? count - 1 : Math.max(0, Math.min(count - 1, activeI + steps[event.key]!)));
          }
          if (event.key === "Escape") { setHoverI(null); event.currentTarget.blur(); }
        }}
        onPointerDown={(e) => {
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
          pickIndex(e.clientX);
        }}
        onPointerMove={(e) => pickIndex(e.clientX)}
        onPointerUp={(e) => { e.currentTarget.releasePointerCapture?.(e.pointerId); }}
        onPointerCancel={() => setHoverI(null)}
        onPointerLeave={(e) => { if (e.pointerType === "mouse" && document.activeElement !== e.currentTarget) setHoverI(null); }}
      >
        <defs>
          <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={width - padR}
              y1={tick.y}
              y2={tick.y}
              stroke="var(--line)"
              strokeOpacity={0.65}
              strokeDasharray="3 5"
            />
            <text
              x={width - 6}
              y={tick.y - 4}
              textAnchor="end"
              fill="var(--paper-muted)"
              fontSize="10"
              fontFamily="var(--font-mono)"
            >
              {formatUsdSmart(tick.v)}
            </text>
          </g>
        ))}

        {!useCandles ? (
          <>
            {linePaths.map((path, index) => <g key={index} data-testid="price-segment">
            <path d={path.area} fill={`url(#fill-${gid})`} />
            <path
              d={path.line}
              fill="none"
              stroke={stroke}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            </g>)}
          </>
        ) : (
          candles.map((c, i) => {
            const x = xAtCandle(i);
            const up = c.c >= c.o;
            const color = up ? "var(--up)" : "var(--down)";
            const top = Math.min(yAt(c.o), yAt(c.c));
            const bot = Math.max(yAt(c.o), yAt(c.c));
            return (
              <g key={c.t}>
                <line
                  x1={x}
                  x2={x}
                  y1={yAt(c.h)}
                  y2={yAt(c.l)}
                  stroke={color}
                  strokeWidth={1}
                />
                <rect
                  x={x - candleW / 2}
                  y={top}
                  width={candleW}
                  height={Math.max(1, bot - top)}
                  fill={color}
                />
              </g>
            );
          })
        )}

        {maxVol > 0
          ? points.map((p, i) => {
              const v = p.volume ?? 0;
              if (v <= 0) return null;
              const x = xAtLine(i);
              const h = (v / maxVol) * (volH - 6);
              const barW = Math.max(1, (innerW / points.length) * 0.55);
              return (
                <rect
                  key={`v-${p.t}`}
                  x={x - barW / 2}
                  y={chartH + volH - h}
                  width={barW}
                  height={h}
                  fill={stroke}
                  opacity={0.22}
                />
              );
            })
          : null}

        {hoverI != null ? (
          <g pointerEvents="none">
            <line
              x1={hoverX}
              x2={hoverX}
              y1={padT}
              y2={padT + plotH}
              stroke="var(--paper-muted)"
              strokeOpacity={0.5}
              strokeDasharray="2 3"
            />
            <circle
              cx={hoverX}
              cy={hoverY}
              r={4}
              fill={stroke}
              stroke="var(--ink)"
              strokeWidth={2}
            />
          </g>
        ) : null}

        <text
          x={padL}
          y={chartH - 8}
          fill="var(--paper-muted)"
          fontSize="10"
          fontFamily="var(--font-mono)"
        >
          {formatChartTime(
            useCandles ? candles[0]!.t : points[0]!.t,
            spanMs,
          )}
        </text>
        <text
          x={width - padR}
          y={chartH - 8}
          textAnchor="end"
          fill="var(--paper-muted)"
          fontSize="10"
          fontFamily="var(--font-mono)"
        >
          {formatChartTime(
            useCandles
              ? candles[candles.length - 1]!.t
              : points[points.length - 1]!.t,
            spanMs,
          )}
        </text>
      </svg>

      {segments.length > 1 ? <p className="px-2 py-1 text-[11px] text-warn">{segments.length - 1} data {segments.length === 2 ? "gap" : "gaps"} · Missing intervals are not connected.</p> : null}
      {activePrice != null && activeT != null ? (
        <div className="pointer-events-none absolute left-2 top-2 max-w-[calc(100%-1rem)] rounded-md border border-line/80 bg-ink/90 px-2.5 py-1.5 backdrop-blur-sm">
          <div className="mono text-sm font-medium text-paper">
            {formatUsdSmart(activePrice)}
          </div>
          <div className="mono text-[10px] text-paper-muted">
            {formatChartTime(activeT, spanMs)}
            {activeCandle ? (
              <>
                {" · "}O {formatUsdSmart(activeCandle.o)} · H{" "}
                {formatUsdSmart(activeCandle.h)} · L{" "}
                {formatUsdSmart(activeCandle.l)}
              </>
            ) : null}
            {activePoint?.volume ? (
              <> · Vol {formatCompactUsd(activePoint.volume)}</>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
