import { z } from "zod";
import { normalizeBtcAddress } from "@/lib/forensics/address";
import type { WatchKind } from "@/lib/watch/transitions";

export type WatchInput = {
  kind: WatchKind;
  target: string;
  label: string | null;
  params: Record<string, number>;
};

const schema = z.object({
  kind: z.enum(["tx", "address", "solo"]),
  target: z.string().trim().min(1).max(120),
  label: z.string().trim().max(40).optional().nullable(),
  ths: z.number().positive().max(1e9).optional().nullable(),
});

const TXID = /^[0-9a-f]{64}$/i;

/** Validate and normalise a new watch from the client. */
export function parseWatchInput(raw: unknown): { ok: true; value: WatchInput } | { ok: false; error: string } {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid watch." };
  const { kind, label, ths } = parsed.data;
  let target = parsed.data.target.replace(/\s+/g, "");
  if (kind === "tx") {
    if (!TXID.test(target)) return { ok: false, error: "That isn't a transaction id (64 hex characters)." };
    target = target.toLowerCase();
  } else {
    const address = normalizeBtcAddress(target);
    if (!address) return { ok: false, error: "That isn't a Bitcoin address." };
    target = address;
  }
  return {
    ok: true,
    value: {
      kind,
      target,
      label: label ? label : null,
      params: kind === "solo" && ths ? { ths } : {},
    },
  };
}
