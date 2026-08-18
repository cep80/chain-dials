import { NextResponse } from "next/server";
import { z } from "zod";
import { ALERT_KINDS } from "@/lib/alerts/kinds";
import { cbRest } from "@/lib/cargobase";
import { requireProUser } from "@/lib/cargobase-session";

export const dynamic = "force-dynamic";

const ruleSchema = z.object({
  id: z.string().optional(),
  chainId: z.enum(["btc", "eth", "sol", "hype"]),
  kind: z.enum(ALERT_KINDS),
  enabled: z.boolean().default(true),
  params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).default({}),
});

type RuleRow = {
  id: string;
  chain_id: string;
  kind: string;
  enabled: boolean;
  params: Record<string, unknown> | null;
  updated_at: string;
};

const toRule = (row: RuleRow) => ({
  id: row.id,
  chainId: row.chain_id,
  kind: row.kind,
  enabled: row.enabled,
  params: row.params ?? {},
  updatedAt: row.updated_at,
});

const SELECT = "alert_rules?select=id,chain_id,kind,enabled,params,updated_at";

export async function GET(req: Request) {
  const gate = await requireProUser(req, "alert rules");
  if ("error" in gate) return gate.error;

  const chainId = new URL(req.url).searchParams.get("chainId");
  const query = [
    SELECT,
    chainId ? `chain_id=eq.${encodeURIComponent(chainId)}` : "",
    "order=created_at.asc",
  ]
    .filter(Boolean)
    .join("&");

  const rows = await cbRest<RuleRow[]>(query, { token: gate.user.token });
  return NextResponse.json({ rules: rows.map(toRule) });
}

export async function PUT(req: Request) {
  const gate = await requireProUser(req, "alert rules");
  if ("error" in gate) return gate.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = z.object({ rules: z.array(ruleSchema).max(12) }).safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid rules payload" }, { status: 400 });
  }

  const chainIds = [...new Set(parsed.data.rules.map((r) => r.chainId))];

  // Replace this user's rules for the chains being saved. PostgREST has no
  // multi-statement transaction, so unlike the previous Prisma version this is
  // a delete followed by an insert: if the insert fails the chain is left with
  // no rules and the client has to save again. Both halves are still scoped to
  // the caller by row-level security.
  if (chainIds.length > 0) {
    const list = chainIds.map((c) => `"${c}"`).join(",");
    await cbRest(`alert_rules?chain_id=in.(${encodeURIComponent(list)})`, {
      method: "DELETE",
      token: gate.user.token,
    });
  }

  if (parsed.data.rules.length > 0) {
    await cbRest("alert_rules", {
      method: "POST",
      token: gate.user.token,
      body: parsed.data.rules.map((rule) => ({
        chain_id: rule.chainId,
        kind: rule.kind,
        enabled: rule.enabled,
        params: rule.params ?? {},
      })),
    });
  }

  const rows = await cbRest<RuleRow[]>(`${SELECT}&order=created_at.asc`, {
    token: gate.user.token,
  });
  return NextResponse.json({ rules: rows.map(toRule) });
}
