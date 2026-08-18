import { NextResponse } from "next/server";
import { z } from "zod";
import { cbRest } from "@/lib/cargobase";
import { requireProUser } from "@/lib/cargobase-session";

export const dynamic = "force-dynamic";

const layoutSchema = z.object({
  name: z.string().trim().min(1).max(60),
  chainId: z.enum(["btc", "eth", "sol", "hype"]),
  favorites: z.array(z.string()).min(1).max(40),
});

const MAX_LAYOUTS = 20;

type LayoutRow = {
  id: string;
  name: string;
  chain_id: string;
  favorites: string[];
  updated_at: string;
};

const toLayout = (row: LayoutRow) => ({
  id: row.id,
  name: row.name,
  chainId: row.chain_id,
  favorites: row.favorites ?? [],
  updatedAt: row.updated_at,
});

export async function GET(req: Request) {
  const gate = await requireProUser(req, "saved layouts");
  if ("error" in gate) return gate.error;

  const chainId = new URL(req.url).searchParams.get("chainId");
  // No user_id filter: row-level security already limits this to the caller's
  // own rows, so asking for anything else would return nothing anyway.
  const query = [
    "layouts?select=id,name,chain_id,favorites,updated_at",
    chainId ? `chain_id=eq.${encodeURIComponent(chainId)}` : "",
    "order=updated_at.desc",
  ]
    .filter(Boolean)
    .join("&");

  const rows = await cbRest<LayoutRow[]>(query, { token: gate.user.token });
  return NextResponse.json({ layouts: rows.map(toLayout) });
}

export async function POST(req: Request) {
  const gate = await requireProUser(req, "saved layouts");
  if ("error" in gate) return gate.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = layoutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid layout payload" }, { status: 400 });
  }

  const existing = await cbRest<{ id: string }[]>("layouts?select=id", {
    token: gate.user.token,
  });
  if (existing.length >= MAX_LAYOUTS) {
    return NextResponse.json(
      { error: `Layout limit reached (${MAX_LAYOUTS}). Delete one first.` },
      { status: 400 },
    );
  }

  const [row] = await cbRest<LayoutRow[]>("layouts", {
    method: "POST",
    token: gate.user.token,
    representation: true,
    // user_id is left out on purpose: the column defaults to auth.uid(), so the
    // row is owned by whoever the token says it is and cannot be forged.
    body: {
      name: parsed.data.name,
      chain_id: parsed.data.chainId,
      favorites: parsed.data.favorites,
    },
  });

  return NextResponse.json({ layout: toLayout(row) }, { status: 201 });
}

export async function DELETE(req: Request) {
  const gate = await requireProUser(req, "saved layouts");
  if ("error" in gate) return gate.error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // RLS scopes the delete to the caller, so a wrong id deletes nothing rather
  // than someone else's layout. Representation tells us which it was.
  const deleted = await cbRest<LayoutRow[]>(
    `layouts?id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE", token: gate.user.token, representation: true },
  );
  if (deleted.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
