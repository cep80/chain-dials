import { NextResponse } from "next/server";
import { z } from "zod";
import { ALERT_KINDS } from "@/lib/alerts/kinds";
import { alertRuleError } from "@/lib/alerts/runtime";
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
  if (parsed.data.rules.some((rule) => alertRuleError(rule.kind, rule.params))) {
    return NextResponse.json({ error: "Invalid threshold or cooldown" }, { status: 400 });
  }
  const submittedKeys = parsed.data.rules.map((rule) => `${rule.chainId}:${rule.kind}`);
  if (new Set(submittedKeys).size !== submittedKeys.length) {
    return NextResponse.json({ error: "Duplicate alert rules" }, { status: 400 });
  }

  const chainIds = [...new Set(parsed.data.rules.map((r) => r.chainId))];

  // Apply updates and inserts before removing obsolete rules. A failed insert
  // can leave an earlier update in place, but can no longer erase the old set.
  const list = chainIds.map((chainId) => `"${chainId}"`).join(",");
  const previous = chainIds.length ? await cbRest<RuleRow[]>(
    `${SELECT}&chain_id=in.(${encodeURIComponent(list)})`, { token: gate.user.token },
  ) : [];
  const byKey = new Map(previous.map((row) => [`${row.chain_id}:${row.kind}`, row]));
  for (const rule of parsed.data.rules) {
    const old = byKey.get(`${rule.chainId}:${rule.kind}`);
    const body = {
        chain_id: rule.chainId,
        kind: rule.kind,
        enabled: rule.enabled,
        params: rule.params ?? {},
    };
    await cbRest(old ? `alert_rules?id=eq.${encodeURIComponent(old.id)}` : "alert_rules", {
      method: old ? "PATCH" : "POST",
      token: gate.user.token,
      body: old ? { enabled: body.enabled, params: body.params } : body,
    });
  }
  const keep = new Set(submittedKeys);
  for (const row of previous) {
    if (keep.has(`${row.chain_id}:${row.kind}`)) continue;
    await cbRest(`alert_rules?id=eq.${encodeURIComponent(row.id)}`, {
      method: "DELETE", token: gate.user.token,
    });
  }

  const rows = await cbRest<RuleRow[]>(`${SELECT}&order=created_at.asc`, {
    token: gate.user.token,
  });
  return NextResponse.json({ rules: rows.map(toRule) });
}
