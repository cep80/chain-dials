"use client";

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
import {
  altitudeY,
  buildHistLayers,
  feeBand,
  pressureBlocks,
  type FeeLadder,
  type HistLayer,
} from "@/lib/atmosphere-math";
import { useChainOptional } from "@/lib/chains/context";
import { useDocumentVisible } from "@/lib/use-document-visible";
import { useDashboardStore } from "@/lib/store";
import { useInstrumentStage } from "@/lib/instrument-stage";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import { clamp, densityMoteBudget } from "@/lib/viz-scale";
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
  alpha: number;
  dying: boolean;
  trail: { x: number; y: number }[];
}

/** Ambient density mote from fee histogram - not clickable. */
interface DensityMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
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

const TRAIL_LEN = 7;

function rgba(rgb: readonly [number, number, number], a: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
}

function particleRadius(vsize: number, stage: boolean): number {
  const base = stage ? 4.4 : 2.2;
  return clamp(
    base + Math.log10(Math.max(vsize, 10)) * (stage ? 1.45 : 1.1),
    base,
    stage ? 14 : 6,
  );
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
  const usd = priceUsd != null && amount > 0 ? amount * priceUsd : null;
  const explorer =
    chain?.explorerTx(tx.txid) ?? `https://mempool.space/tx/${tx.txid}`;
  const canOpen =
    isBtc ||
    tx.txid.startsWith("0x") ||
    (tx.txid.length > 32 && !tx.txid.includes("-"));

  return (
    <div
      className="w-full max-w-3xl rounded-[10px] border border-line/70 bg-ink-elevated/95 px-4 py-3 text-left"
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
            {isBtc ? `${formatSats(tx.fee)} sats` : formatFee(tx.fee, unit)}
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
  fees: FeeLadder,
  stage: boolean,
  intensity: number,
): void {
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
        prev.pulse = Math.max(prev.pulse, 0.9);
      }
    } else {
      const targetY = altitudeY(tx.feeRate, h, fees);
      const fromLeft = Math.random() < 0.5;
      particles.push({
        txid: tx.txid,
        x: fromLeft ? -8 : w + 8,
        y: targetY + (Math.random() - 0.5) * 8,
        vx: (fromLeft ? 1 : -1) * (0.22 + intensity * 0.28 + Math.random() * 0.18),
        vy: 0,
        r: particleRadius(tx.vsize, stage),
        band,
        feeRate: tx.feeRate,
        fee: tx.fee,
        vsize: tx.vsize,
        value: tx.value,
        birth: now,
        pulse: tx.fresh ? 0.85 : 0.3,
        alpha: 0,
        dying: false,
        trail: [],
      });
    }
  }

  for (const p of particles) {
    if (!liveIds.has(p.txid) && !p.dying) {
      // Left the live tip sample (or mined) - fade out this frame cycle
      p.dying = true;
      p.pulse = 0;
      p.vy -= stage ? 0.8 : 0.35;
    }
  }
}

function buildDensity(
  histogram: [number, number][],
  w: number,
  h: number,
  fees: FeeLadder,
  budget: number,
): DensityMote[] {
  if (!histogram.length || budget <= 0 || w <= 0) return [];

  const weights = histogram.map(([, vsize]) => Math.max(0, vsize));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const motes: DensityMote[] = [];

  for (let i = 0; i < histogram.length && motes.length < budget; i++) {
    const [feeRate, vsize] = histogram[i]!;
    if (!(feeRate > 0) || vsize <= 0) continue;
    const share = Math.max(1, Math.round((vsize / total) * budget));
    const band = feeBand(feeRate, fees);
    const yBase = altitudeY(feeRate, h, fees);
    for (let n = 0; n < share && motes.length < budget; n++) {
      motes.push({
        x: Math.random() * w,
        y: clamp(yBase + (Math.random() - 0.5) * (h * 0.1), 4, h - 4),
        vx: (Math.random() - 0.5) * 0.22,
        vy: 0,
        r: 0.6 + Math.random() * (band >= 2 ? 1.6 : 1.2),
        band,
        feeRate,
        alpha: 0.1 + Math.random() * 0.22,
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
  const layersRef = useRef<HistLayer[]>([]);
  const selectedRef = useRef<string | null>(null);
  const hoverRef = useRef<string | null>(null);
  const feesRef = useRef<FeeLadder>({
    fastest: null,
    half: null,
    hour: null,
    economy: null,
  });
  const intensityRef = useRef(0.3);
  const pressurePctRef = useRef<number | null>(null);
  const clearBreathRef = useRef(0);
  const feeUnitRef = useRef("sat/vB");
  const visibleRef = useRef(true);
  const sampleCountRef = useRef(0);
  const histKeyRef = useRef("");
  const stageRef = useRef(stage);

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
  const reduce = useAppReducedMotion();
  const visible = useDocumentVisible();
  const stageOpen = useInstrumentStage((s) => s.active);
  const openStage = useInstrumentStage((s) => s.open);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [sampleLabel, setSampleLabel] = useState(0);
  const [blockFlash, setBlockFlash] = useState(0);

  const blocksWaiting = pressureBlocks(pressure);
  const pressurePct = blocksWaiting != null ? blocksWaiting * 100 : null;
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
  feeUnitRef.current = chain?.feeUnit ?? "sat/vB";
  stageRef.current = stage;

  useEffect(() => {
    if (boardPulse <= 0 || reduce) return;
    setBlockFlash(boardPulse);
    clearBreathRef.current = 1;
    for (const p of particlesRef.current) {
      if (!p.dying) {
        p.pulse = 1;
        p.vy -= 1.2;
      }
    }
    for (const m of densityRef.current) {
      m.vy = -1.8 - Math.random() * 1.4;
      m.alpha = Math.min(0.55, m.alpha + 0.25);
    }
    const t = window.setTimeout(() => setBlockFlash(0), 900);
    return () => window.clearTimeout(t);
  }, [boardPulse, reduce]);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    const w = canvas?.clientWidth || 320;
    const h = canvas?.clientHeight || 140;
    const key = feeHistogram
      .slice(0, 32)
      .map(([r, v]) => `${r.toFixed(2)}:${Math.round(v / 1000)}`)
      .join("|");
    if (key === histKeyRef.current && densityRef.current.length) {
      layersRef.current = buildHistLayers(feeHistogram, feesRef.current);
      return;
    }
    histKeyRef.current = key;
    layersRef.current = buildHistLayers(feeHistogram, feesRef.current);
    const budget = densityMoteBudget({
      intensity,
      stage,
      reduceMotion: reduce,
    });
    densityRef.current = buildDensity(
      feeHistogram,
      w,
      h,
      feesRef.current,
      budget,
    );
  }, [feeHistogram, intensity, reduce, stage]);

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

    const drawSky = (w: number, h: number, intensityNow: number) => {
      ctx.fillStyle = "rgba(8,10,14,1)";
      ctx.fillRect(0, 0, w, h);

      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, `rgba(255,92,92,${0.1 + intensityNow * 0.06})`);
      sky.addColorStop(0.28, `rgba(247,147,26,${0.08 + intensityNow * 0.05})`);
      sky.addColorStop(0.58, "rgba(230,184,77,0.045)");
      sky.addColorStop(1, "rgba(10,12,16,0.55)");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Upper thermosphere bloom (high-fee weather)
      const bloom = ctx.createRadialGradient(
        w * 0.5,
        h * 0.08,
        0,
        w * 0.5,
        h * 0.08,
        w * (stageRef.current ? 0.62 : 0.5),
      );
      bloom.addColorStop(0, `rgba(247,147,26,${0.1 + intensityNow * 0.08})`);
      bloom.addColorStop(0.55, "rgba(255,92,92,0.03)");
      bloom.addColorStop(1, "rgba(247,147,26,0)");
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, w, h);
    };

    const drawVolumetricMist = (
      w: number,
      h: number,
      fees: FeeLadder,
      intensityNow: number,
      breath: number,
    ) => {
      const layers = layersRef.current;
      if (!layers.length) return;
      const stageOn = stageRef.current;

      for (const layer of layers) {
        const y = altitudeY(layer.feeRate, h, fees);
        const lift = breath * (stageOn ? 28 : 14);
        const yy = y - lift;
        const thickness =
          (stageOn ? 36 : 18) * layer.weight + (stageOn ? 14 : 8);
        const amp =
          layer.weight *
          (0.14 + intensityNow * 0.22) *
          (stageOn ? 1.15 : 1) *
          (1 - breath * 0.35);
        const rgb = BAND_COLORS[layer.band]!;

        // Soft horizontal cloud band (vsize → thickness + opacity)
        const bandGrad = ctx.createLinearGradient(
          0,
          yy - thickness,
          0,
          yy + thickness,
        );
        bandGrad.addColorStop(0, rgba(rgb, 0));
        bandGrad.addColorStop(0.45, rgba(rgb, amp));
        bandGrad.addColorStop(0.55, rgba(rgb, amp * 0.9));
        bandGrad.addColorStop(1, rgba(rgb, 0));
        ctx.fillStyle = bandGrad;
        ctx.fillRect(0, yy - thickness, w, thickness * 2);

        // Lateral density pockets so bands feel like weather, not flat fog
        if (stageOn && layer.weight > 0.2) {
          const pockets = 2 + Math.floor(layer.weight * 3);
          for (let i = 0; i < pockets; i++) {
            const cx =
              ((layer.feeRate * 17 + i * 97) % 1000) / 1000 * w * 0.85 +
              w * 0.08;
            const g = ctx.createRadialGradient(
              cx,
              yy,
              0,
              cx,
              yy,
              thickness * 2.2,
            );
            g.addColorStop(0, rgba(rgb, amp * 0.55));
            g.addColorStop(1, rgba(rgb, 0));
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(
              cx,
              yy,
              thickness * 2.8,
              thickness * 0.85,
              0,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
      }
    };

    const drawIsobars = (w: number, h: number, fees: FeeLadder) => {
      if (!stageRef.current) return;
      const unit = feeUnitRef.current;
      const marks: { rate: number | null; label: string; rgb: readonly [number, number, number] }[] = [
        { rate: fees.fastest, label: "next block", rgb: BAND_COLORS[3]! },
        { rate: fees.half, label: "~30m", rgb: BAND_COLORS[2]! },
        { rate: fees.hour, label: "~1h", rgb: BAND_COLORS[1]! },
        { rate: fees.economy, label: "economy", rgb: BAND_COLORS[0]! },
      ];
      ctx.font = "10px var(--font-mono), ui-monospace, monospace";
      for (const m of marks) {
        if (m.rate == null || !(m.rate > 0)) continue;
        const y = altitudeY(m.rate, h, fees);
        ctx.strokeStyle = rgba(m.rgb, 0.28);
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        ctx.setLineDash([]);
        const tag = `${formatFee(m.rate, unit)} · ${m.label}`;
        const tw = ctx.measureText(tag).width;
        ctx.fillStyle = "rgba(10,12,16,0.55)";
        ctx.fillRect(w - tw - 16, y - 8, tw + 10, 14);
        ctx.fillStyle = rgba(m.rgb, 0.85);
        ctx.fillText(tag, w - tw - 11, y + 3);
      }
    };

    const drawParticle = (p: Particle, selected: boolean, hover: boolean) => {
      if (p.alpha <= 0.01) return;
      const rgb = BAND_COLORS[p.band]!;
      const glow = selected || hover || p.pulse > 0.15;

      // Motion trail (recent path at this fee altitude)
      if (p.trail.length > 1) {
        for (let i = 0; i < p.trail.length - 1; i++) {
          const a = p.trail[i]!;
          const b = p.trail[i + 1]!;
          const t = (i + 1) / p.trail.length;
          ctx.strokeStyle = rgba(rgb, 0.12 * t * p.alpha);
          ctx.lineWidth = Math.max(0.6, p.r * 0.35 * t);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      if (glow) {
        const g = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          p.r + 10 + p.pulse * 10,
        );
        g.addColorStop(0, rgba(rgb, 0.5 * p.alpha));
        g.addColorStop(0.4, rgba(rgb, 0.2 * p.alpha));
        g.addColorStop(1, rgba(rgb, 0));
        ctx.beginPath();
        ctx.fillStyle = g;
        ctx.arc(p.x, p.y, p.r + 10 + p.pulse * 10, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.fillStyle = rgba(rgb, 0.18 * p.alpha);
        ctx.arc(p.x, p.y, p.r + 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.fillStyle = rgba(rgb, (selected ? 0.98 : 0.88) * p.alpha);
      ctx.arc(p.x, p.y, selected ? p.r + 1.8 : p.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = rgba([255, 248, 235], 0.32 * p.alpha);
      ctx.arc(
        p.x - p.r * 0.25,
        p.y - p.r * 0.28,
        Math.max(0.8, p.r * 0.35),
        0,
        Math.PI * 2,
      );
      ctx.fill();

      if (selected || hover) {
        ctx.strokeStyle = rgba([247, 147, 26], (selected ? 0.95 : 0.55) * p.alpha);
        ctx.lineWidth = selected ? 2 : 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (selected && stageRef.current) {
        const label = formatFee(p.feeRate, feeUnitRef.current);
        ctx.font = "11px var(--font-mono), ui-monospace, monospace";
        const tw = ctx.measureText(label).width;
        const lx = clamp(p.x - tw / 2, 6, canvas.clientWidth - tw - 6);
        const ly = Math.max(16, p.y - p.r - 14);
        ctx.fillStyle = "rgba(10,12,16,0.72)";
        ctx.fillRect(lx - 4, ly - 10, tw + 8, 14);
        ctx.fillStyle = rgba([247, 147, 26], 0.95);
        ctx.fillText(label, lx, ly);
      }
    };

    const drawChrome = (w: number, h: number) => {
      if (stageRef.current) {
        ctx.fillStyle = "rgba(247,147,26,0.7)";
        ctx.font = "10px var(--font-mono), ui-monospace, monospace";
        ctx.fillText("HIGH FEE", 10, 16);
        ctx.fillStyle = "rgba(168,161,149,0.65)";
        ctx.fillText("LOW FEE", 10, h - 10);
      } else {
        ctx.fillStyle = "rgba(247,147,26,0.55)";
        ctx.font = "9px var(--font-mono), ui-monospace, monospace";
        ctx.fillText("high fee ↑", 8, 14);
        ctx.fillStyle = "rgba(168,161,149,0.6)";
        ctx.fillText("low fee ↓", 8, h - 8);
      }

      // Vignette for TV depth
      const vig = ctx.createRadialGradient(
        w * 0.5,
        h * 0.45,
        h * 0.2,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.72,
      );
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    };

    const tick = () => {
      if (!visibleRef.current) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const fees = feesRef.current;
      const intensityNow = intensityRef.current;
      const breath = clearBreathRef.current;
      if (breath > 0.002) {
        clearBreathRef.current = breath * 0.9;
      } else {
        clearBreathRef.current = 0;
      }

      ctx.clearRect(0, 0, w, h);
      drawSky(w, h, intensityNow);
      drawVolumetricMist(w, h, fees, intensityNow, clearBreathRef.current);
      drawIsobars(w, h, fees);

      const selected = selectedRef.current;
      const hover = hoverRef.current;
      const drift = 0.14 + intensityNow * 0.4;
      const list = particlesRef.current;
      const mist = densityRef.current;

      for (const m of mist) {
        m.x += m.vx;
        m.y += m.vy;
        m.vy *= 0.92;
        if (m.x < -4) m.x = w + 4;
        if (m.x > w + 4) m.x = -4;
        const ty = altitudeY(m.feeRate, h, fees) - clearBreathRef.current * 20;
        m.y += (ty - m.y) * 0.025;
        m.alpha = Math.max(0.08, m.alpha - 0.0008);
        if (m.y < -10) m.y = h + 4;
        ctx.beginPath();
        ctx.fillStyle = rgba(BAND_COLORS[m.band]!, m.alpha);
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i]!;
        if (p.dying) {
          p.alpha = Math.max(0, p.alpha - 0.04);
          if (p.alpha <= 0) {
            list.splice(i, 1);
            continue;
          }
        } else if (p.alpha < 1) {
          p.alpha = Math.min(1, p.alpha + 0.055);
        }

        const targetY =
          altitudeY(p.feeRate, h, fees) - clearBreathRef.current * 24;
        p.x += p.vx;
        p.y += (targetY - p.y) * 0.04 + p.vy;
        p.vy *= 0.88;
        p.vx += (Math.random() - 0.5) * 0.018;
        p.vx = clamp(p.vx, -drift, drift);
        p.pulse = Math.max(0, p.pulse - 0.014);
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        p.y = clamp(p.y, 4, h - 4);
        p.band = feeBand(p.feeRate, fees);

        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > TRAIL_LEN) p.trail.shift();
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

      // Congestion frame when > ~1 block of vsize waiting
      const pressureNow = pressurePctRef.current;
      if (pressureNow != null && pressureNow > 100) {
        const heat = clamp((pressureNow - 100) / 200, 0, 1);
        ctx.strokeStyle = rgba([230, 184, 77], 0.35 + heat * 0.35);
        ctx.lineWidth = 2 + heat;
        ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
      }

      // Block-clear light wash
      if (clearBreathRef.current > 0.05) {
        const wash = ctx.createLinearGradient(0, 0, 0, h);
        wash.addColorStop(
          0,
          `rgba(247,147,26,${0.18 * clearBreathRef.current})`,
        );
        wash.addColorStop(0.45, `rgba(255,248,235,${0.06 * clearBreathRef.current})`);
        wash.addColorStop(1, "rgba(247,147,26,0)");
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, w, h);
      }

      drawChrome(w, h);

      if (list.length === 0 && mist.length === 0 && !layersRef.current.length) {
        ctx.fillStyle = "rgba(168,161,149,0.75)";
        ctx.font = "12px var(--font-mono), ui-monospace, monospace";
        ctx.fillText("Still fetching the queue…", 14, h / 2);
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
      const fees = feesRef.current;
      ctx.clearRect(0, 0, w, h);
      drawSky(w, h, intensityRef.current);
      drawVolumetricMist(w, h, fees, intensityRef.current, 0);
      drawIsobars(w, h, fees);
      for (const m of densityRef.current) {
        ctx.beginPath();
        ctx.fillStyle = rgba(BAND_COLORS[m.band]!, m.alpha);
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const p of particlesRef.current) {
        drawParticle(p, p.txid === selectedRef.current, false);
      }
      drawChrome(w, h);
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

  useEffect(() => {
    visibleRef.current = visible && !pausedByStage;
  }, [visible, pausedByStage]);

  const hitTest = useCallback(
    (clientX: number, clientY: number): Particle | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.clientWidth / (rect.width || 1);
      const scaleY = canvas.clientHeight / (rect.height || 1);
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;
      let best: Particle | null = null;
      let bestDist = Infinity;
      const hitPad = stage ? 30 : 16;
      for (const p of particlesRef.current) {
        if (p.dying || p.alpha < 0.35) continue;
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < p.r + hitPad && d < bestDist) {
          best = p;
          bestDist = d;
        }
      }
      return best;
    },
    [stage],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (compact) return;
      const hit = hitTest(e.clientX, e.clientY);
      const id = hit?.txid ?? null;
      setHoverId((prev) => (prev === id ? prev : id));
      const canvas = canvasRef.current;
      if (canvas)
        canvas.style.cursor = hit ? "pointer" : stage ? "default" : "zoom-in";
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
      ? (recentTxs.find((t) => t.txid === selectedId) ??
        particlesRef.current.find((p) => p.txid === selectedId) ??
        null)
      : null;

  const sampleN = sampleLabel || recentTxs.length;
  const pendingLabel = count != null ? formatInteger(count) : null;
  const aria = `Mempool atmosphere. ${pendingLabel ?? "Unknown"} transactions waiting. Mist shows fee density by vsize. ${sampleN} recent transactions are clickable. Empty area opens a bigger view.`;

  const body = (
    <div
      className={`relative w-full overflow-hidden rounded-[10px] border border-line/60 bg-ink ${
        stage
          ? "h-[min(68vh,720px)] max-w-[min(96vw,1100px)] rounded-[14px]"
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
            Mist = fee vsize · Dots = recent samples
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
      <div className="flex w-full flex-col items-center gap-6">
        {body}
        {selected ? (
          <TxInspector
            tx={selected}
            priceUsd={priceUsd}
            onClose={() => setSelectedId(null)}
          />
        ) : null}
        <p className="instrument-stage-reading mono text-5xl font-medium text-paper md:text-7xl">
          {pendingLabel ?? "-"}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          waiting in the mempool
          {blocksWaiting != null
            ? ` · ${blocksWaiting < 10 ? blocksWaiting.toFixed(2) : formatInteger(blocksWaiting)} blocks of vsize`
            : ""}
          {pressurePct != null
            ? ` · ${formatPlainPercent(pressurePct, 0)} pressure`
            : ""}
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
