import { NextResponse } from "next/server";
import { z } from "zod";
import { cbRest } from "@/lib/cargobase";
import { requireProUser } from "@/lib/cargobase-session";
import { normalizeWallPack } from "@/lib/wall-packs";

export const dynamic = "force-dynamic";

const MAX_PACKS = 12;

type PackRow = { payload: unknown };

export async function GET(req: Request) {
  const gate = await requireProUser(req, "wall packs");
  if ("error" in gate) return gate.error;

  const rows = await cbRest<PackRow[]>(
    "wall_packs?select=payload&order=updated_at.desc",
    { token: gate.user.token },
  );
  const packs = rows
    .map((r) => normalizeWallPack(r.payload))
    .filter((p): p is NonNullable<typeof p> => p != null);

  return NextResponse.json({ packs });
}

export async function PUT(req: Request) {
  const gate = await requireProUser(req, "wall packs");
  if ("error" in gate) return gate.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = z.object({ packs: z.array(z.unknown()).max(MAX_PACKS) }).safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid packs payload" }, { status: 400 });
  }

  const packs = parsed.data.packs
    .map((p) => normalizeWallPack(p))
    .filter((p): p is NonNullable<typeof p> => p != null)
    .slice(0, MAX_PACKS);

  // Replace the caller's set. Not a transaction — see the note in the alerts
  // route — but both halves are scoped to the caller by row-level security.
  await cbRest("wall_packs?id=not.is.null", {
    method: "DELETE",
    token: gate.user.token,
  });

  if (packs.length > 0) {
    await cbRest("wall_packs", {
      method: "POST",
      token: gate.user.token,
      body: packs.map((pack) => ({ name: pack.name, payload: pack })),
    });
  }

  return NextResponse.json({ packs });
}
