import type { ChainId } from "@/lib/chains/types";
import { walletAddressKey } from "@/lib/wallet/watch";

export interface VisitReading {
  at: number;
  fee: number | null;
  pending: number | null;
  price: number | null;
  regime: string | null;
  wallets: Array<{ address: string; label: string; balance: number; at: number }>;
}
export interface VisitChange { id: string; title: string; detail: string; href: string }

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
export function parseVisitReading(raw: unknown, nowMs = Date.now()): VisitReading | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (!finite(value.at) || value.at <= 0 || value.at > nowMs + 300_000) return null;
  const wallets: VisitReading["wallets"] = [];
  if (Array.isArray(value.wallets)) for (const row of value.wallets.slice(0, 12)) {
    if (!row || typeof row !== "object") continue;
    if (typeof row.address === "string" && row.address.length <= 100 && finite(row.balance) && finite(row.at) && row.at <= nowMs + 300_000) wallets.push({ address: row.address, label: typeof row.label === "string" ? row.label.slice(0, 40) : "", balance: row.balance, at: row.at });
  }
  return { at: value.at, fee: finite(value.fee) ? value.fee : null, pending: finite(value.pending) ? value.pending : null, price: finite(value.price) ? value.price : null, regime: typeof value.regime === "string" && /^[a-z_]{1,40}$/.test(value.regime) ? value.regime : null, wallets };
}

export function compareVisits(previous: VisitReading, current: VisitReading, chainId: ChainId, feeUnit: string, ticker: string): VisitChange[] {
  const changes: VisitChange[] = [];
  const numeric = (id: string, before: number | null, after: number | null, threshold: number, title: string, href: string, unit: string) => {
    if (before == null || after == null || before < 0 || !Number.isFinite(before) || !Number.isFinite(after)) return;
    if (before === after || (before > 0 && Math.abs(after - before) / before < threshold)) return;
    const pct = before > 0 ? `${((after - before) / before * 100).toFixed(1)}%` : "from zero";
    changes.push({ id, title: `${title} ${after > before ? "up" : "down"}`, detail: `${before.toLocaleString("en-US", { maximumFractionDigits: 4 })} → ${after.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${unit} (${after > before && before > 0 ? "+" : ""}${pct})`, href });
  };
  numeric("fee", previous.fee, current.fee, 0.2, "Fees", `/${chainId}?i=atmosphere`, feeUnit);
  numeric("pending", previous.pending, current.pending, 0.2, "Pending activity", `/${chainId}?i=atmosphere`, "pending");
  numeric("price", previous.price, current.price, 0.02, "Price", `/${chainId}#price-chart-heading`, "USD");
  if (previous.regime && current.regime && previous.regime !== current.regime) changes.push({ id: "regime", title: "Regime changed", detail: `${previous.regime.replaceAll("_", " ")} → ${current.regime.replaceAll("_", " ")}`, href: `/${chainId}#regime` });
  for (const row of current.wallets) {
    const before = previous.wallets.find((item) => walletAddressKey(chainId, item.address) === walletAddressKey(chainId, row.address));
    if (!before || row.at <= before.at || Math.abs(row.balance - before.balance) < 1e-10) continue;
    const delta = row.balance - before.balance;
    changes.push({ id: row.address, title: row.label || `${row.address.slice(0, 8)}…${row.address.slice(-6)}`, detail: `${delta > 0 ? "+" : ""}${delta.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${ticker} in saved wallet readings`, href: `/${chainId}/wallet?a=${encodeURIComponent(row.address)}` });
  }
  return changes;
}
