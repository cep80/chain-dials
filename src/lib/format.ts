const BTC = 100_000_000;

export function formatUsd(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}

export function formatCompactUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return formatUsd(n, 0);
}

export function formatInteger(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export function formatBtc(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(n)} BTC`;
}

export function formatSats(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return formatInteger(n);
}

export function formatPercent(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function formatPlainPercent(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function formatHashrate(hps: number | null | undefined): string {
  if (hps == null || !Number.isFinite(hps)) return "—";
  const eh = hps / 1e18;
  if (eh >= 1) return `${eh.toFixed(1)} EH/s`;
  const ph = hps / 1e15;
  return `${ph.toFixed(1)} PH/s`;
}

export function formatDifficulty(d: number | null | undefined): string {
  if (d == null || !Number.isFinite(d)) return "—";
  const t = d / 1e12;
  return `${t.toFixed(1)}×10¹²`;
}

export function formatVsize(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} MB`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)} KB`;
  return `${Math.round(v)} vB`;
}

export function formatFee(satVb: number | null | undefined): string {
  if (satVb == null || !Number.isFinite(satVb)) return "—";
  const digits = Number.isInteger(satVb) ? 0 : satVb < 10 ? 3 : 1;
  return `${satVb.toFixed(digits)} sat/vB`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function formatDate(ts: number | null | undefined): string {
  if (ts == null || !Number.isFinite(ts)) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ts));
}

export function formatHash(hash: string | null | undefined): string {
  if (!hash) return "—";
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-6)}`;
}

export function formatRelativeAge(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "waiting…";
  const sec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function satsPerDollar(priceUsd: number | null | undefined): number | null {
  if (priceUsd == null || priceUsd <= 0) return null;
  return Math.round(BTC / priceUsd);
}

export { BTC };
