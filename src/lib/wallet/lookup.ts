import { CHAINS } from "@/lib/chains/registry";
import type { ChainId } from "@/lib/chains/types";
import { getHolder, getVictim } from "@/lib/forensics/dataset";
import { getLiquidAddress, LIQUID_CASE_HREF } from "@/lib/forensics/liquid";
import {
  fetchAddress,
  fetchAddressTxs,
  type MempoolTx,
} from "@/lib/forensics/mempool";
import { normalizeWalletAddress } from "@/lib/wallet/address";
import { rankHoldings, tokenAmountFromRaw } from "@/lib/wallet/holdings";
import type {
  WalletExplorerLink,
  WalletHolding,
  WalletLookup,
  WalletPerp,
  WalletPosition,
  WalletSpotBalance,
  WalletTag,
  WalletTx,
} from "@/lib/wallet/types";

const TX_CAP = 20;
const RPC_MS = 8_000;

const ETH_RPC = "https://ethereum.publicnode.com";
const SOL_RPC = "https://api.mainnet-beta.solana.com";
const HYPE_RPC = "https://rpc.hyperliquid.xyz/evm";
const HYPE_INFO = "https://api.hyperliquid.xyz/info";
const BLOCKSCOUT = "https://eth.blockscout.com/api/v2";
const SCOUT_HEADERS = {
  accept: "application/json",
  "user-agent": "ChainDials/1.0 (wallet-explorer)",
};
const SOL_TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const SOL_TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const SOL_MINT_SYMBOL: Record<string, string> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
  So11111111111111111111111111111111111111112: "WSOL",
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: "mSOL",
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: "BONK",
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: "JUP",
};

function explorersFor(chain: ChainId, address: string): WalletExplorerLink[] {
  const c = CHAINS[chain];
  const links: WalletExplorerLink[] = [
    { label: c.explorerName, url: c.explorerAddress(address) },
  ];
  switch (chain) {
    case "btc":
      links.push({
        label: "Blockstream",
        url: `https://blockstream.info/address/${address}`,
      });
      break;
    case "eth":
      links.push({
        label: "Blockscout",
        url: `https://eth.blockscout.com/address/${address}`,
      });
      break;
    case "sol":
      links.push({
        label: "SolanaFM",
        url: `https://solana.fm/address/${address}`,
      });
      break;
    case "hype":
      links.push({
        label: "Hyperliquid",
        url: `https://app.hyperliquid.xyz/explorer/address/${address}`,
      });
      break;
  }
  return links;
}

function emptyLookup(
  chain: ChainId,
  query: string,
  patch: Partial<WalletLookup>,
): WalletLookup {
  return {
    fetchedAt: Date.now(),
    chainId: chain,
    query,
    normalized: null,
    valid: false,
    source: "",
    explorers: [],
    unit: CHAINS[chain].ticker,
    balanceNative: null,
    pendingNative: null,
    receivedNative: null,
    sentNative: null,
    txCount: null,
    note: null,
    tag: null,
    txs: [],
    holdings: [],
    perp: null,
    ...patch,
  };
}

async function scoutJson<T>(path: string, timeoutMs = RPC_MS): Promise<T | null> {
  try {
    const res = await fetch(`${BLOCKSCOUT}${path}`, {
      headers: SCOUT_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function jsonRpc(
  url: string,
  method: string,
  params: unknown[] = [],
): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
    signal: AbortSignal.timeout(RPC_MS),
  });
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  const body = (await res.json()) as {
    result?: unknown;
    error?: { message?: string };
  };
  if (body.error) throw new Error(body.error.message ?? "RPC error");
  return body.result;
}

function hexToBigInt(hex: string | null | undefined): bigint {
  if (!hex || hex === "0x") return BigInt(0);
  try {
    return BigInt(hex);
  } catch {
    return BigInt(0);
  }
}

export function weiToEth(wei: bigint): number {
  return Number(wei) / 1e18;
}

export function lamportsToSol(lamports: number): number {
  return lamports / 1e9;
}

function btcTag(address: string): WalletTag | null {
  const holder = getHolder(address);
  const victim = getVictim(address);
  if (holder && victim) {
    return {
      kind: "both",
      label: `Coldcard cluster · ${holder.label}`,
      href: "/btc/forensics?case=coldcard",
    };
  }
  if (victim) {
    return {
      kind: "victim",
      label: `Published drained victim · wave ${victim.wave}`,
      href: "/btc/forensics?case=coldcard",
    };
  }
  if (holder) {
    return {
      kind: "holder",
      label: `Tracked attacker holder · ${holder.label}`,
      href: "/btc/forensics?case=coldcard",
    };
  }
  const liquid = getLiquidAddress(address);
  if (liquid) {
    return {
      kind: liquid.role === "actor" ? "holder" : "entity",
      label: `Liquid incident · ${liquid.label}`,
      href: LIQUID_CASE_HREF,
    };
  }
  return null;
}

function btcDelta(tx: MempoolTx, address: string): number {
  const needle = address.toLowerCase();
  let incoming = 0;
  let outgoing = 0;
  for (const vin of tx.vin) {
    const prev = vin.prevout?.scriptpubkey_address;
    if (prev && prev.toLowerCase() === needle) {
      outgoing += vin.prevout?.value ?? 0;
    }
  }
  for (const vout of tx.vout) {
    const dest = vout.scriptpubkey_address;
    if (dest && dest.toLowerCase() === needle) {
      incoming += vout.value;
    }
  }
  return (incoming - outgoing) / 1e8;
}

function btcCounterparty(tx: MempoolTx, address: string): string | null {
  const needle = address.toLowerCase();
  const spent = tx.vin.some(
    (vin) => vin.prevout?.scriptpubkey_address?.toLowerCase() === needle,
  );
  if (spent) {
    const dest = tx.vout.find(
      (v) => v.scriptpubkey_address?.toLowerCase() !== needle,
    );
    return dest?.scriptpubkey_address ?? null;
  }
  const src = tx.vin.find(
    (vin) => vin.prevout?.scriptpubkey_address?.toLowerCase() !== needle,
  );
  return src?.prevout?.scriptpubkey_address ?? null;
}

async function lookupBtc(
  query: string,
  address: string,
): Promise<WalletLookup> {
  const [live, txsRaw] = await Promise.all([
    fetchAddress(address),
    fetchAddressTxs(address).catch(() => [] as MempoolTx[]),
  ]);
  const txs: WalletTx[] = txsRaw.slice(0, TX_CAP).map((tx) => ({
    id: tx.txid,
    kind: "tx",
    confirmed: tx.status.confirmed,
    at: tx.status.block_time ? tx.status.block_time * 1000 : null,
    height: tx.status.block_height ?? null,
    valueNative: btcDelta(tx, address),
    feeNative: tx.fee != null ? tx.fee / 1e8 : null,
    counterparty: btcCounterparty(tx, address),
    label: tx.status.confirmed ? "confirmed" : "mempool",
  }));
  return {
    fetchedAt: Date.now(),
    chainId: "btc",
    query,
    normalized: address,
    valid: true,
    source: "mempool.space",
    explorers: explorersFor("btc", address),
    unit: "BTC",
    balanceNative: live.balanceSats / 1e8,
    pendingNative: live.mempoolBalanceSats / 1e8,
    receivedNative: live.fundedSats / 1e8,
    sentNative: live.spentSats / 1e8,
    txCount: live.txCount,
    note: null,
    tag: btcTag(address),
    txs,
    holdings: [],
    perp: null,
  };
}

type ScoutTx = {
  hash?: string;
  timestamp?: string;
  from?: { hash?: string };
  to?: { hash?: string };
  value?: string;
  fee?: { value?: string };
  result?: string;
  method?: string | null;
  status?: string;
};

function scoutTxs(address: string, items: ScoutTx[]): WalletTx[] {
  return items.slice(0, TX_CAP).map((tx) => {
    const from = tx.from?.hash?.toLowerCase() ?? "";
    const to = tx.to?.hash?.toLowerCase() ?? "";
    const valueWei = BigInt(tx.value ?? "0");
    const signed =
      from === address
        ? -weiToEth(valueWei)
        : to === address
          ? weiToEth(valueWei)
          : weiToEth(valueWei);
    const at = tx.timestamp ? Date.parse(tx.timestamp) : null;
    return {
      id: tx.hash ?? "",
      kind: "tx" as const,
      confirmed: tx.result === "success" || tx.status === "ok",
      at: at != null && Number.isFinite(at) ? at : null,
      height: null,
      valueNative: signed,
      feeNative: tx.fee?.value ? weiToEth(BigInt(tx.fee.value)) : null,
      counterparty: from === address ? (tx.to?.hash ?? null) : (tx.from?.hash ?? null),
      label: tx.method || (from === address ? "sent" : "received"),
    };
  });
}

async function lookupEthRpc(address: string): Promise<{
  balance: number;
  txCount: number;
}> {
  const [balHex, countHex] = await Promise.all([
    jsonRpc(ETH_RPC, "eth_getBalance", [address, "latest"]) as Promise<string>,
    jsonRpc(ETH_RPC, "eth_getTransactionCount", [
      address,
      "latest",
    ]) as Promise<string>,
  ]);
  return {
    balance: weiToEth(hexToBigInt(balHex)),
    txCount: Number(hexToBigInt(countHex)),
  };
}

type ScoutTokenRow = {
  value?: string;
  token?: {
    symbol?: string | null;
    decimals?: string | number | null;
    exchange_rate?: string | null;
    name?: string | null;
    volume_24h?: string | number | null;
    circulating_market_cap?: string | number | null;
  };
  token_id?: string | null;
};

function scoutHoldings(rows: ScoutTokenRow[]): WalletHolding[] {
  const out: WalletHolding[] = [];
  for (const row of rows) {
    const decimalsRaw = row.token?.decimals;
    const decimals =
      typeof decimalsRaw === "number"
        ? decimalsRaw
        : Number.parseInt(String(decimalsRaw ?? "18"), 10);
    const amount = tokenAmountFromRaw(row.value ?? "0", decimals);
    if (!amount) continue;
    const vol = Number.parseFloat(String(row.token?.volume_24h ?? ""));
    // Huge illiquid bags are almost always airdrop spam.
    if (amount >= 1e6 && !(Number.isFinite(vol) && vol >= 1e6)) continue;
    const symbol = (row.token?.symbol || row.token?.name || "token").slice(0, 12);
    const rate = Number.parseFloat(row.token?.exchange_rate ?? "");
    const usd = Number.isFinite(rate) ? amount * rate : null;
    if (amount >= 1e8 && (usd == null || usd < 5_000)) continue;
    out.push({ symbol, amount, usd });
  }
  return rankHoldings(out);
}

async function lookupEth(query: string, address: string): Promise<WalletLookup> {
  const [rpc, scoutBody, tokBalances] = await Promise.all([
    lookupEthRpc(address),
    scoutJson<{ items?: ScoutTx[] }>(`/addresses/${address}/transactions`),
    scoutJson<ScoutTokenRow[]>(
      `/addresses/${address}/token-balances`,
      15_000,
    ),
  ]);
  const txs = scoutBody?.items ? scoutTxs(address, scoutBody.items) : [];
  let tokRows = Array.isArray(tokBalances) ? tokBalances : [];
  if (!tokRows.length) {
    const tokPage = await scoutJson<{ items?: ScoutTokenRow[] }>(
      `/addresses/${address}/tokens?type=ERC-20`,
    );
    tokRows = tokPage?.items ?? [];
  }
  const holdings = scoutHoldings(tokRows);
  return {
    fetchedAt: Date.now(),
    chainId: "eth",
    query,
    normalized: address,
    valid: true,
    source: txs.length || holdings.length ? "publicnode+blockscout" : "publicnode",
    explorers: explorersFor("eth", address),
    unit: "ETH",
    balanceNative: rpc.balance,
    pendingNative: null,
    receivedNative: null,
    sentNative: null,
    txCount: rpc.txCount,
    note: txs.length
      ? null
      : `Nonce ${rpc.txCount}. Recent history is on Etherscan.`,
    tag: null,
    txs,
    holdings,
    perp: null,
  };
}

type SolSig = {
  signature: string;
  slot: number;
  err: unknown;
  blockTime?: number | null;
};

type SolTokenAcc = {
  account?: {
    data?: {
      parsed?: {
        info?: {
          mint?: string;
          tokenAmount?: {
            uiAmount?: number | null;
            amount?: string;
            decimals?: number;
          };
        };
      };
    };
  };
};

function collectSolMints(raw: unknown, into: Map<string, number>) {
  const value = (raw as { value?: SolTokenAcc[] } | null)?.value;
  if (!Array.isArray(value)) return;
  for (const row of value) {
    const info = row.account?.data?.parsed?.info;
    const mint = info?.mint;
    if (!mint) continue;
    const ui = info?.tokenAmount?.uiAmount;
    const amount =
      typeof ui === "number" && Number.isFinite(ui)
        ? ui
        : tokenAmountFromRaw(
            info?.tokenAmount?.amount ?? "0",
            info?.tokenAmount?.decimals ?? 0,
          );
    if (!amount) continue;
    into.set(mint, (into.get(mint) ?? 0) + amount);
  }
}

function solTokenHoldings(...raws: unknown[]): WalletHolding[] {
  const byMint = new Map<string, number>();
  for (const raw of raws) collectSolMints(raw, byMint);
  const known: WalletHolding[] = [];
  const rest: WalletHolding[] = [];
  for (const [mint, amount] of byMint) {
    const symbol = SOL_MINT_SYMBOL[mint];
    const row = {
      symbol: symbol ?? `${mint.slice(0, 4)}...`,
      amount,
      usd: null as number | null,
    };
    if (symbol) known.push(row);
    else if (amount < 1e9) rest.push(row);
  }
  return rankHoldings(known.length ? known : rest);
}

async function lookupSol(query: string, address: string): Promise<WalletLookup> {
  const tokenOpts = { encoding: "jsonParsed" as const };
  const [balRaw, sigsRaw, tokA, tokB] = await Promise.all([
    jsonRpc(SOL_RPC, "getBalance", [address, { commitment: "confirmed" }]),
    jsonRpc(SOL_RPC, "getSignaturesForAddress", [
      address,
      { limit: TX_CAP },
    ]).catch(() => []),
    jsonRpc(SOL_RPC, "getTokenAccountsByOwner", [
      address,
      { programId: SOL_TOKEN },
      tokenOpts,
    ]).catch(() => null),
    jsonRpc(SOL_RPC, "getTokenAccountsByOwner", [
      address,
      { programId: SOL_TOKEN_2022 },
      tokenOpts,
    ]).catch(() => null),
  ]);
  const lamports =
    typeof balRaw === "number"
      ? balRaw
      : Number((balRaw as { value?: number })?.value ?? 0);
  const sigs = (Array.isArray(sigsRaw) ? sigsRaw : []) as SolSig[];
  const txs: WalletTx[] = sigs.map((s) => ({
    id: s.signature,
    kind: "sig",
    confirmed: s.err == null,
    at: s.blockTime ? s.blockTime * 1000 : null,
    height: s.slot,
    valueNative: null,
    feeNative: null,
    counterparty: null,
    label: s.err == null ? "ok" : "failed",
  }));
  const holdings = solTokenHoldings(tokA, tokB);
  return {
    fetchedAt: Date.now(),
    chainId: "sol",
    query,
    normalized: address,
    valid: true,
    source: holdings.length ? "solana-rpc+tokens" : "solana-rpc",
    explorers: explorersFor("sol", address),
    unit: "SOL",
    balanceNative: lamportsToSol(lamports),
    pendingNative: null,
    receivedNative: null,
    sentNative: null,
    txCount: sigs.length > 0 ? sigs.length : null,
    note: holdings.length
      ? "Native SOL plus the largest token accounts this RPC would list."
      : "Native SOL. Token accounts live on Solscan if this RPC skipped them.",
    tag: null,
    txs,
    holdings,
    perp: null,
  };
}

async function hypeInfo(body: unknown): Promise<unknown> {
  const res = await fetch(HYPE_INFO, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(RPC_MS),
  });
  if (!res.ok) throw new Error(`hype info ${res.status}`);
  return res.json();
}

type HypeFill = {
  coin?: string;
  px?: string;
  sz?: string;
  side?: string;
  time?: number;
  hash?: string;
  closedPnl?: string;
  fee?: string;
};

function parseHypePerp(
  state: unknown,
  spot: unknown,
): WalletPerp | null {
  if (!state || typeof state !== "object") return null;
  const s = state as {
    marginSummary?: {
      accountValue?: string;
      totalNtlPos?: string;
    };
    withdrawable?: string;
    assetPositions?: Array<{
      position?: {
        coin?: string;
        szi?: string;
        entryPx?: string;
        unrealizedPnl?: string;
        positionValue?: string;
      };
    }>;
  };
  const positions: WalletPosition[] = [];
  for (const row of s.assetPositions ?? []) {
    const p = row.position;
    const size = Number.parseFloat(p?.szi ?? "0");
    if (!p?.coin || !Number.isFinite(size) || size === 0) continue;
    positions.push({
      coin: p.coin,
      size,
      entryPx: Number.parseFloat(p.entryPx ?? "") || null,
      unrealizedPnl: Number.parseFloat(p.unrealizedPnl ?? "") || null,
      positionValue: Number.parseFloat(p.positionValue ?? "") || null,
    });
  }
  const spotRows: WalletSpotBalance[] = [];
  if (spot && typeof spot === "object") {
    const balances = (spot as { balances?: Array<{ coin?: string; total?: string }> })
      .balances;
    const parsed: WalletSpotBalance[] = [];
    for (const b of balances ?? []) {
      const total = Number.parseFloat(b.total ?? "0");
      if (!b.coin || !Number.isFinite(total) || total === 0) continue;
      parsed.push({ coin: b.coin, total });
    }
    parsed.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
    spotRows.push(...parsed.slice(0, 16));
  }
  const accountValueUsd = Number.parseFloat(s.marginSummary?.accountValue ?? "");
  const withdrawableUsd = Number.parseFloat(s.withdrawable ?? "");
  const totalNtlPos = Number.parseFloat(s.marginSummary?.totalNtlPos ?? "");
  return {
    accountValueUsd: Number.isFinite(accountValueUsd) ? accountValueUsd : null,
    withdrawableUsd: Number.isFinite(withdrawableUsd) ? withdrawableUsd : null,
    totalNtlPos: Number.isFinite(totalNtlPos) ? totalNtlPos : null,
    positions,
    spot: spotRows,
  };
}

async function lookupHype(
  query: string,
  address: string,
): Promise<WalletLookup> {
  const evm = Promise.all([
    jsonRpc(HYPE_RPC, "eth_getBalance", [address, "latest"]) as Promise<string>,
    jsonRpc(HYPE_RPC, "eth_getTransactionCount", [
      address,
      "latest",
    ]) as Promise<string>,
  ]).catch(() => null);

  const core = Promise.all([
    hypeInfo({ type: "clearinghouseState", user: address }).catch(() => null),
    hypeInfo({ type: "spotClearinghouseState", user: address }).catch(
      () => null,
    ),
    hypeInfo({ type: "userFills", user: address }).catch(() => null),
  ]);

  const [evmRes, coreRes] = await Promise.all([evm, core]);
  const [state, spot, fillsRaw] = coreRes;
  const perp = parseHypePerp(state, spot);
  const fillsRawList = Array.isArray(fillsRaw)
    ? fillsRaw
    : fillsRaw &&
        typeof fillsRaw === "object" &&
        Array.isArray((fillsRaw as { fills?: unknown }).fills)
      ? ((fillsRaw as { fills: HypeFill[] }).fills)
      : [];
  const fills = fillsRawList as HypeFill[];
  const txs: WalletTx[] = fills.slice(0, TX_CAP).map((f) => {
    const sz = Number.parseFloat(f.sz ?? "0");
    const px = Number.parseFloat(f.px ?? "0");
    const side = (f.side ?? "").toUpperCase();
    return {
      id: f.hash || `${f.coin}-${f.time}`,
      kind: "fill",
      confirmed: true,
      at: typeof f.time === "number" ? f.time : null,
      height: null,
      valueNative: Number.isFinite(sz) && Number.isFinite(px) ? sz * px : null,
      feeNative: Number.parseFloat(f.fee ?? "") || null,
      counterparty: f.coin ?? null,
      label: `${side === "B" || side === "BUY" ? "buy" : "sell"} ${f.coin ?? ""}`.trim(),
    };
  });

  const evmBal = evmRes ? weiToEth(hexToBigInt(evmRes[0])) : null;
  const nonce = evmRes ? Number(hexToBigInt(evmRes[1])) : null;
  const sources = [
    evmRes ? "hyperevm" : null,
    perp ? "hypercore" : null,
  ].filter(Boolean);
  const holdings = rankHoldings(
    (perp?.spot ?? [])
      .filter(
        (s) =>
          /^(USDC|USDT|HYPE)$/i.test(s.coin) || Math.abs(s.total) < 1e6,
      )
      .map((s) => ({
        symbol: s.coin.slice(0, 12),
        amount: s.total,
        usd: s.coin.toUpperCase() === "USDC" ? s.total : null,
      })),
  );

  return {
    fetchedAt: Date.now(),
    chainId: "hype",
    query,
    normalized: address,
    valid: true,
    source: sources.join("+") || "hyperliquid",
    explorers: explorersFor("hype", address),
    unit: "HYPE",
    balanceNative: evmBal,
    pendingNative: null,
    receivedNative: null,
    sentNative: null,
    txCount: nonce,
    note:
      "HyperEVM gas on the left. Perp account is HyperCore, not the same as on-chain HYPE.",
    tag: null,
    txs,
    holdings,
    perp,
  };
}

export async function lookupWallet(
  chain: ChainId,
  query: string,
): Promise<WalletLookup> {
  const parsed = normalizeWalletAddress(chain, query);
  if (!parsed.ok) {
    return emptyLookup(chain, query, { reason: parsed.reason });
  }
  try {
    switch (chain) {
      case "btc":
        return await lookupBtc(query, parsed.address);
      case "eth":
        return await lookupEth(query, parsed.address);
      case "sol":
        return await lookupSol(query, parsed.address);
      case "hype":
        return await lookupHype(query, parsed.address);
    }
  } catch (err) {
    return emptyLookup(chain, query, {
      valid: true,
      normalized: parsed.address,
      reason: "upstream",
      error: err instanceof Error ? err.message : "lookup failed",
      explorers: explorersFor(chain, parsed.address),
    });
  }
}
