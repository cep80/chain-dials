import { NextResponse } from "next/server";
import { sbAdmin, sbRest, SupabaseError } from "@/lib/supabase";
import { requireUser } from "@/lib/supabase-session";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { watchLimit } from "@/lib/entitlement";
import { fetchTxOrNull, mempoolText } from "@/lib/forensics/mempool";
import { parseWatchInput } from "@/lib/watch/input";
import { FINAL_CONFIRMATIONS } from "@/lib/watch/transitions";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  kind: string;
  target: string;
  label: string | null;
  params: Record<string, unknown>;
  created_at: string;
  done_at: string | null;
};

const SELECT = "id,kind,target,label,params,created_at,done_at";

export async function GET(req: Request) {
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  // RLS limits this to the caller's own rows.
  const watches = await sbRest<Row[]>(
    `watches?select=${SELECT}&order=created_at.desc&limit=100`,
    { token: gate.user.token },
  );
  return NextResponse.json({
    watches,
    limit: watchLimit(gate.user.pro),
    pro: gate.user.pro,
  });
}

export async function POST(req: Request) {
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  const limited = rateLimit(`watch:create:${gate.user.id}:${clientIp(req)}`, 20, 60 * 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const input = parseWatchInput(json);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
  const { kind, target, label, params } = input.value;

  const active = await sbAdmin<{ id: string }[]>(
    `watches?select=id&user_id=eq.${gate.user.id}&done_at=is.null`,
    {},
  );
  const limit = watchLimit(gate.user.pro);
  if (active.length >= limit) {
    return NextResponse.json(
      {
        error: gate.user.pro
          ? `Up to ${limit} watches. Remove one first.`
          : "Free accounts get one watch. Pro watches up to 25.",
        code: gate.user.pro ? "limit" : "pro_required",
      },
      { status: 403 },
    );
  }

  if (kind === "tx") {
    try {
      const tx = await fetchTxOrNull(target);
      if (!tx) return NextResponse.json({ error: "No such transaction on Bitcoin." }, { status: 400 });
      if (tx.status.confirmed && tx.status.block_height != null) {
        const tip = Number(await mempoolText("/blocks/tip/height"));
        if (tip - tx.status.block_height + 1 >= FINAL_CONFIRMATIONS) {
          return NextResponse.json({ error: "That transaction is already settled." }, { status: 400 });
        }
      }
    } catch (err) {
      console.error("watch tx lookup failed", err);
      return NextResponse.json({ error: "Couldn't reach the explorer. Try again." }, { status: 502 });
    }
  }

  try {
    const [row] = await sbAdmin<Row[]>(`watches?select=${SELECT}`, {
      method: "POST",
      body: { user_id: gate.user.id, kind, chain_id: "btc", target, label, params },
      representation: true,
    });
    return NextResponse.json({ watch: row }, { status: 201 });
  } catch (err) {
    if (err instanceof SupabaseError && err.status === 409) {
      return NextResponse.json({ error: "You're already watching that." }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(req: Request) {
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await sbRest(`watches?id=eq.${id}`, { token: gate.user.token, method: "DELETE" });
  return NextResponse.json({ ok: true });
}
