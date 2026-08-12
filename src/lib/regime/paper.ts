import {
  isRegimeId,
  isStanceId,
  type RegimeId,
  type StanceId,
} from "@/lib/regime/types";

export const PAPER_STORAGE_KEY = "chaindials.hype.paper.v1";
export const PAPER_STARTING_EQUITY = 10_000;
export const PAPER_NOTIONAL_USD = 1_000;
export const PAPER_COOLDOWN_MS = 5 * 60_000;
const FILLS_MAX = 80;

export type PaperSide = "long" | "short";

export type PaperPosition = {
  side: PaperSide;
  qty: number;
  entry: number;
  openedAt: number;
  regime: RegimeId;
};

export type PaperFill = {
  id: string;
  at: number;
  action: "open" | "close";
  side: PaperSide;
  qty: number;
  price: number;
  regime: RegimeId;
  stance: StanceId;
  realizedPnl: number;
};

export type PaperBook = {
  version: 1;
  auto: boolean;
  lastFlipAt: number;
  lastStance: StanceId | null;
  lastRegime: RegimeId | null;
  position: PaperPosition | null;
  realizedPnl: number;
  fills: PaperFill[];
  startingEquity: number;
};

export function emptyPaperBook(): PaperBook {
  return {
    version: 1,
    auto: false,
    lastFlipAt: 0,
    lastStance: null,
    lastRegime: null,
    position: null,
    realizedPnl: 0,
    fills: [],
    startingEquity: PAPER_STARTING_EQUITY,
  };
}

function asSide(v: unknown): PaperSide | null {
  return v === "long" || v === "short" ? v : null;
}

function asFinite(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function normalizePaperBook(raw: unknown): PaperBook {
  const base = emptyPaperBook();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const lastStance =
    typeof o.lastStance === "string" && isStanceId(o.lastStance)
      ? o.lastStance
      : null;
  const lastRegime =
    typeof o.lastRegime === "string" && isRegimeId(o.lastRegime)
      ? o.lastRegime
      : null;

  let position: PaperPosition | null = null;
  if (o.position && typeof o.position === "object") {
    const p = o.position as Record<string, unknown>;
    const side = asSide(p.side);
    const qty = asFinite(p.qty);
    const entry = asFinite(p.entry);
    const openedAt = asFinite(p.openedAt);
    const regime =
      typeof p.regime === "string" && isRegimeId(p.regime) ? p.regime : null;
    if (side && qty && qty > 0 && entry && entry > 0 && openedAt && regime) {
      position = { side, qty, entry, openedAt, regime };
    }
  }

  const fills: PaperFill[] = [];
  if (Array.isArray(o.fills)) {
    for (const row of o.fills) {
      if (!row || typeof row !== "object") continue;
      const f = row as Record<string, unknown>;
      const side = asSide(f.side);
      const action = f.action === "open" || f.action === "close" ? f.action : null;
      const qty = asFinite(f.qty);
      const price = asFinite(f.price);
      const at = asFinite(f.at);
      const regime =
        typeof f.regime === "string" && isRegimeId(f.regime) ? f.regime : null;
      const stance =
        typeof f.stance === "string" && isStanceId(f.stance) ? f.stance : null;
      const realized = asFinite(f.realizedPnl) ?? 0;
      if (!side || !action || !qty || !price || !at || !regime || !stance) {
        continue;
      }
      fills.push({
        id:
          typeof f.id === "string" && f.id
            ? f.id
            : `fill-${at}-${fills.length}`,
        at,
        action,
        side,
        qty,
        price,
        regime,
        stance,
        realizedPnl: realized,
      });
      if (fills.length >= FILLS_MAX) break;
    }
  }

  return {
    version: 1,
    auto: o.auto === true,
    lastFlipAt: asFinite(o.lastFlipAt) ?? 0,
    lastStance,
    lastRegime,
    position,
    realizedPnl: asFinite(o.realizedPnl) ?? 0,
    fills,
    startingEquity: asFinite(o.startingEquity) ?? PAPER_STARTING_EQUITY,
  };
}

export function unrealizedPnl(
  book: PaperBook,
  mark: number | null,
): number {
  if (!book.position || mark == null || !(mark > 0)) return 0;
  const { side, qty, entry } = book.position;
  return side === "long" ? (mark - entry) * qty : (entry - mark) * qty;
}

export function paperEquity(book: PaperBook, mark: number | null): number {
  return book.startingEquity + book.realizedPnl + unrealizedPnl(book, mark);
}

function closePosition(
  book: PaperBook,
  mark: number,
  now: number,
  regime: RegimeId,
  stance: StanceId,
): PaperBook {
  if (!book.position) return book;
  const pnl = unrealizedPnl(book, mark);
  const pos = book.position;
  const fill: PaperFill = {
    id: `fill-${now}-${book.fills.length}`,
    at: now,
    action: "close",
    side: pos.side,
    qty: pos.qty,
    price: mark,
    regime,
    stance,
    realizedPnl: pnl,
  };
  return {
    ...book,
    position: null,
    realizedPnl: book.realizedPnl + pnl,
    fills: [...book.fills, fill].slice(-FILLS_MAX),
  };
}

function openPosition(
  book: PaperBook,
  side: PaperSide,
  mark: number,
  now: number,
  regime: RegimeId,
  stance: StanceId,
  notionalUsd: number,
): PaperBook {
  const qty = notionalUsd / mark;
  if (!(qty > 0)) return book;
  const fill: PaperFill = {
    id: `fill-${now}-${book.fills.length}`,
    at: now,
    action: "open",
    side,
    qty,
    price: mark,
    regime,
    stance,
    realizedPnl: 0,
  };
  return {
    ...book,
    position: { side, qty, entry: mark, openedAt: now, regime },
    fills: [...book.fills, fill].slice(-FILLS_MAX),
  };
}

function desiredSide(stance: StanceId): PaperSide | null {
  if (stance === "long") return "long";
  if (stance === "short") return "short";
  return null;
}

/**
 * Open/close the notional HYPE paper book on stance change.
 * No-ops when auto is off, mark is missing, stance is unchanged, or cooldown holds.
 */
export function applyPaperStance(
  book: PaperBook,
  input: {
    stance: StanceId;
    regime: RegimeId;
    mark: number | null;
    now: number;
    cooldownMs?: number;
    notionalUsd?: number;
  },
): PaperBook {
  if (!book.auto) {
    return { ...book, lastRegime: input.regime };
  }
  const mark = input.mark;
  if (mark == null || !(mark > 0)) {
    return { ...book, lastRegime: input.regime };
  }

  const cooldown = input.cooldownMs ?? PAPER_COOLDOWN_MS;
  const sameStance = book.lastStance === input.stance;
  if (sameStance) {
    return { ...book, lastRegime: input.regime };
  }
  if (book.lastStance != null && input.now - book.lastFlipAt < cooldown) {
    return { ...book, lastRegime: input.regime };
  }

  const notional = input.notionalUsd ?? PAPER_NOTIONAL_USD;
  let next = book;
  const want = desiredSide(input.stance);

  if (next.position && (want == null || next.position.side !== want)) {
    next = closePosition(next, mark, input.now, input.regime, input.stance);
  }
  if (want && !next.position) {
    next = openPosition(
      next,
      want,
      mark,
      input.now,
      input.regime,
      input.stance,
      notional,
    );
  }

  return {
    ...next,
    lastFlipAt: input.now,
    lastStance: input.stance,
    lastRegime: input.regime,
  };
}

export function loadPaperBook(): PaperBook {
  if (typeof window === "undefined") return emptyPaperBook();
  try {
    const raw = localStorage.getItem(PAPER_STORAGE_KEY);
    if (!raw) return emptyPaperBook();
    return normalizePaperBook(JSON.parse(raw) as unknown);
  } catch {
    return emptyPaperBook();
  }
}

export function savePaperBook(book: PaperBook): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PAPER_STORAGE_KEY, JSON.stringify(book));
  } catch {
    // quota
  }
}
