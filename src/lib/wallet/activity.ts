import type { WalletTx } from "@/lib/wallet/types";

export type ActivityFilter = "all" | "incoming" | "outgoing" | "pending";

export function filterActivity(txs: WalletTx[], filter: ActivityFilter, query: string): WalletTx[] {
  const needle = query.trim().toLowerCase();
  return txs.filter((tx) => {
    // Fill values represent notional, not a signed transfer.
    if (filter === "incoming" && (tx.kind === "fill" || tx.valueNative == null || tx.valueNative <= 0)) return false;
    if (filter === "outgoing" && (tx.kind === "fill" || tx.valueNative == null || tx.valueNative >= 0)) return false;
    if (filter === "pending" && tx.confirmed !== false) return false;
    return !needle || [tx.id, tx.counterparty, tx.label].some((value) => value?.toLowerCase().includes(needle));
  });
}

export function activityStatus(tx: WalletTx, chainId: string): string {
  if (tx.confirmed == null) return "Unknown";
  if (tx.confirmed) return "Confirmed";
  return chainId === "btc" ? "Pending" : "Not confirmed";
}

function csvCell(value: string | number | null): string {
  if (value == null) return '""';
  // Neutralize spreadsheet formulas in upstream text while preserving signed numbers.
  const text = typeof value === "string" && /^[\s]*[=+@-]/.test(value) ? `'${value}` : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

/** Exports only the activity returned by the provider, never a full-history claim. */
export function activityCsv(txs: WalletTx[], chainId: string, unit: string): string {
  const rows: Array<Array<string | number | null>> = [
    ["Chain", "Id", "Kind", "Time (UTC)", "Status", "Amount", "Unit", "Fee (native)", "Counterparty", "Label"],
    ...txs.map((tx) => [
      chainId, tx.id, tx.kind,
      tx.at != null && Number.isFinite(tx.at) && !Number.isNaN(new Date(tx.at).getTime()) ? new Date(tx.at).toISOString() : null,
      activityStatus(tx, chainId), tx.valueNative, tx.kind === "fill" ? "USD notional" : unit,
      tx.feeNative, tx.counterparty, tx.label,
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
