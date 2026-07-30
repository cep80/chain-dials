import { CHAIN_ORDER, CHAINS } from "@/lib/chains/registry";
import type { ChainId } from "@/lib/chains/types";

export interface TipSnapshot {
  height: number | null;
  hash: string | null;
  timestamp: number | null;
  source: string;
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
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  const body = (await res.json()) as { result?: unknown; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message ?? "RPC error");
  return body.result;
}

function hexToNumber(hex: string): number {
  return Number.parseInt(hex, 16);
}

export async function fetchTip(chain: ChainId): Promise<TipSnapshot> {
  switch (chain) {
    case "btc": {
      const res = await fetch("https://mempool.space/api/blocks/tip/height", {
        next: { revalidate: 0 },
      });
      if (!res.ok) throw new Error("BTC tip height failed");
      const height = Number(await res.text());
      const hashRes = await fetch("https://mempool.space/api/blocks/tip/hash", {
        next: { revalidate: 0 },
      });
      const hash = hashRes.ok ? await hashRes.text() : null;
      let timestamp: number | null = null;
      if (hash) {
        try {
          const blockRes = await fetch(`https://mempool.space/api/block/${hash}`, {
            next: { revalidate: 0 },
          });
          if (blockRes.ok) {
            const block = (await blockRes.json()) as { timestamp?: number };
            if (block.timestamp) {
              timestamp =
                block.timestamp < 1e12
                  ? block.timestamp * 1000
                  : block.timestamp;
            }
          }
        } catch {
          // keep null
        }
      }
      return {
        height: Number.isFinite(height) ? height : null,
        hash,
        timestamp: timestamp ?? Date.now(),
        source: "mempool.space",
      };
    }
    case "eth": {
      const rpc = "https://ethereum.publicnode.com";
      const blockHex = (await jsonRpc(rpc, "eth_blockNumber")) as string;
      const height = hexToNumber(blockHex);
      const block = (await jsonRpc(rpc, "eth_getBlockByNumber", [blockHex, false])) as {
        hash?: string;
        timestamp?: string;
      } | null;
      return {
        height,
        hash: block?.hash ?? null,
        timestamp: block?.timestamp
          ? hexToNumber(block.timestamp) * 1000
          : Date.now(),
        source: "publicnode",
      };
    }
    case "sol": {
      const rpc = "https://api.mainnet-beta.solana.com";
      const slot = (await jsonRpc(rpc, "getSlot", [{ commitment: "confirmed" }])) as number;
      const blockhash = (await jsonRpc(rpc, "getLatestBlockhash", [
        { commitment: "confirmed" },
      ])) as { value?: { blockhash?: string } };

      let timestamp: number | null = null;
      for (let back = 0; back < 8 && timestamp == null; back++) {
        try {
          const t = (await jsonRpc(rpc, "getBlockTime", [slot - back])) as
            | number
            | null;
          if (typeof t === "number" && t > 0) {
            // Approximate forward if we stepped back
            timestamp = t * 1000 + back * 400;
          }
        } catch {
          // try older slot
        }
      }

      return {
        height: slot,
        hash: blockhash?.value?.blockhash ?? null,
        timestamp: timestamp ?? Date.now(),
        source: timestamp != null ? "solana-blocktime" : "solana-poll",
      };
    }
    case "hype": {
      const rpc = "https://rpc.hyperliquid.xyz/evm";
      const blockHex = (await jsonRpc(rpc, "eth_blockNumber")) as string;
      const height = hexToNumber(blockHex);
      const block = (await jsonRpc(rpc, "eth_getBlockByNumber", [
        blockHex,
        false,
      ])) as { hash?: string; timestamp?: string } | null;
      return {
        height,
        hash: block?.hash ?? null,
        timestamp: block?.timestamp
          ? hexToNumber(block.timestamp) * 1000
          : Date.now(),
        source: "hyperevm",
      };
    }
  }
}

export async function fetchSuitePrices(): Promise<Partial<Record<ChainId, number>>> {
  const ids = CHAIN_ORDER.map((id) => CHAINS[id].coingeckoId).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
  const headers: Record<string, string> = { accept: "application/json" };
  const demo = process.env.COINGECKO_DEMO_API_KEY?.trim();
  const pro = process.env.COINGECKO_API_KEY?.trim();
  if (pro) headers["x-cg-pro-api-key"] = pro;
  else if (demo) headers["x-cg-demo-api-key"] = demo;
  const res = await fetch(url, {
    headers,
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = (await res.json()) as Record<string, { usd?: number }>;
  const out: Partial<Record<ChainId, number>> = {};
  for (const id of CHAIN_ORDER) {
    const usd = data[CHAINS[id].coingeckoId]?.usd;
    if (typeof usd === "number") out[id] = usd;
  }
  return out;
}
