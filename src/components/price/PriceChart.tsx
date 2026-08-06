"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import {
  formatChartTime,
  formatCompactUsd,
  formatUsdSmart,
} from "@/lib/format";
import type { OhlcCandle, PricePoint } from "@/lib/price/types";

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
  points,
  candles,
  mode,
  accent,
  positive,
  height = 280,
}: Props) {
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
    [priceExtent, plotH],
  );

  const xAtLine = useCallback(
    (i: number, n: number) =>
      n <= 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW,
    [innerW],
  );

  const xAtCandle = useCallback(
    (i: number, n: number) => padL + ((i + 0.5) / n) * innerW,
    [innerW],
  );

  const linePath = useMemo(() => {
    if (useCandles || points.length < 2) return { line: "", area: "" };
    const n = points.length;
    const d = points
      .map((p, i) => {
        const cmd = i === 0 ? "M" : "L";
        return `${cmd}${xAtLine(i, n).toFixed(2)},${yAt(p.price).toFixed(2)}`;
      })
      .join(" ");
    const area = `${d} L${xAtLine(n - 1, n).toFixed(2)},${(padT + plotH).toFixed(2)} L${xAtLine(0, n).toFixed(2)},${(padT + plotH).toFixed(2)} Z`;
    return { line: d, area };
  }, [useCandles, points, xAtLine, yAt, plotH]);

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
    if (useCandles) {
      const i = Math.max(
        0,
        Math.min(count - 1, Math.floor(((x - padL) / innerW) * count)),
      );
      setHoverI(i);
    } else {
      const t = (x - padL) / innerW;
      setHoverI(Math.max(0, Math.min(count - 1, Math.round(t * (count - 1)))));
    }
  };

  const activeI = hoverI ?? count - 1;
  const activePoint = !useCandles ? points[activeI] : null;
  const activeCandle = useCandles ? candles[activeI] : null;
  const activePrice = activePoint?.price ?? activeCandle?.c ?? null;
  const activeT = activePoint?.t ?? activeCandle?.t ?? null;
  const hoverX = useCandles
    ? xAtCandle(activeI, count)
    : xAtLine(activeI, count);
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

  const candleW = Math.max(2, (innerW / count) * 0.62);

  return (
    <div ref={setWrap} className="relative w-full select-none">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Historical USD price chart"
        className="block w-full touch-none"
        onPointerDown={(e) => {
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
          pickIndex(e.clientX);
        }}
        onPointerMove={(e) => pickIndex(e.clientX)}
        onPointerUp={() => setHoverI(null)}
        onPointerCancel={() => setHoverI(null)}
        onPointerLeave={() => setHoverI(null)}
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
            <path d={linePath.area} fill={`url(#fill-${gid})`} />
            <path
              d={linePath.line}
              fill="none"
              stroke={stroke}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        ) : (
          candles.map((c, i) => {
            const x = xAtCandle(i, count);
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
              const x = xAtLine(i, points.length);
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

      {activePrice != null && activeT != null ? (
        <div className="pointer-events-none absolute left-2 top-2 rounded-md border border-line/80 bg-ink/90 px-2.5 py-1.5 backdrop-blur-sm">
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
