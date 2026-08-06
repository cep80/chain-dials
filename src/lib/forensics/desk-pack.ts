/**
 * Forensics "desk pack": snapshot of an investigation session.
 * Interactive Trace stays free; packs are export/save bundles.
 */

export type DeskTxNote = {
  txid: string;
  note?: string;
  feeRate?: number | null;
  seenAt?: number | null;
};

export type DeskAddress = {
  address: string;
  label?: string;
};

export type ForensicsDeskPack = {
  id: string;
  name: string;
  chainId: "btc";
  /** Atmosphere / sample txs of interest */
  txs: DeskTxNote[];
  addresses: DeskAddress[];
  /** Free-text desk notes */
  summary: string;
  createdAt: number;
  updatedAt: number;
};

export const DESK_PACK_STORAGE_KEY = "chain-dials:forensics-desks:v1";

export function normalizeDeskPack(
  raw: unknown,
  nowMs = Date.now(),
): ForensicsDeskPack | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id ? o.id : `desk-${nowMs}`;
  const name =
    typeof o.name === "string" && o.name.trim()
      ? o.name.trim().slice(0, 80)
      : "Desk pack";
  const txs: DeskTxNote[] = [];
  if (Array.isArray(o.txs)) {
    for (const t of o.txs) {
      if (!t || typeof t !== "object") continue;
      const row = t as Record<string, unknown>;
      const txid = typeof row.txid === "string" ? row.txid.trim() : "";
      if (!txid || txid.length < 8) continue;
      txs.push({
        txid,
        note: typeof row.note === "string" ? row.note.slice(0, 280) : undefined,
        feeRate:
          typeof row.feeRate === "number" && Number.isFinite(row.feeRate)
            ? row.feeRate
            : null,
        seenAt:
          typeof row.seenAt === "number" && Number.isFinite(row.seenAt)
            ? row.seenAt
            : null,
      });
      if (txs.length >= 40) break;
    }
  }
  const addresses: DeskAddress[] = [];
  if (Array.isArray(o.addresses)) {
    for (const a of o.addresses) {
      if (!a || typeof a !== "object") continue;
      const row = a as Record<string, unknown>;
      const address = typeof row.address === "string" ? row.address.trim() : "";
      if (!address) continue;
      addresses.push({
        address,
        label:
          typeof row.label === "string" ? row.label.slice(0, 60) : undefined,
      });
      if (addresses.length >= 20) break;
    }
  }
  return {
    id,
    name,
    chainId: "btc",
    txs,
    addresses,
    summary:
      typeof o.summary === "string" ? o.summary.slice(0, 2000) : "",
    createdAt: typeof o.createdAt === "number" ? o.createdAt : nowMs,
    updatedAt: typeof o.updatedAt === "number" ? o.updatedAt : nowMs,
  };
}

export function parseDeskPacksJson(
  json: string,
  nowMs = Date.now(),
): ForensicsDeskPack[] {
  try {
    const data = JSON.parse(json) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .map((row) => normalizeDeskPack(row, nowMs))
      .filter((d): d is ForensicsDeskPack => d != null)
      .slice(0, 30);
  } catch {
    return [];
  }
}

/** Export a desk pack as markdown (free export path). */
export function deskPackToMarkdown(desk: ForensicsDeskPack): string {
  const lines = [
    `# ${desk.name}`,
    "",
    `Chain: ${desk.chainId.toUpperCase()}`,
    `Updated: ${new Date(desk.updatedAt).toISOString()}`,
    "",
    "## Summary",
    desk.summary || "(none)",
    "",
    "## Transactions",
  ];
  if (desk.txs.length === 0) lines.push("(none)");
  for (const t of desk.txs) {
    lines.push(
      `- \`${t.txid}\`${t.feeRate != null ? ` · ${t.feeRate} sat/vB` : ""}${t.note ? ` — ${t.note}` : ""}`,
    );
  }
  lines.push("", "## Addresses");
  if (desk.addresses.length === 0) lines.push("(none)");
  for (const a of desk.addresses) {
    lines.push(`- \`${a.address}\`${a.label ? ` (${a.label})` : ""}`);
  }
  lines.push("", "— Chain Dials forensics desk pack");
  return lines.join("\n");
}

export function emptyDeskPack(nowMs = Date.now()): ForensicsDeskPack {
  return {
    id: `desk-${nowMs}`,
    name: "New desk",
    chainId: "btc",
    txs: [],
    addresses: [],
    summary: "",
    createdAt: nowMs,
    updatedAt: nowMs,
  };
}
