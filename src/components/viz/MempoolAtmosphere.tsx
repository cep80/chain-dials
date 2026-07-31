"use client";

import { useReducedMotion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import {
  formatBtc,
  formatFee,
  formatInteger,
  formatPlainPercent,
  formatSats,
  formatUsd,
} from "@/lib/format";
import { useChainOptional } from "@/lib/chains/context";
import { useDocumentVisible } from "@/lib/use-document-visible";
import { useDashboardStore } from "@/lib/store";
import { useInstrumentStage } from "@/lib/instrument-stage";
import { clamp } from "@/lib/viz-scale";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import type { AtmosphereTx } from "@/types/metrics";

interface Particle {
  txid: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  band: number;
  feeRate: number;
  fee: number;
  vsize: number;
  value: number;
  birth: number;
  pulse: number;
  /** 0..1 draw opacity - fade in/out instead of pop */
  alpha: number;
  /** When set, particle is leaving and will be removed at alpha 0 */
  dying: boolean;
}

/** Ambient density mote from fee histogram - not clickable. */
interface DensityMote {
  x: number;
  y: number;
  vx: number;
  r: number;
  band: number;
  feeRate: number;
  alpha: number;
}

const BAND_COLORS = [
  [168, 161, 149],
  [230, 184, 77],
  [247, 147, 26],
  [255, 92, 92],
] as const;

function rgba(rgb: readonly [number, number, number], a: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
}

function feeBand(
  feeRate: number,
  fees: { fastest: number | null; half: number | null; hour: number | null; economy: number | null },
): number {
  const { fastest, half, hour, economy } = fees;
  if (fastest != null && feeRate >= fastest) return 3;
  if (half != null && feeRate >= half) return 2;
  if (hour != null && feeRate >= hour) return 1;
  if (economy != null && feeRate >= economy) return 0;
  return 0;
}

function altitudeY(
  feeRate: number,
  h: number,
  fees: { fastest: number | null; economy: number | null },
): number {
  const top = fees.fastest ?? Math.max(feeRate, 10);
  const bottom = Math.max(0.1, fees.economy ?? 1);
  const lo = Math.log10(bottom);
  const hi = Math.log10(Math.max(top, bottom * 1.01));
  const t = clamp((Math.log10(Math.max(feeRate, 0.1)) - lo) / (hi - lo || 1), 0, 1);
  return (1 - t) * (h * 0.88) + h * 0.06;
}

function particleRadius(vsize: number, stage: boolean): number {
  const base = stage ? 3.2 : 2.2;
  return clamp(base + Math.log10(Math.max(vsize, 10)) * 1.1, base, stage ? 9 : 6);
}

function shortTx(txid: string): string {
  return `${txid.slice(0, 8)}…${txid.slice(-6)}`;
}

function TxInspector({
  tx,
  priceUsd,
  onClose,
}: {
  tx: AtmosphereTx | Particle;
  priceUsd: number | null;
  onClose: () => void;
}) {
  const chain = useChainOptional();
  const unit = chain?.feeUnit ?? "sat/vB";
  const isBtc = !chain || chain.id === "btc";
  const amount = isBtc ? tx.value / 1e8 : tx.value;
  const usd =
    priceUsd != null && amount > 0 ? amount * priceUsd : null;
  const explorer =
    chain?.explorerTx(tx.txid) ?? `https://mempool.space/tx/${tx.txid}`;
  const canOpen =
    isBtc ||
    tx.txid.startsWith("0x") ||
    (tx.txid.length > 32 && !tx.txid.includes("-"));

  return (
    <div
      className="w-full max-w-3xl rounded-[10px] border border-line/70 bg-ink-elevated/95 px-4 py-3 text-left shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="Transaction details"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-paper-muted">
            A recent tx in the queue
          </p>
          {canOpen ? (
            <a
              href={explorer}
              target="_blank"
              rel="noreferrer"
              className="mono mt-1 block text-sm text-accent hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {shortTx(tx.txid)}
            </a>
          ) : (
            <p className="mono mt-1 text-sm text-paper">{shortTx(tx.txid)}</p>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="mono text-[10px] uppercase tracking-wider text-paper-muted hover:text-paper"
        >
          close
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-paper-muted">
            Fee rate
          </dt>
          <dd className="mono text-sm text-paper">
            {formatFee(tx.feeRate, unit)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-paper-muted">
            Fee
          </dt>
          <dd className="mono text-sm text-paper">
            {isBtc
              ? `${formatSats(tx.fee)} sats`
              : formatFee(tx.fee, unit)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-paper-muted">
            Size
          </dt>
          <dd className="mono text-sm text-paper">
            {isBtc
              ? `${formatInteger(tx.vsize)} vB`
              : `${formatInteger(tx.vsize)} units`}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-paper-muted">
            Value
          </dt>
          <dd className="mono text-sm text-paper">
            {isBtc
              ? formatBtc(amount, 4)
              : `${amount.toFixed(4)} ${chain?.ticker ?? ""}`}
            {usd != null ? (
              <span className="ml-1 text-paper-muted">· {formatUsd(usd, 0)}</span>
            ) : null}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function syncParticles(
  particles: Particle[],
  txs: AtmosphereTx[],
  w: number,
  h: number,
  fees: {
    fastest: number | null;
    half: number | null;
    hour: number | null;
    economy: number | null;
  },
  stage: boolean,
  intensity: number,
): Particle[] {
  const now = Date.now();
  const byId = new Map(particles.map((p) => [p.txid, p]));
  const liveIds = new Set(txs.map((t) => t.txid));

  for (const tx of txs) {
    const prev = byId.get(tx.txid);
    const band = feeBand(tx.feeRate, fees);
    if (prev) {
      prev.feeRate = tx.feeRate;
      prev.fee = tx.fee;
      prev.vsize = tx.vsize;
      prev.value = tx.value;
      prev.band = band;
      prev.r = particleRadius(tx.vsize, stage);
      prev.dying = false;
      if (tx.fresh && now - tx.seenAt < 2_000) {
        prev.pulse = Math.max(prev.pulse, 0.85);
      }
    } else {
      const targetY = altitudeY(tx.feeRate, h, fees);
      // Enter from a side edge so refreshes don't teleport into the middle
      const fromLeft = Math.random() < 0.5;
      particles.push({
        txid: tx.txid,
        x: fromLeft ? -6 : w + 6,
        y: targetY + (Math.random() - 0.5) * 6,
        vx: (fromLeft ? 1 : -1) * (0.2 + intensity * 0.25 + Math.random() * 0.15),
        vy: 0,
        r: particleRadius(tx.vsize, stage),
        band,
        feeRate: tx.feeRate,
        fee: tx.fee,
        vsize: tx.vsize,
        value: tx.value,
        birth: now,
        pulse: tx.fresh ? 0.7 : 0.25,
        alpha: 0,
        dying: false,
      });
    }
  }

  for (const p of particles) {
    if (!liveIds.has(p.txid) && !p.dying) {
      p.dying = true;
      p.pulse = 0;
    }
  }

  return particles;
}

/** Build ambient density from mempool fee_histogram [feeRate, vsize] bins. */
function buildDensity(
  histogram: [number, number][],
  w: number,
  h: number,
  fees: {
    fastest: number | null;
    half: number | null;
    hour: number | null;
    economy: number | null;
  },
  budget: number,
): DensityMote[] {
  if (!histogram.length || budget <= 0 || w <= 0) return [];

  const weights = histogram.map(([, vsize]) => Math.max(0, vsize));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const motes: DensityMote[] = [];

  for (let i = 0; i < histogram.length && motes.length < budget; i++) {
    const [feeRate, vsize] = histogram[i];
    if (!(feeRate > 0) || vsize <= 0) continue;
    // Share of budget proportional to vsize in bin (clamped so tiny bins still show)
    const share = Math.max(1, Math.round((vsize / total) * budget));
    const band = feeBand(feeRate, fees);
    const yBase = altitudeY(feeRate, h, fees);
    for (let n = 0; n < share && motes.length < budget; n++) {
      motes.push({
        x: Math.random() * w,
        y: clamp(yBase + (Math.random() - 0.5) * (h * 0.08), 4, h - 4),
        vx: (Math.random() - 0.5) * 0.18,
        r: 0.7 + Math.random() * 1.1,
        band,
        feeRate,
        alpha: 0.12 + Math.random() * 0.18,
      });
    }
  }

  return motes;
}

export function MempoolAtmosphere({
  large = false,
  compact = false,
  stage = false,
}: {
  large?: boolean;
  compact?: boolean;
  stage?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const densityRef = useRef<DensityMote[]>([]);
  const selectedRef = useRef<string | null>(null);
  const hoverRef = useRef<string | null>(null);
  const feesRef = useRef({
    fastest: null as number | null,
    half: null as number | null,
    hour: null as number | null,
    economy: null as number | null,
  });
  const intensityRef = useRef(0.3);
  const pressurePctRef = useRef<number | null>(null);
  const visibleRef = useRef(true);
  const sampleCountRef = useRef(0);
  const histKeyRef = useRef("");

  const count = useDashboardStore((s) => s.live.mempoolCount);
  const pressure = useDashboardStore((s) => s.live.mempoolVsize);
  const recentTxs = useDashboardStore((s) => s.live.recentTxs);
  const feeHistogram = useDashboardStore((s) => s.live.feeHistogram);
  const feeFastest = useDashboardStore((s) => s.live.feeFastest);
  const feeHalfHour = useDashboardStore((s) => s.live.feeHalfHour);
  const feeHour = useDashboardStore((s) => s.live.feeHour);
  const feeEconomy = useDashboardStore((s) => s.live.feeEconomy);
  const priceUsd = useDashboardStore((s) => s.live.priceUsd);
  const boardPulse = useDashboardStore((s) => s.boardPulse);
  const connection = useDashboardStore((s) => s.connection);
  const chain = useChainOptional();
  const reduce = useReducedMotion();
  const visible = useDocumentVisible();
  const stageOpen = useInstrumentStage((s) => s.active);
  const openStage = useInstrumentStage((s) => s.open);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [sampleLabel, setSampleLabel] = useState(0);
  const [blockFlash, setBlockFlash] = useState(0);

  const pressurePct = pressure != null ? (pressure / 1_000_000) * 100 : null;
  const intensity = clamp((pressurePct ?? 40) / 200, 0.15, 1);
  const pausedByStage = !stage && stageOpen === "atmosphere";
  const sampleStale = connection === "degraded" || connection === "disconnected";

  feesRef.current = {
    fastest: feeFastest,
    half: feeHalfHour,
    hour: feeHour,
    economy: feeEconomy,
  };
  intensityRef.current = intensity;
  pressurePctRef.current = pressurePct;
  visibleRef.current = visible && !pausedByStage;
  selectedRef.current = selectedId;
  hoverRef.current = hoverId;

  // Block-found exhale - mist + sample flash with the rest of the Observatory
  useEffect(() => {
    if (boardPulse <= 0 || reduce) return;
    setBlockFlash(boardPulse);
    for (const p of particlesRef.current) {
      if (!p.dying) p.pulse = 1;
    }
    for (const m of densityRef.current) {
      m.alpha = Math.min(0.45, m.alpha + 0.2);
    }
    const t = window.setTimeout(() => setBlockFlash(0), 750);
    return () => window.clearTimeout(t);
  }, [boardPulse, reduce]);

  // Soft-sync clickable particles when the recent-tx sample changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const w = canvas?.clientWidth || 320;
    const h = canvas?.clientHeight || 140;
    syncParticles(
      particlesRef.current,
      recentTxs,
      w,
      h,
      feesRef.current,
      stage,
      intensityRef.current,
    );

    const alive = particlesRef.current.filter((p) => !p.dying).length;
    if (alive !== sampleCountRef.current) {
      sampleCountRef.current = alive;
      setSampleLabel(alive);
    }

    if (selectedId && !recentTxs.some((t) => t.txid === selectedId)) {
      const still = particlesRef.current.find(
        (p) => p.txid === selectedId && !p.dying && p.alpha > 0.2,
      );
      if (!still) setSelectedId(null);
    }
  }, [recentTxs, stage, selectedId]);

  // Rebuild ambient density when fee histogram shape changes (not every frame)
  useEffect(() => {
    const canvas = canvasRef.current;
    const w = canvas?.clientWidth || 320;
    const h = canvas?.clientHeight || 140;
    const key = feeHistogram
      .slice(0, 24)
      .map(([r, v]) => `${r.toFixed(2)}:${Math.round(v / 1000)}`)
      .join("|");
    if (key === histKeyRef.current && densityRef.current.length) return;
    histKeyRef.current = key;
    const budget = reduce
      ? 0
      : Math.round(clamp(40 + intensity * 100, 40, stage ? 180 : 120));
    densityRef.current = buildDensity(
      feeHistogram,
      w,
      h,
      feesRef.current,
      budget,
    );
  }, [feeHistogram, intensity, reduce, stage]);

  // Canvas loop - stable deps only. Pressure/visibility live in refs so polls
  // don't clear the bitmap (that was the refresh flicker).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let lastW = 0;
    let lastH = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const nextW = Math.max(1, Math.floor(rect.width * dpr));
      const nextH = Math.max(1, Math.floor(rect.height * dpr));
      // Avoid clearing the canvas when size is unchanged
      if (nextW === lastW && nextH === lastH) return;
      lastW = nextW;
      lastH = nextH;
      canvas.width = nextW;
      canvas.height = nextH;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const drawBands = (w: number, h: number) => {
      for (let i = 0; i < 4; i++) {
        const y0 = (i / 4) * h;
        ctx.fillStyle =
          i === 0
            ? "rgba(255,92,92,0.06)"
            : i === 1
              ? "rgba(247,147,26,0.05)"
              : i === 2
                ? "rgba(230,184,77,0.04)"
                : "rgba(168,161,149,0.03)";
        ctx.fillRect(0, y0, w, h / 4);
        ctx.strokeStyle = "rgba(42,49,64,0.45)";
        ctx.beginPath();
        ctx.moveTo(0, y0);
        ctx.lineTo(w, y0);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(247,147,26,0.45)";
      ctx.font = "9px var(--font-mono), ui-monospace, monospace";
      ctx.fillText("high fee ↑", 8, 14);
      ctx.fillStyle = "rgba(168,161,149,0.55)";
      ctx.fillText("low fee ↓", 8, h - 8);
    };

    const drawParticle = (p: Particle, selected: boolean, hover: boolean) => {
      if (p.alpha <= 0.01) return;
      const rgb = BAND_COLORS[p.band];
      const glow = selected || hover || p.pulse > 0.2;
      if (glow) {
        ctx.beginPath();
        ctx.fillStyle = rgba(rgb, 0.22 * p.alpha);
        ctx.arc(p.x, p.y, p.r + 3 + p.pulse * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.fillStyle = rgba(rgb, (selected ? 0.95 : 0.78) * p.alpha);
      ctx.arc(p.x, p.y, selected ? p.r + 1.5 : p.r, 0, Math.PI * 2);
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = rgba([247, 147, 26], 0.9 * p.alpha);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    };

    const tick = () => {
      if (!visibleRef.current) {
        // Park the loop while hidden / stage twin is showing - resume via visibility listener
        return;
      }
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      drawBands(w, h);

      const fees = feesRef.current;
      const selected = selectedRef.current;
      const hover = hoverRef.current;
      const drift = 0.12 + intensityRef.current * 0.35;
      const list = particlesRef.current;
      const mist = densityRef.current;

      // Ambient fee-histogram density (whole mempool shape - not clickable)
      for (const m of mist) {
        m.x += m.vx;
        if (m.x < -4) m.x = w + 4;
        if (m.x > w + 4) m.x = -4;
        const ty = altitudeY(m.feeRate, h, fees);
        m.y += (ty - m.y) * 0.02;
        m.alpha = Math.max(0.1, m.alpha - 0.001);
        ctx.beginPath();
        ctx.fillStyle = rgba(BAND_COLORS[m.band], m.alpha);
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        if (p.dying) {
          p.alpha = Math.max(0, p.alpha - 0.035);
          if (p.alpha <= 0) {
            list.splice(i, 1);
            continue;
          }
        } else if (p.alpha < 1) {
          p.alpha = Math.min(1, p.alpha + 0.05);
        }

        const targetY = altitudeY(p.feeRate, h, fees);
        p.x += p.vx;
        p.y += (targetY - p.y) * 0.035 + p.vy;
        p.vy *= 0.9;
        p.vx += (Math.random() - 0.5) * 0.015;
        p.vx = clamp(p.vx, -drift, drift);
        p.pulse = Math.max(0, p.pulse - 0.012);
        if (p.x < -8) p.x = w + 8;
        if (p.x > w + 8) p.x = -8;
        p.y = clamp(p.y, 4, h - 4);
        p.band = feeBand(p.feeRate, fees);
      }

      for (const p of list) {
        if (p.txid === selected || p.txid === hover) continue;
        drawParticle(p, false, false);
      }
      for (const p of list) {
        if (p.txid === selected || p.txid === hover) {
          drawParticle(p, p.txid === selected, p.txid === hover);
        }
      }

      const pressureNow = pressurePctRef.current;
      if (pressureNow != null && pressureNow > 100) {
        ctx.strokeStyle = "rgba(230,184,77,0.45)";
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, w - 2, h - 2);
      }

      if (list.length === 0 && mist.length === 0) {
        ctx.fillStyle = "rgba(168,161,149,0.7)";
        ctx.font = "11px var(--font-mono), ui-monospace, monospace";
        ctx.fillText("Still fetching the queue…", 12, h / 2);
      }

      raf = requestAnimationFrame(tick);
    };

    const kick = () => {
      cancelAnimationFrame(raf);
      if (!reduce && visibleRef.current) {
        raf = requestAnimationFrame(tick);
      }
    };

    const onVis = () => {
      if (document.visibilityState === "visible") kick();
    };

    document.addEventListener("visibilitychange", onVis);

    const drawStatic = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      drawBands(w, h);
      for (const m of densityRef.current) {
        ctx.beginPath();
        ctx.fillStyle = rgba(BAND_COLORS[m.band], m.alpha);
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const p of particlesRef.current) {
        drawParticle(p, p.txid === selectedRef.current, false);
      }
    };

    if (reduce) {
      drawStatic();
    } else {
      kick();
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduce, pausedByStage]);

  // Resume loop when tab / stage pause flips back on
  useEffect(() => {
    visibleRef.current = visible && !pausedByStage;
  }, [visible, pausedByStage]);

  const hitTest = useCallback((clientX: number, clientY: number): Particle | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.clientWidth / (rect.width || 1);
    const scaleY = canvas.clientHeight / (rect.height || 1);
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    let best: Particle | null = null;
    let bestDist = Infinity;
    const hitPad = stage ? 28 : 16;
    for (const p of particlesRef.current) {
      if (p.dying || p.alpha < 0.35) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < p.r + hitPad && d < bestDist) {
        best = p;
        bestDist = d;
      }
    }
    return best;
  }, [stage]);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (compact) return;
      const hit = hitTest(e.clientX, e.clientY);
      const id = hit?.txid ?? null;
      setHoverId((prev) => (prev === id ? prev : id));
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = hit ? "pointer" : stage ? "default" : "zoom-in";
    },
    [compact, hitTest, stage],
  );

  const onPointerLeave = useCallback(() => {
    setHoverId(null);
  }, []);

  const onClick = useCallback(
    (e: MouseEvent) => {
      if (compact) return;
      const hit = hitTest(e.clientX, e.clientY);
      if (hit) {
        e.stopPropagation();
        setSelectedId(hit.txid);
        return;
      }
      // Empty canvas: stage clears selection; board lets InstrumentFrame open stage
      if (stage) {
        e.stopPropagation();
        setSelectedId(null);
      } else {
        openStage("atmosphere");
      }
    },
    [compact, hitTest, stage, openStage],
  );

  const selected =
    selectedId != null
      ? recentTxs.find((t) => t.txid === selectedId) ??
        particlesRef.current.find((p) => p.txid === selectedId) ??
        null
      : null;

  const sampleN = sampleLabel || recentTxs.length;
  const pendingLabel = count != null ? formatInteger(count) : null;
  const aria = `Mempool atmosphere. ${pendingLabel ?? "Unknown"} transactions waiting. Mist shows fee density. ${sampleN} recent transactions are clickable. Empty area opens a bigger view.`;

  const body = (
    <div
      className={`relative w-full overflow-hidden rounded-[10px] border border-line/60 bg-ink ${
        stage
          ? "h-[min(52vh,440px)] max-w-3xl"
          : large
            ? "h-[200px]"
            : compact
              ? "h-[72px]"
              : "h-[140px]"
      }`}
      role="img"
      aria-label={aria}
      onClick={onClick}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <canvas ref={canvasRef} className="h-full w-full touch-none" />
      {!compact ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2">
          <p className="mono text-[9px] uppercase tracking-wider text-paper-muted/80">
            Mist = who’s paying · Dots = recent txs
          </p>
          <p className="mono text-[9px] uppercase tracking-wider text-paper-muted/80">
            {pendingLabel ? `${pendingLabel} waiting` : "waiting…"}
            {sampleN > 0 ? ` · ${sampleN} clickable` : ""}
            {sampleStale ? " · a bit stale" : ""}
          </p>
        </div>
      ) : null}
      {!reduce && blockFlash > 0 ? (
        <div
          key={blockFlash}
          className="pointer-events-none absolute inset-0 border-2 border-accent/80 opacity-80"
        />
      ) : null}
    </div>
  );

  if (compact) return body;

  if (stage) {
    return (
      <div className="flex w-full flex-col items-center gap-5">
        {body}
        {selected ? (
          <TxInspector
            tx={selected}
            priceUsd={priceUsd}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <p className="max-w-md text-center text-sm text-paper-muted">
            Mist is the mempool by fee rate. Bright dots are recent samples.
            Select one for detail; empty space clears the selection.
          </p>
        )}
        <p className="mono text-4xl font-medium text-paper md:text-6xl">
          {pendingLabel ?? "-"}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          waiting in the mempool
          {pressurePct != null ? ` · ${formatPlainPercent(pressurePct, 0)} pressure` : ""}
          {sampleN ? ` · ${sampleN} samples` : ""}
        </p>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title={chain?.instruments.atmosphere.frameTitle ?? "Atmosphere"}
      subtitle={
        chain?.instruments.atmosphere.subtitle ??
        "Mist = queue · dots = select · empty = expand"
      }
      reading={count != null ? `${formatInteger(count)} tx` : "-"}
      large={large}
      instrumentId="atmosphere"
    >
      <div className="flex w-full flex-col gap-3">
        {body}
        {selected ? (
          <TxInspector
            tx={selected}
            priceUsd={priceUsd}
            onClose={() => setSelectedId(null)}
          />
        ) : null}
      </div>
    </InstrumentFrame>
  );
}
